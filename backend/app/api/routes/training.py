from fastapi import APIRouter

from ...schemas.training import TrainingRequest, TranslateRequest
from ..deps import call, engine

router = APIRouter(prefix="/api/training", tags=["Training Studio"])


@router.post("/generate")
async def generate(req: TrainingRequest):
    kit = await call(engine().generate_kit, req)
    return kit.model_dump()


@router.post("/translate")
async def translate(req: TranslateRequest):
    result = await call(engine().translate, req)
    return result.model_dump()
