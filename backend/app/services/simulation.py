import json
from typing import Dict, List, Optional

from ..core.llm import parse
from ..prompts import templates
from ..schemas.persona import OrgContext, Persona
from ..schemas.simulation import Reaction, SimulationReport


def _clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


async def react(ctx: OrgContext, test_type: str, stimulus: str, persona: Persona) -> Reaction:
    r = await parse(
        system=templates.reaction(ctx.organization, ctx.ai_solution, test_type, stimulus),
        user=f"You are this employee:\n{json.dumps(persona.model_dump(), indent=1)}\n\nGive your honest reaction.",
        output=Reaction,
        effort="low",
        max_tokens=8000,
    )
    r.sentiment = _clamp(r.sentiment, -100, 100)
    for f in ("clarity", "confidence_to_use", "adoption_likelihood"):
        setattr(r, f, _clamp(getattr(r, f), 0, 100))
    return r


async def build_report(
    ctx: OrgContext,
    test_type: str,
    variant_a: str,
    variant_b: Optional[str],
    personas: List[Persona],
    reactions: Dict[str, Dict[str, Reaction]],
) -> SimulationReport:
    rows = []
    for p in personas:
        row = {"employee": {k: getattr(p, k) for k in
                            ("name", "segment", "department", "job_title", "ai_literacy", "attitude_to_ai")}}
        for v in ("A", "B"):
            r = reactions.get(v, {}).get(p.id)
            if r:
                row[f"reaction_{v}"] = r.model_dump()
        rows.append(row)

    variants = f"<variant_a>\n{variant_a}\n</variant_a>"
    if variant_b:
        variants += f"\n<variant_b>\n{variant_b}\n</variant_b>"

    user = f"""Organization: {ctx.organization}
AI solution: {ctx.ai_solution}
What was tested: {test_type}

{variants}

Reactions (JSON):
{json.dumps(rows, indent=1)}"""
    return await parse(system=templates.SIM_REPORT, user=user, output=SimulationReport, effort="high")
