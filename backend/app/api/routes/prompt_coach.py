from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ...schemas.prompt_coach import CoachRequest, RunPromptRequest
from ..deps import call, engine, safe_stream

router = APIRouter(prefix="/api/prompt", tags=["Prompt Coach"])


@router.post("/coach")
async def coach(req: CoachRequest):
    review = await call(engine().coach, req)
    return review.model_dump()


@router.post("/run")
async def run(req: RunPromptRequest):
    return StreamingResponse(safe_stream(engine().run_prompt(req.prompt)),
                             media_type="text/plain; charset=utf-8")
