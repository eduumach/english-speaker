import json
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "tutor.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                level TEXT NOT NULL DEFAULT 'A1',
                total_sessions INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mistakes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original TEXT NOT NULL,
                correction TEXT NOT NULL,
                category TEXT,
                explanation TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL,
                scenes_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT,
                summary TEXT,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ended_at TEXT
            );

            CREATE TABLE IF NOT EXISTS transcripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                role TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );

            INSERT OR IGNORE INTO profile (id, level) VALUES (1, 'A1');
        """)


def get_profile() -> dict:
    with _conn() as c:
        row = c.execute("SELECT level, total_sessions FROM profile WHERE id = 1").fetchone()
        return dict(row) if row else {"level": "A1", "total_sessions": 0}


def update_level(new_level: str) -> None:
    with _conn() as c:
        c.execute("UPDATE profile SET level = ? WHERE id = 1", (new_level,))


def recent_mistakes(limit: int = 10) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT original, correction, category, explanation "
            "FROM mistakes ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def log_mistake(original: str, correction: str, category: str, explanation: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO mistakes (original, correction, category, explanation) "
            "VALUES (?, ?, ?, ?)",
            (original, correction, category, explanation),
        )


def save_activity(topic: str, scenes: list[dict]) -> int:
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO activities (topic, scenes_json) VALUES (?, ?)",
            (topic, json.dumps(scenes, ensure_ascii=False)),
        )
        return cur.lastrowid or 0


def recent_topics(limit: int = 5) -> list[str]:
    with _conn() as c:
        rows = c.execute(
            "SELECT DISTINCT topic FROM activities ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [r["topic"] for r in rows]


def start_session(topic: str) -> int:
    with _conn() as c:
        cur = c.execute("INSERT INTO sessions (topic) VALUES (?)", (topic,))
        c.execute("UPDATE profile SET total_sessions = total_sessions + 1 WHERE id = 1")
        return cur.lastrowid or 0


def end_session(session_id: int, summary: str) -> None:
    with _conn() as c:
        c.execute(
            "UPDATE sessions SET summary = ?, ended_at = ? WHERE id = ?",
            (summary, datetime.utcnow().isoformat(), session_id),
        )


def save_transcript(session_id: int | None, role: str, text: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO transcripts (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, role, text),
        )
