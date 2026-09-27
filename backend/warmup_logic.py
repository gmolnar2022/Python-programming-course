import json, os, hashlib, datetime
from pathlib import Path

# Prototype logic for an Azure Function HTTP endpoint.
# IMPORTANT: roster.json and week03_tasks.json are private backend data.
ROOT = Path(__file__).resolve().parent.parent
ROSTER = json.loads((ROOT/"private-data"/"roster.json").read_text(encoding="utf-8"))
TASKS  = json.loads((ROOT/"private-data"/"week03_tasks.json").read_text(encoding="utf-8"))

def choose_task(neptun, group):
    pool = TASKS[group]
    digest = hashlib.sha256(f"{neptun}|03|{group}".encode()).digest()
    return pool[int.from_bytes(digest[:4],"big") % len(pool)]

def start_payload(neptun):
    n = neptun.strip().upper()
    group = ROSTER.get(n)
    if not group:
        return {"ok": False, "error": "Neptun code not found in the course roster."}
    task = choose_task(n, group)
    now = datetime.datetime.now(datetime.timezone.utc)
    deadline = now + datetime.timedelta(minutes=10)
    return {
        "ok": True, "week": "03", "practice": True,
        "group": group, "task": task,
        "startedAt": now.isoformat(), "deadline": deadline.isoformat()
    }

# Wire start_payload() into your Azure Functions HTTP trigger.
# The production version should persist the assignment and deadline server-side
# and return the existing assignment on refresh/restart.
