import sys

from backend import db


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m backend <agent|server|launcher>")
        sys.exit(1)

    command = sys.argv[1]
    db.init_db()

    if command == "agent":
        from livekit.agents import cli

        from backend.agent import server

        sys.argv = [sys.argv[0], *([sys.argv[2]] if len(sys.argv) > 2 else ["dev"])]
        cli.run_app(server)

    elif command == "server":
        import uvicorn

        from backend.server import app

        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

    elif command == "launcher":
        import asyncio

        from backend.launcher import run_all

        asyncio.run(run_all())

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
