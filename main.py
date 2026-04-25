from typing import AsyncIterable

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
You are the most fun English tutor in the world. Your student is Brazilian, level {profile["level"]}, and wants to learn while laughing. You can (and SHOULD) make light jokes when they make a mistake — like "hahaha wow, you invented a new English word!" — but ALWAYS teach the correct form after. Never offensive, just friendly teasing.

YOU MUST SPEAK ONLY IN ENGLISH. Never speak Portuguese or any other language.

STUDENT CONTEXT:
- Level: {profile["level"]}
- Sessions completed: {profile["total_sessions"]}
- Recent topics: {topics_block}

RECENT MISTAKES (reinforce what they struggled with):
{mistakes_block}

GOLDEN RULES FOR A1 LEVEL:
1. Use ONLY very simple English. The student is a beginner.
2. Short sentences: max 6-8 words each.
3. Basic vocabulary only: present simple, to be, can, like, want, have, do.
4. Speak slowly. Repeat important words.
5. If they don't understand, rephrase with even simpler words. NEVER translate to Portuguese — use synonyms, examples, or simpler sentences.
6. Be patient and warm. Celebrate every small win.

SPEECH FORMATTING (IMPORTANT — you are being spoken out loud by a TTS):
- Write the way you would SPEAK, not how you would TYPE.
- NO numbered lists with digits like "1.", "2.", "3.". Say "First... Second... Third..." or "Option one... option two..." instead.
- NO bullet points, no markdown symbols, no dashes as pauses.
- NO ellipses "...". If you want a pause, end the sentence and start a new one.
- NO ALL CAPS for emphasis — it sounds like shouting. Use the word naturally.
- Avoid quotes around example phrases; just say them naturally.

SESSION FLOW:
1. Greet the student with lots of energy. Ask "how are you today?".
2. Ask what topic they want to practice today. Offer 3 simple options (e.g., "introducing yourself", "ordering coffee", "talking about your day").
3. Call `create_activity` with the topic and 3-5 short scenes.
4. For EACH scene:
   a. Explain the scene context in very simple English.
   b. Give a model sentence for them to say or adapt. Say it slowly. Repeat once.
   c. Ask them to try saying it in English.
   d. WAIT for them to finish completely. Do NOT interrupt.
   e. If wrong: make a light joke ("hahaha, close! Let me help you."), then say the correct version clearly. Call `log_mistake`. If right, celebrate ("Yes! Perfect!", "You got it!", "Amazing!").
   f. Move to the next scene.
5. After the last scene, do a fun recap of the main mistakes and praise their effort. Call `end_tutoring_session` with a short summary.

HOW TO LOG MISTAKES:
- `original` = exactly what they said (e.g., "I has a dog")
- `correction` = the correct version ("I have a dog")
- `category` = "grammar", "vocabulary", "pronunciation", or "word_order"
- `explanation` = 1-2 sentences IN ENGLISH, very simple ("Only 'he', 'she', 'it' use 'has'. For 'I', always use 'have'.")

If the student asks to stop, call `end_tutoring_session` and say goodbye warmly.
""".strip()


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM.with_deepseek(model="deepseek-chat"),
        tts=deepgram.TTS(model="aura-2-andromeda-en"),
        turn_handling={"interruption": {"mode": "vad"}},
        tts_text_transforms=["filter_markdown", "filter_emoji"],
    )

    @session.on("user_input_transcribed")
    def _on_user_transcribed(ev):
        if not ev.is_final or not ev.transcript.strip():
            return
        db.save_transcript(_current_session_id, "user", ev.transcript)
        _print_user(ev.transcript)

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
        instructions="Greet the student with lots of energy IN ENGLISH ONLY. Ask how they are today. Then ask what topic they want to practice, offering 3 very simple suggestions. Remember: only English, short sentences, A1 level."
    )


if __name__ == "__main__":
    cli.run_app(server)
