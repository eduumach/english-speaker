import asyncio
import sys


async def run_all():
    env = {**__import__("os").environ, "PYTHONUNBUFFERED": "1"}

    processes = [
        await asyncio.create_subprocess_exec(
            "livekit-server", "--dev",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        ),
        await asyncio.create_subprocess_exec(
            sys.executable, "-m", "backend", "agent", "dev",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        ),
        await asyncio.create_subprocess_exec(
            sys.executable, "-m", "backend", "server",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        ),
    ]

    async def _log_output(proc, name):
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            print(f"[{name}] {line.decode().rstrip()}")

    await asyncio.gather(*[_log_output(p, n) for p, n in zip(processes, ["livekit", "agent", "api"])])


if __name__ == "__main__":
    asyncio.run(run_all())
