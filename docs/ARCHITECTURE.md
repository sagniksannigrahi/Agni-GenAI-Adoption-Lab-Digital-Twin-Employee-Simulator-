# Architecture

```
Browser (vanilla JS, hash router)
   │  JSON / streamed text / NDJSON
   ▼
FastAPI  ── api/routes/*  ──►  api/deps.engine()
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
             services/* (live LLM)          demo/engine.py
                    │                       (no API key)
                    ▼
              core/llm.py  ──►  LLM API
```

## Request flow: Beta Test Simulator

1. The browser posts the org context, the twins and version A (and optionally B) to `POST /api/simulate`.
2. The server starts one task per twin per version, limited by `AGNI_MAX_PARALLEL` (default 8).
3. Each task sends the LLM:
   - a **system prompt** that is identical for every twin (organisation, AI solution, the text being tested), so it can be cached;
   - a **user message** containing that twin's profile;
   - a Pydantic `Reaction` schema, so the response is validated JSON.
4. As each reaction finishes, the server streams an NDJSON line to the browser, and that twin's card updates live.
5. When all twins are done, one high-effort call turns every reaction into a `SimulationReport`.

## LLM calls

| Task | Effort | Output schema |
|---|---|---|
| Generate twins | medium | `PersonaSet` |
| Twin reaction | low | `Reaction` |
| Launch-readiness report | high | `SimulationReport` |
| Training kit | medium | `TrainingKit` |
| Jargon translation | low | `Translation` |
| Feedback analysis | medium | `FeedbackAnalysis` |
| Prompt review | medium | `PromptReview` |
| Chat / run prompt | low | streamed text |
| Support grading | medium | `SupportGrade` |

All calls go through `core/llm.py`, which:

- enables a server-side fallback model if a request is declined;
- checks the stop reason (declined or truncated) before reading results;
- maps SDK errors to friendly messages for the UI.

## Frontend

- `js/main.js`: hash router, theme toggle, engine status badge.
- `js/state.js`: shared state (context, twins, last results), saved in `localStorage`.
- `js/api.js`: fetch helpers for JSON, text streams and NDJSON streams.
- `js/charts.js`: dependency-free histogram, bar, gauge and sentiment charts with hover tooltips.
- `js/modules/*`: one file per page. `simulator.js` exports `runSimulation`, which Training Studio reuses to test training kits on the twins.

## Demo mode

If no API key is set (or `AGNI_DEMO=1`), `api/deps.engine()` returns `demo/engine.py`. It has the same function
signatures as the live services and produces deterministic, plausible data, so the UI and tests run anywhere.
