from typing import List

from ..core.llm import parse
from ..prompts import templates
from ..schemas.persona import OrgContext, Persona, PersonaSet


async def generate_personas(ctx: OrgContext, count: int) -> List[Persona]:
    user = f"""Organization: {ctx.organization}
AI solution being rolled out: {ctx.ai_solution or "An internal GenAI assistant"}
Departments to include: {ctx.departments or "Choose a realistic mix."}

Extra notes or real user data (may be empty):
<notes>
{ctx.notes.strip() or "None."}
</notes>

Create exactly {count} distinct employee personas."""
    result = await parse(system=templates.PERSONAS, user=user, output=PersonaSet, effort="medium")
    personas = result.personas[:count]
    for i, p in enumerate(personas, 1):
        p.id = f"p{i}"
    return personas
