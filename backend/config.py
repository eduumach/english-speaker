from os import getenv
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

LIVEKIT_URL = getenv("LIVEKIT_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = getenv("LIVEKIT_API_SECRET", "devsecret_must_be_at_least_32_chars_long_xx")

DB_PATH = BASE_DIR / "tutor.db"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
