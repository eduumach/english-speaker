import json
import sqlite3
from datetime import UTC, datetime

from backend.config import DB_PATH


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

            CREATE TABLE IF NOT EXISTS student_profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT,
                goals TEXT,
                interests TEXT,
                time_commitment TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS learning_paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                modules_json TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                current_module_idx INTEGER DEFAULT 0,
                current_lesson_idx INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS lesson_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path_id INTEGER NOT NULL,
                module_idx INTEGER NOT NULL,
                lesson_idx INTEGER NOT NULL,
                score REAL,
                notes TEXT,
                completed_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS level_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL,
                reason TEXT,
                assessed_at TEXT DEFAULT CURRENT_TIMESTAMP
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
            "SELECT original, correction, category, explanation FROM mistakes ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def log_mistake(original: str, correction: str, category: str, explanation: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO mistakes (original, correction, category, explanation) VALUES (?, ?, ?, ?)",
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
            (summary, datetime.now(UTC).isoformat(), session_id),
        )


def save_transcript(session_id: int | None, role: str, text: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO transcripts (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, role, text),
        )


# --- Onboarding ---


def save_student_profile(name: str, goals: str, interests: str, time_commitment: str) -> None:
    with _conn() as c:
        c.execute(
            """INSERT INTO student_profile (id, name, goals, interests, time_commitment)
               VALUES (1, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name=excluded.name, goals=excluded.goals,
               interests=excluded.interests, time_commitment=excluded.time_commitment""",
            (name, goals, interests, time_commitment),
        )


def get_student_profile() -> dict | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM student_profile WHERE id = 1").fetchone()
        return dict(row) if row else None


# --- Learning paths ---


def save_learning_path(title: str, description: str, modules: list[dict]) -> int:
    with _conn() as c:
        c.execute("UPDATE learning_paths SET active = 0 WHERE active = 1")
        cur = c.execute(
            "INSERT INTO learning_paths (title, description, modules_json) VALUES (?, ?, ?)",
            (title, description, json.dumps(modules, ensure_ascii=False)),
        )
        return cur.lastrowid or 0


def get_active_path() -> dict | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM learning_paths WHERE active = 1 ORDER BY id DESC LIMIT 1").fetchone()
        return dict(row) if row else None


def advance_path_lesson(path_id: int, module_idx: int, lesson_idx: int) -> None:
    with _conn() as c:
        c.execute(
            "UPDATE learning_paths SET current_module_idx = ?, current_lesson_idx = ? WHERE id = ?",
            (module_idx, lesson_idx, path_id),
        )


# --- Lesson progress ---


def complete_lesson(path_id: int, module_idx: int, lesson_idx: int, score: float, notes: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO lesson_progress (path_id, module_idx, lesson_idx, score, notes) VALUES (?, ?, ?, ?, ?)",
            (path_id, module_idx, lesson_idx, score, notes),
        )


def get_lesson_progress(path_id: int) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM lesson_progress WHERE path_id = ? ORDER BY completed_at",
            (path_id,),
        ).fetchall()
        return [dict(r) for r in rows]


# --- Level assessments ---


def save_level_assessment(level: str, reason: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO level_assessments (level, reason) VALUES (?, ?)",
            (level, reason),
        )


def get_level_history() -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM level_assessments ORDER BY assessed_at DESC").fetchall()
        return [dict(r) for r in rows]
