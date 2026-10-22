from ..core.llm import parse
from ..prompts import templates
from ..schemas.training import (
    TrainingKit,
    TrainingRequest,
    Translation,
    TranslateRequest,
)


async def generate_kit(req: TrainingRequest) -> TrainingKit:
    user = f"""Organization: {req.context.organization}
AI solution: {req.context.ai_solution or "An internal GenAI assistant"}

Training topic: {req.topic}
Audience: {req.audience}
Audience AI literacy: {req.ai_literacy}
Format: {req.format}
Length: {req.minutes} minutes"""
    return await parse(system=templates.TRAINING, user=user, output=TrainingKit, effort="medium")


async def translate(req: TranslateRequest) -> Translation:
    user = f"Audience: {req.audience}\n\nText to translate:\n<text>\n{req.text}\n</text>"
    return await parse(system=templates.TRANSLATE, user=user, output=Translation, effort="low")
