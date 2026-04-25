import asyncio
import json
from collections.abc import AsyncIterable

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    cli,
    function_tool,
)
from livekit.agents.cli.cli import AgentsConsole
from livekit.agents.voice.agent import ModelSettings
from livekit.plugins import deepgram, openai, silero
from rich.panel import Panel
from rich.text import Text

from backend import db
from backend.prompts import build_instructions, build_resume_prompt


def _ui_print(renderable) -> None:
    AgentsConsole.get_instance().console.print(renderable)


def _print_tutor(text: str) -> None:
    _ui_print(
        Panel(
            Text(text.strip(), style="white"),
            title="[bold cyan]Tutor[/]",
            title_align="left",
            border_style="cyan",
            padding=(0, 1),
        )
    )


def _print_user(text: str) -> None:
    _ui_print(
        Panel(
            Text(text.strip(), style="white"),
            title="[bold green]You[/]",
            title_align="left",
            border_style="green",
            padding=(0, 1),
        )
    )


class TutorAgent(Agent):
    async def tts_node(self, text: AsyncIterable[str], model_settings: ModelSettings):
        chunks: list[str] = []
        async for chunk in text:
            chunks.append(chunk)
        full = "".join(chunks).strip()
        if full:
            _print_tutor(full)
            asyncio.create_task(_send_data({"type": "tutor", "text": full}))

        async def _replay():
            for c in chunks:
                yield c

        async for frame in Agent.default.tts_node(self, _replay(), model_settings):
            yield frame


_current_session_id: int | None = None
_agent_room = None


# --- Existing function tools ---


@function_tool
async def create_activity(
    context: RunContext,
    topic: str,
    scenes: list[str],
):
    global _current_session_id
    scenes_data = [{"idx": i, "description": s} for i, s in enumerate(scenes)]
    db.save_activity(topic, scenes_data)
    _current_session_id = db.start_session(topic)
    profile = db.get_profile()
    asyncio.create_task(
        _send_data(
            {
                "type": "activity",
                "info": {
                    "topic": topic,
                    "level": profile["level"],
                    "totalSessions": profile["total_sessions"],
                    "numScenes": len(scenes),
                },
                "scenes": [{"idx": s["idx"], "description": s["description"], "completed": False} for s in scenes_data],
            }
        )
    )
    return {"ok": True, "session_id": _current_session_id, "num_scenes": len(scenes)}


@function_tool
async def log_mistake(
    context: RunContext,
    original: str,
    correction: str,
    category: str,
    explanation: str,
):
    db.log_mistake(original, correction, category, explanation)
    asyncio.create_task(
        _send_data(
            {
                "type": "mistake",
                "mistake": {
                    "original": original,
                    "correction": correction,
                    "category": category,
                    "explanation": explanation,
                },
            }
        )
    )
    return {"ok": True}


@function_tool
async def end_tutoring_session(
    context: RunContext,
    summary: str,
):
    global _current_session_id
    if _current_session_id is not None:
        db.end_session(_current_session_id, summary)
        _current_session_id = None
    return {"ok": True}


# --- New function tools: onboarding, path, progress, level ---


@function_tool
async def save_student_profile(
    context: RunContext,
    name: str,
    goals: str,
    interests: str,
    time_commitment: str,
):
    """
    Store the student's profile after onboarding.
    Call this ONLY ONCE after asking the student about themselves.

    Args:
        name: the student's first name.
        goals: what they want to achieve (e.g. "travel", "job interview", "exams").
        interests: topics they enjoy (e.g. "music", "sports", "movies").
        time_commitment: how much time per session ("15 min", "30 min", "1 hour").
    """
    db.save_student_profile(name, goals, interests, time_commitment)
    _print_user(f"[Onboarding complete] {name}, goals={goals}, interests={interests}")
    return {"ok": True}


@function_tool
async def create_learning_path(
    context: RunContext,
    title: str,
    description: str,
    modules_json: str,
):
    """
    Create a structured learning path for the student.
    Call this after onboarding to define the curriculum.

    Args:
        title: short title for the path (e.g. "A1 → A2 Journey").
        description: one-sentence overview.
        modules_json: JSON array of modules. Each module has:
            - title: module name
            - description: what this module covers
            - lessons: array of {title, description}
    """
    modules = json.loads(modules_json)
    path_id = db.save_learning_path(title, description, modules)
    asyncio.create_task(
        _send_data(
            {
                "type": "path_created",
                "path": {
                    "id": path_id,
                    "title": title,
                    "description": description,
                    "modules": modules,
                },
            }
        )
    )
    return {"ok": True, "path_id": path_id, "num_modules": len(modules)}


