import asyncio
import subprocess
import sys

async def run_all():
    processes = [
        subprocess.Popen(["livekit-server", "--dev"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT),
        subprocess.Popen([sys.executable, "main.py", "dev"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT),
        subprocess.Popen([sys.executable, "server.py"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT),
    ]

    async def log_output(proc, name):
        for line in proc.stdout:
            print(f"[{name}] {line.decode().rstrip()}")

    await asyncio.gather(*[log_output(p, n) for p, n in zip(processes, ["livekit", "agent", "api"])])

if __name__ == "__main__":
    asyncio.run(run_all())