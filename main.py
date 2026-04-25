from typing import AsyncIterable
import asyncio
import json

from dotenv import load_dotenv
from rich.panel import Panel
from rich.text import Text

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

import db


def _ui_print(renderable) -> None:
    AgentsConsole.get_instance().console.print(renderable)


def _print_tutor(text: str) -> None:
    _ui_print(Panel(Text(text.strip(), style="white"),
                    title="[bold cyan]Tutor[/]",
                    title_align="left", border_style="cyan", padding=(0, 1)))


def _print_user(text: str) -> None:
    _ui_print(Panel(Text(text.strip(), style="white"),
                    title="[bold green]You[/]",
                    title_align="left", border_style="green", padding=(0, 1)))


class TutorAgent(Agent):
    async def tts_node(self, text: AsyncIterable[str], model_settings: ModelSettings):
        chunks: list[str] = []
        async for chunk in text:
            chunks.append(chunk)
        full = "".join(chunks).strip()
        if full:
            _print_tutor(full)
            asyncio.ensure_future(
                _send_data({"type": "tutor", "text": full})
            )

        async def _replay():
            for c in chunks:
                yield c

        async for frame in Agent.default.tts_node(self, _replay(), model_settings):
            yield frame

load_dotenv()
db.init_db()


_current_session_id: int | None = None


@function_tool
async def create_activity(
    context: RunContext,
    topic: str,
    scenes: list[str],
):
    """
    Save a new activity plan and mark the start of a tutoring session.
    Call this ONCE at the beginning of each session, after agreeing with the student on a topic.

    Args:
        topic: short topic name, e.g. "introducing yourself", "ordering coffee".
        scenes: list of 3-5 short descriptions, one per scene/turn the student will practice.
    """
    global _current_session_id
    scenes_data = [{"idx": i, "description": s} for i, s in enumerate(scenes)]
    db.save_activity(topic, scenes_data)
    _current_session_id = db.start_session(topic)
    profile = db.get_profile()
    asyncio.ensure_future(
        _send_data({
            "type": "activity",
            "info": {
                "topic": topic,
                "level": profile["level"],
                "totalSessions": profile["total_sessions"],
                "numScenes": len(scenes),
            },
            "scenes": [{"idx": s["idx"], "description": s["description"], "completed": False} for s in scenes_data],
        })
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
    """
    Log a mistake the student just made, so it can be reviewed in future sessions.
    Call this EVERY TIME you correct the student.

    Args:
        original: exactly what the student said (their wrong version).
        correction: the correct/natural English version.
        category: one of "grammar", "vocabulary", "pronunciation", "word_order".
        explanation: 1-2 sentences in Brazilian Portuguese explaining the fix.
    """
    db.log_mistake(original, correction, category, explanation)
    asyncio.ensure_future(
        _send_data({
            "type": "mistake",
            "mistake": {
                "original": original,
                "correction": correction,
                "category": category,
                "explanation": explanation,
            },
        })
    )
    return {"ok": True}


@function_tool
async def end_tutoring_session(
    context: RunContext,
    summary: str,
):
    """
    Close the current tutoring session with a short recap.
    Call this when the student says goodbye or after the last scene.

    Args:
        summary: 2-3 sentences in Brazilian Portuguese recapping what was practiced and main mistakes.
    """
    global _current_session_id
    if _current_session_id is not None:
        db.end_session(_current_session_id, summary)
        _current_session_id = None
    return {"ok": True}


def _build_instructions() -> str:
    profile = db.get_profile()
    mistakes = db.recent_mistakes(limit=8)
    topics = db.recent_topics(limit=5)

    mistakes_block = "\n".join(
        f'- "{m["original"]}" → "{m["correction"]}" ({m["category"]}): {m["explanation"]}'
        for m in mistakes
    ) or "(nenhum erro registrado ainda — primeira sessão ou reset)"

    topics_block = ", ".join(topics) if topics else "(nenhum ainda)"

    return f"""
You are a friendly English tutor. Your student is Brazilian, level {profile["level"]}. Keep it simple, short, and fun. Make light jokes when they make a mistake but always teach the correct form. Never offensive.

YOU MUST SPEAK ONLY IN ENGLISH. Never use Portuguese or any other language.

STUDENT CONTEXT:
- Level: {profile["level"]}
- Sessions completed: {profile["total_sessions"]}
- Recent topics: {topics_block}

RECENT MISTAKES (reinforce what they struggled with):
{mistakes_block}

CRITICAL RULES — EVERY RESPONSE:
1. ALWAYS one short paragraph (2-4 sentences max). Never long messages.
2. Conversational tone — like texting a friend, not giving a lecture.
3. Short sentences: 5-8 words each.
4. Basic vocabulary only: present simple, to be, can, like, want, have, do.
5. ONE idea per message. If you need to greet AND ask a question, do it in two separate messages.
6. If they don't understand, rephrase with simpler words. Never translate.
7. Warm but NOT hyper-energetic. Be chill and encouraging.

SPEECH FORMATTING (for TTS):
- Write like you SPEAK, not like you TYPE.
- NO numbers ("1.", "2."). Say "first... second..." if needed.
- NO bullet points, NO markdown, NO dashes.
- NO ellipses "...". End the sentence instead.
- NO ALL CAPS.
- NO quotes around example phrases; say them naturally.

SESSION FLOW:
1. Greet briefly. Just one line: "Hi! How are you today?"
2. Ask what topic they want. Offer 2-3 simple options in one short sentence.
3. Call `create_activity` with the topic and 3-5 short scenes.
4. For each scene:
   a. Explain the scene in one sentence.
   b. Say a model sentence. Repeat once.
   c. Ask them to try.
   d. WAIT completely. Do not interrupt.
   e. If wrong: light joke + correct version + call `log_mistake`. If right: short praise ("Nice!", "Perfect!").
   f. Move on.
5. After last scene: quick recap + call `end_tutoring_session` + brief goodbye.

HOW TO LOG MISTAKES:
- `original` = what they said
- `correction` = correct version
- `category` = "grammar", "vocabulary", "pronunciation", or "word_order"
- `explanation` = 1 short sentence in English

If the student asks to stop, call `end_tutoring_session` and say goodbye.
""".strip()


server = AgentServer()

_agent_room = None


async def _send_data(payload: dict) -> None:
    if _agent_room:
        try:
            await _agent_room.local_participant.publish_data(
                json.dumps(payload),
                topic="transcript",
            )
        except Exception:
            pass


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
        asyncio.ensure_future(
            _send_data({"type": "user", "text": ev.transcript})
        )

    @session.on("conversation_item_added")
    def _persist_assistant(ev):
        item = ev.item
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if role == "assistant" and text:
            db.save_transcript(_current_session_id, role, text)

    agent = TutorAgent(
        instructions=_build_instructions(),
        tools=[create_activity, log_mistake, end_tutoring_session],
    )

    await session.start(agent=agent, room=ctx.room)
    await session.generate_reply(
        instructions="Greet the student briefly. Just say hi and ask how they are. ONE short sentence. Then ask what topic they want — offer 2-3 options in one more short sentence. English only. A1 level. Chill tone."
    )


if __name__ == "__main__":
    cli.run_app(server)