@function_tool
async def complete_lesson(
    context: RunContext,
    module_idx: int,
    lesson_idx: int,
    score: int,
    notes: str,
):
    """
    Mark the current lesson as completed.
    Call this after finishing a lesson's scenes.

    Args:
        module_idx: 0-based index of the module in the learning path.
        lesson_idx: 0-based index of the lesson within the module.
        score: 1-10 rating of how well the student did.
        notes: brief observation about what improved or needs work (in English).
    """
    path = db.get_active_path()
    if path is None:
        return {"ok": False, "error": "No active learning path"}
    db.complete_lesson(path["id"], module_idx, lesson_idx, score, notes)
    next_module = module_idx
    next_lesson = lesson_idx + 1
    modules = json.loads(path["modules_json"])
    if next_lesson >= len(modules[module_idx]["lessons"]):
        next_module = module_idx + 1
        next_lesson = 0
    if next_module < len(modules):
        db.advance_path_lesson(path["id"], next_module, next_lesson)
    asyncio.create_task(
        _send_data(
            {
                "type": "lesson_completed",
                "progress": {
                    "module_idx": module_idx,
                    "lesson_idx": lesson_idx,
                    "score": score,
                    "next_module_idx": next_module,
                    "next_lesson_idx": next_lesson,
                },
            }
        )
    )
    return {"ok": True, "progress": f"Module {module_idx + 1}, Lesson {lesson_idx + 1} done"}


@function_tool
async def assess_level(
    context: RunContext,
    new_level: str,
    reason: str,
):
    """
    Assess the student's level. Call this when you notice consistent improvement.

    Args:
        new_level: one of "A1", "A2", "B1", "B2", "C1", "C2".
        reason: 1-2 sentence explanation of why the level changed.
    """
    db.update_level(new_level)
    db.save_level_assessment(new_level, reason)
    asyncio.create_task(
        _send_data(
            {
                "type": "level_up",
                "level": new_level,
                "reason": reason,
            }
        )
    )
    return {"ok": True, "new_level": new_level}


async def _send_data(payload: dict) -> None:
    if _agent_room:
        try:
            await _agent_room.local_participant.publish_data(
                json.dumps(payload),
                topic="transcript",
            )
        except Exception:
            pass


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    global _agent_room
    _agent_room = ctx.room

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM.with_deepseek(model="deepseek-chat"),
        tts=deepgram.TTS(model="aura-2-andromeda-en"),
        allow_interruptions=False,
        discard_audio_if_uninterruptible=True,
        min_endpointing_delay=0.8,
        max_endpointing_delay=4.0,
        tts_text_transforms=["filter_markdown", "filter_emoji"],
    )

    @session.on("user_input_transcribed")
    def _on_user_transcribed(ev):
        if not ev.is_final or not ev.transcript.strip():
            return
        db.save_transcript(_current_session_id, "user", ev.transcript)
        _print_user(ev.transcript)
        asyncio.create_task(_send_data({"type": "user", "text": ev.transcript}))

    @session.on("conversation_item_added")
    def _persist_assistant(ev):
        item = ev.item
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if role == "assistant" and text:
            db.save_transcript(_current_session_id, role, text)

    path = db.get_active_path()
    if path and db.get_lesson_progress(path["id"]):
        greeting = build_resume_prompt(path)
    else:
        greeting = "Greet the student briefly. Just say hi and ask how they are. ONE short sentence. Then ask what topic they want — offer 2-3 options in one more short sentence. English only. A1 level. Chill tone."

    agent = TutorAgent(
        instructions=build_instructions(),
        tools=[
            create_activity,
            log_mistake,
            end_tutoring_session,
            save_student_profile,
            create_learning_path,
            complete_lesson,
            assess_level,
        ],
    )

    await session.start(agent=agent, room=ctx.room)
    await session.generate_reply(instructions=greeting)


if __name__ == "__main__":
    db.init_db()
    cli.run_app(server)
