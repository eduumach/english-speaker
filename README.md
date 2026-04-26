# English Tutor 🎙️

An AI-powered English tutor for Brazilian students that uses **voice conversations** to teach English through structured learning paths. Built with [LiveKit Agents](https://docs.livekit.io/agents/) and a React frontend.

[![Demo](https://img.youtube.com/vi/WNQchJinbq4/0.jpg)](https://youtu.be/WNQchJinbq4)

## How it works

1. The student speaks to a voice-based AI tutor (powered by DeepSeek + Deepgram)
2. The tutor runs interactive **scenes/activities** (e.g., ordering coffee, introducing yourself)
3. Every mistake is logged and reviewed in future sessions
4. A **learning path** adapts to the student's level (A1→C2) over time
5. The frontend shows real-time transcript, mistakes, and progress

## Stack

| Layer | Tech |
|-------|------|
| **Voice pipeline** | LiveKit Agents + Silero VAD + Deepgram (STT/TTS) |
| **AI model** | DeepSeek via OpenAI-compatible API |
| **Backend** | Python 3.13, FastAPI |
| **Frontend** | React 19, TypeScript, Vite, shadcn/ui, Tailwind 4 |
| **Database** | SQLite (local, via `backend/db.py`) |
| **Dev tools** | `just`, `ruff`, `uv` |

## Prerequisites

- Python ≥ 3.13
- [uv](https://docs.astral.sh/uv/) or pip
- [Bun](https://bun.sh) (for the frontend)
- [Just](https://just.systems/) (optional, for the justfile)
- API keys: [DeepSeek](https://platform.deepseek.com/), [Deepgram](https://console.deepgram.com/), [ElevenLabs](https://elevenlabs.io/) (optional)

## Quick start

```bash
# 1. Clone and enter the project
git clone https://github.com/eduumach/english-speaker && cd english-speaker

# 2. Copy env vars and fill in your API keys
cp .env.example .env

# 3. Install Python deps
uv sync

# 4. Install frontend deps
cd frontend && bun install && cd ..

# 5. Run everything (LiveKit server + agent + API)
python -m backend launcher

# 6. In another terminal, start the frontend
cd frontend && bun run dev
```

The frontend opens at `http://localhost:5173`. Click the connection button, paste your LiveKit token (or get one from `GET /api/token`), and start talking.

## Commands

```bash
python -m backend agent       # Start the LiveKit agent
python -m backend server      # Start the FastAPI HTTP server (port 8000)
python -m backend launcher    # Start LiveKit server + agent + API together
cd frontend && bun run dev    # Start the Vite dev server
just f                        # Shortcut: frontend dev server
just b                        # Shortcut: backend launcher
```

## Architecture

```
┌──────────┐     WebRTC      ┌──────────────┐     HTTP      ┌──────────────┐
│  React   │ ◄─────────────► │ LiveKit      │ ◄───────────► │ FastAPI      │
│  Frontend│     (audio)     │ Server +     │    /api/*     │ HTTP Server  │
│  :5173   │                 │ Agent (AI)   │               │  :8000       │
└──────────┘                 └──────────────┘               └──────────────┘
                                     │                              │
                                     │ function_tool calls          │ GET /api/progress
                                     ▼                              ▼
                              ┌──────────────────────────────────────────┐
                              │           SQLite (tutor.db)              │
                              │  profile, sessions, mistakes, paths      │
                              └──────────────────────────────────────────┘
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Returns the LiveKit WebSocket URL |
| GET | `/api/token` | Generates a LiveKit join token |
| GET | `/api/progress` | Returns profile, path progress, level history |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEKIT_URL` | `ws://localhost:7880` | LiveKit server address |
| `LIVEKIT_API_KEY` | `devkey` | LiveKit API key |
| `LIVEKIT_API_SECRET` | *(see .env.example)* | LiveKit API secret (≥32 chars) |
| `DEEPSEEK_API_KEY` | — | DeepSeek API key |
| `DEEPGRAM_API_KEY` | — | Deepgram API key (STT/TTS) |
| `ELEVEN_API_KEY` | — | ElevenLabs API key (optional) |
| `LIVEKIT_LOG_LEVEL` | `warn` | LiveKit log verbosity |

## Project structure

```
english-speaker/
├── backend/
│   ├── agent.py        # LiveKit Agent with function tools
│   ├── server.py       # FastAPI HTTP server
│   ├── launcher.py     # Orchestrates all processes
│   ├── config.py       # Environment config
│   ├── db.py           # SQLite database layer
│   ├── prompts.py      # System prompt builder
│   └── __main__.py     # CLI entry point
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main UI
│   │   ├── hooks/               # React hooks (useVoiceChat, useProgress)
│   │   ├── components/          # UI components
│   │   └── lib/                 # Utilities
│   └── ...
├── .env.example
├── pyproject.toml
└── justfile
```
