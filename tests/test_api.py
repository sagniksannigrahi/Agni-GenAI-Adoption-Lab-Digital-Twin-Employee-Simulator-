"""End-to-end API tests in demo mode (no API key or network needed)."""

import json
import os

os.environ["AGNI_DEMO"] = "1"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.app.main import app  # noqa: E402

client = TestClient(app)
CTX = {"organization": "Seagate Technology", "ai_solution": "Internal GenAI assistant",
       "departments": "", "notes": ""}


@pytest.fixture(scope="module")
def personas():
    r = client.post("/api/personas", json={"context": CTX, "count": 5})
    assert r.status_code == 200
    return r.json()["personas"]


def test_status():
    assert client.get("/api/status").json()["demo"] is True


def test_frontend_served():
    r = client.get("/")
    assert r.status_code == 200 and "Agni" in r.text


def test_personas(personas):
    assert len(personas) == 5
    assert len({p["id"] for p in personas}) == 5


def test_simulation_streams_reactions_then_report(personas):
    r = client.post("/api/simulate", json={"context": CTX, "personas": personas, "test_type": "Release notes",
                                           "variant_a": "New feature", "variant_b": "Try it with examples"})
    events = [json.loads(line) for line in r.text.strip().split("\n")]
    assert events[0]["type"] == "start" and events[0]["total"] == 10
    assert sum(e["type"] == "reaction" for e in events) == 10
    assert events[-1]["type"] == "report"
    assert 0 <= events[-1]["report"]["readiness_score"] <= 100


def test_training_and_translate():
    kit = client.post("/api/training/generate", json={"context": CTX, "topic": "Prompting", "audience": "Ops"}).json()
    assert kit["sections"] and kit["quiz"]
    assert client.post("/api/training/translate", json={"text": "RAG"}).json()["plain_version"]


def test_feedback():
    sample = client.get("/api/feedback/sample").json()["feedback"]
    a = client.post("/api/feedback/analyze", json={"feedback": sample}).json()
    assert a["total_items"] == a["positive"] + a["neutral"] + a["negative"]
    assert client.post("/api/feedback/analyze", json={"feedback": "  "}).status_code == 400


def test_prompt_coach():
    r = client.post("/api/prompt/coach", json={"prompt": "write email"}).json()
    assert len(r["criteria"]) == 6 and r["improved_prompt"]
    assert client.post("/api/prompt/run", json={"prompt": "hi"}).text


def test_support_chat_and_grade(personas):
    p = personas[0]
    opening = client.post("/api/chat", json={"context": CTX, "persona": p, "mode": "support", "history": []}).text
    assert opening
    history = [{"role": "assistant", "content": opening}, {"role": "user", "content": "Sorry about that, let's fix it."}]
    assert client.post("/api/chat", json={"context": CTX, "persona": p, "mode": "support", "history": history}).text
    g = client.post("/api/chat/grade", json={"context": CTX, "persona": p, "history": history}).json()
    assert 0 <= g["overall_score"] <= 100
