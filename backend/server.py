import datetime
import json

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from livekit import api

from backend import db
from backend.config import FRONTEND_DIST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL

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
    return {"livekit_url": LIVEKIT_URL}


@app.get("/api/token")
async def get_token(
    room: str = Query(default="tutor-room"),
    identity: str = Query(default="student"),
):
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_grants(api.VideoGrants(room_join=True, room=room))
    token.identity = identity
    token.name = identity
    token.ttl = datetime.timedelta(hours=24)

    return {"token": token.to_jwt(), "url": LIVEKIT_URL}


@app.get("/api/progress")
async def get_progress():
    profile = db.get_profile()
    student = db.get_student_profile()
    path = db.get_active_path()
    level_history = db.get_level_history()
    lesson_progress = []
    modules = []

    if path:
        lesson_progress = db.get_lesson_progress(path["id"])
        modules = json.loads(path["modules_json"])
        completed_set = {(p["module_idx"], p["lesson_idx"]) for p in lesson_progress}
        total = sum(len(m["lessons"]) for m in modules)
        done = len(completed_set)

        for mi, m in enumerate(modules):
            for li, lesson in enumerate(m["lessons"]):
                lesson["completed"] = (mi, li) in completed_set
                lesson["module_idx"] = mi
                lesson["lesson_idx"] = li

        return {
            "profile": profile,
            "student": student,
            "path": {
                "id": path["id"],
                "title": path["title"],
                "description": path["description"],
                "modules": modules,
                "current_module_idx": path["current_module_idx"],
                "current_lesson_idx": path["current_lesson_idx"],
                "total_lessons": total,
                "completed_lessons": done,
                "progress_pct": round(done / total * 100) if total > 0 else 0,
            }
            if path
            else None,
            "level_history": level_history,
        }

    return {
        "profile": profile,
        "student": student,
        "path": None,
        "level_history": level_history,
    }


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
