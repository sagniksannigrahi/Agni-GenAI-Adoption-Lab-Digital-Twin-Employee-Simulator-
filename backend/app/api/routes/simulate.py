import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ...core.llm import friendly_error
from ...core.config import MAX_PARALLEL
from ...schemas.simulation import SimulateRequest
from ..deps import engine

router = APIRouter(prefix="/api/simulate", tags=["Beta Test Simulator"])


def _line(obj) -> str:
    return json.dumps(obj) + "\n"


@router.post("")
async def simulate(req: SimulateRequest):
    """Streams newline-delimited JSON: one event per reaction, then the report."""
    eng = engine()
    variants = {"A": req.variant_a}
    if req.variant_b and req.variant_b.strip():
        variants["B"] = req.variant_b
    sem = asyncio.Semaphore(MAX_PARALLEL)

    async def one(variant, persona):
        async with sem:
            try:
                r = await eng.react(req.context, req.test_type, variants[variant], persona)
                return variant, persona.id, r, None
            except Exception as e:  # noqa: BLE001
                return variant, persona.id, None, friendly_error(e)

    async def events():
        reactions = {v: {} for v in variants}
        tasks = [asyncio.create_task(one(v, p)) for p in req.personas for v in variants]
        yield _line({"type": "start", "total": len(tasks)})
        for done in asyncio.as_completed(tasks):
            variant, pid, reaction, err = await done
            if reaction:
                reactions[variant][pid] = reaction
                yield _line({"type": "reaction", "variant": variant, "persona_id": pid,
                             "reaction": reaction.model_dump()})
            else:
                yield _line({"type": "reaction_error", "variant": variant, "persona_id": pid, "error": err})

        if not any(reactions.values()):
            yield _line({"type": "error", "error": "Every reaction failed. Check the server log."})
            return
        yield _line({"type": "analyzing"})
        try:
            report = await eng.build_report(req.context, req.test_type, req.variant_a,
                                            variants.get("B"), req.personas, reactions)
            yield _line({"type": "report", "report": report.model_dump()})
        except Exception as e:  # noqa: BLE001
            yield _line({"type": "error", "error": friendly_error(e)})

    return StreamingResponse(events(), media_type="application/x-ndjson")
