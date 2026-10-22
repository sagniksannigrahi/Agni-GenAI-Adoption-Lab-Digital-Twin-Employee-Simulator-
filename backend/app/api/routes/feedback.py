from fastapi import APIRouter, HTTPException

from ...core.config import SAMPLES_DIR
from ...schemas.feedback import FeedbackRequest
from ..deps import call, engine

router = APIRouter(prefix="/api/feedback", tags=["Feedback Analyzer"])


@router.post("/analyze")
async def analyze(req: FeedbackRequest):
    if not req.feedback.strip():
        raise HTTPException(status_code=400, detail="Paste some feedback first.")
    result = await call(engine().analyze, req)
    return result.model_dump()


@router.get("/sample")
async def sample():
    return {"feedback": (SAMPLES_DIR / "user_feedback.txt").read_text(encoding="utf-8")}
