from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ...schemas.chat import ChatRequest, GradeRequest
from ..deps import call, engine, safe_stream

router = APIRouter(prefix="/api/chat", tags=["Support Simulator"])


@router.post("")
async def chat(req: ChatRequest):
    if req.history and req.history[-1].role != "user":
        raise HTTPException(status_code=400, detail="History must end with your message.")
    if not req.history and req.mode != "support":
        raise HTTPException(status_code=400, detail="Ask a question first.")
    return StreamingResponse(safe_stream(engine().chat_stream(req)),
                             media_type="text/plain; charset=utf-8")


@router.post("/grade")
async def grade(req: GradeRequest):
    if not any(m.role == "user" for m in req.history):
        raise HTTPException(status_code=400, detail="Reply to the employee at least once before grading.")
    result = await call(engine().grade, req)
    return result.model_dump()
