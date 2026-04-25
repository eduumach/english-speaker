import datetime
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from livekit import api

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "devsecret_must_be_at_least_32_chars_long_xx")

app = FastAPI(title="English Tutor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/config")
async def get_config():
    return {
        "livekit_url": LIVEKIT_URL,
    }


@app.get("/api/token")
async def get_token(
    room: str = Query(default="tutor-room"),
    identity: str = Query(default="student"),
):
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room,
        )
    )
    token.identity = identity
    token.name = identity
    token.ttl = datetime.timedelta(hours=24)

    return {
        "token": token.to_jwt(),
        "url": LIVEKIT_URL,
    }


# Serve frontend static files in production
FRONTEND_DIST = Path(__file__).parent / "vite-app" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
