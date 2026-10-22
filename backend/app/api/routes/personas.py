from fastapi import APIRouter

from ...schemas.persona import GeneratePersonasRequest
from ..deps import call, engine

router = APIRouter(prefix="/api/personas", tags=["Persona Lab"])


@router.post("")
async def generate(req: GeneratePersonasRequest):
    count = max(2, min(20, req.count))
    personas = await call(engine().generate_personas, req.context, count)
    return {"personas": [p.model_dump() for p in personas]}
