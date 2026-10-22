"""Demo mode: realistic fake results for every module, with no API calls."""

import asyncio
import hashlib
import random
import re
from collections import defaultdict
from typing import AsyncIterator, Dict, List, Optional

from ..schemas.chat import ChatRequest, GradeRequest, SupportGrade
from ..schemas.feedback import FaqItem, FeedbackAnalysis, FeedbackIssue, FeedbackRequest, Theme
from ..schemas.persona import OrgContext, Persona
from ..schemas.prompt_coach import CoachRequest, CriterionScore, PromptReview
from ..schemas.simulation import (
    Issue, PredictedTicket, Reaction, SegmentInsight, SimulationReport, TrainingAction,
)
from ..schemas.training import (
    Exercise, GlossaryItem, QuizQuestion, TrainingKit, TrainingRequest, TrainingSection,
    Translation, TranslateRequest,
)
from . import data

NOTE = "DEMO MODE: sample output. Add an API key for live AI results."


def _rng(*parts: str) -> random.Random:
    return random.Random(int(hashlib.sha256("|".join(parts).encode()).hexdigest()[:12], 16))


async def _stream(text: str) -> AsyncIterator[str]:
    for word in text.split(" "):
        await asyncio.sleep(0.025)
        yield word + " "


# ---------------- Personas ----------------

async def generate_personas(ctx: OrgContext, count: int) -> List[Persona]:
    await asyncio.sleep(1.0)
    rng = _rng(ctx.organization, ctx.ai_solution)
    pool = data.EMPLOYEES[:]
    rng.shuffle(pool)
    out = []
    for i in range(count):
        (name, emoji, age, loc, dept, title, seg, yrs, lit, att, learn, daily, pers, quote) = pool[i % len(pool)]
        out.append(Persona(
            id=f"p{i + 1}", name=name, avatar_emoji=emoji, age=age, location=loc, department=dept,
            job_title=title, segment=seg, years_at_company=yrs, ai_literacy=lit, attitude_to_ai=att,
            preferred_learning=learn, daily_work=daily, personality=pers,
            goals=rng.sample(data.GOALS, 2), frustrations=rng.sample(data.FRUSTRATIONS, 2),
            ai_use_cases=rng.sample(data.USE_CASES, 3), concerns=rng.sample(data.CONCERNS, 2),
            signature_quote=quote,
        ))
    return out


# ---------------- Beta test simulation ----------------

_LIT = {"advanced": 18, "intermediate": 5, "beginner": -12}
_ATT = {"enthusiast": 20, "curious": 8, "neutral": 0, "skeptical": -14, "resistant": -26}


async def react(ctx: OrgContext, test_type: str, stimulus: str, p: Persona) -> Reaction:
    rng = _rng(p.id, p.name, stimulus)
    await asyncio.sleep(rng.uniform(0.3, 1.8))
    s = stimulus.lower()
    base = 52 + _LIT[p.ai_literacy] + _ATT[p.attitude_to_ai]
    if any(k in s for k in ("privacy", "secure", "confidential", "data stays")):
        base += 8
    if any(k in s for k in ("example", "step", "how to", "try")):
        base += 6
    jargon = len(re.findall(r"\b(llm|rag|token|embedding|api|vector|model|inference|latency)\b", s))
    clarity = max(10, min(98, int(rng.gauss(72 - jargon * 6 + (10 if p.ai_literacy == "advanced" else 0), 10))))
    adoption = max(3, min(97, int(rng.gauss(base + (clarity - 60) / 4, 12))))
    sentiment = max(-100, min(100, int((adoption - 45) * 1.6 + rng.gauss(0, 12))))
    mood = ("excited" if sentiment > 50 else "curious" if sentiment > 15 else "indifferent"
            if sentiment > -15 else "skeptical" if sentiment > -50 else "frustrated")
    voice = {
        "excited": f"This is exactly what I need for my work in {p.department}. I'd try it today.",
        "curious": "Looks promising. I'd want to see one real example from my own job first.",
        "indifferent": "Okay, but I don't see why I'd change how I work right now.",
        "skeptical": "Sounds nice on paper. What happens when it gives me a wrong answer?",
        "frustrated": "Honestly, this feels like one more tool I'm being told to use.",
    }[mood]
    return Reaction(
        first_impression=f"{voice} {p.signature_quote}",
        emotional_state=mood, sentiment=sentiment, clarity=clarity,
        confidence_to_use=max(5, min(95, clarity - 15 + _LIT[p.ai_literacy])),
        adoption_likelihood=adoption, would_recommend=adoption > 62,
        what_they_like=rng.sample(["Saves time on writing", "Clear first step", "Feels safe to try",
                                   "Works with documents I already use", "Practical examples"], 2),
        confusion_points=rng.sample(["Which data am I allowed to paste?", "What does 'grounded answer' mean?",
                                     "Where do I find it?", "How is this different from the old chatbot?",
                                     "Do I need a licence?"], 1 if clarity > 70 else 3),
        questions_they_would_ask=rng.sample([
            "Can I upload confidential customer documents?", "How do I know the answer is correct?",
            "Does it work on my phone?", "Is there a training session for my team?",
            "Who do I contact if it gives a wrong answer?"], 2),
        possible_issues=rng.sample(["Slow responses with large files", "Login loop on VPN",
                                    "Citations link to the wrong page", "Answers ignore recent documents"], 1),
        what_would_help=rng.choice(["A 10-minute live demo with my own work",
                                    "A one-page cheat sheet of allowed data",
                                    "A colleague from my team showing me", "Short video walkthrough"]),
    )


async def build_report(ctx: OrgContext, test_type: str, variant_a: str, variant_b: Optional[str],
                       personas: List[Persona], reactions: Dict[str, Dict[str, Reaction]]) -> SimulationReport:
    await asyncio.sleep(1.2)

    def avg(v):
        xs = [r.adoption_likelihood for r in reactions.get(v, {}).values()]
        return sum(xs) / len(xs) if xs else 0

    a = avg("A")
    b = avg("B") if variant_b else None
    winner = "n/a" if b is None else ("tie" if abs(a - b) < 3 else "A" if a > b else "B")
    best = "B" if winner == "B" else "A"
    score = int(max(a, b or 0))
    seg = defaultdict(list)
    for p in personas:
        r = reactions[best].get(p.id)
        if r:
            seg[p.segment].append(r.adoption_likelihood)
    return SimulationReport(
        headline=f"{'Strong' if score > 70 else 'Mixed' if score > 40 else 'Weak'} readiness for this {test_type.lower()}",
        verdict="ready" if score > 70 else "needs work" if score > 40 else "not ready",
        readiness_score=score,
        executive_summary=(f"{NOTE} Engineers and enthusiasts are ready to adopt; factory operations, finance "
                           "and legal need clear data-handling rules and job-specific examples before they commit."),
        winning_variant=winner,
        variant_comparison="" if b is None else f"Variant A averaged {a:.0f}% likely adoption vs {b:.0f}% for variant B.",
        segment_insights=[SegmentInsight(segment=k, avg_adoption=int(sum(v) / len(v)),
                                         summary=f"{len(v)} employee(s), average adoption {int(sum(v) / len(v))}%.")
                          for k, v in sorted(seg.items(), key=lambda x: -sum(x[1]) / len(x[1]))],
        strengths=["Clear time-saving value for writing-heavy roles", "Engineers want to try it immediately"],
        issue_log=[
            Issue(title="No clear rule on confidential data", category="compliance", severity="high",
                  affected_segments=["Business functions", "R&D engineers"], escalate_to="Legal & compliance",
                  evidence="Most employees asked what data they may paste."),
            Issue(title="Jargon in the announcement ('grounded', 'RAG')", category="documentation", severity="medium",
                  affected_segments=["Factory ops", "Business functions"], escalate_to="No escalation",
                  evidence="Beginners scored clarity below 60."),
            Issue(title="Slow responses with large PDFs", category="performance", severity="medium",
                  affected_segments=["R&D engineers"], escalate_to="Engineering",
                  evidence="Reliability engineers expect to upload 100+ page reports."),
        ],
        predicted_tickets=[
            PredictedTicket(question="Can I upload confidential customer documents?", likely_from="Customer-facing",
                            suggested_answer="Only into the approved internal assistant, never public AI tools. Customer data stays inside the company."),
            PredictedTicket(question="How do I know the answer is correct?", likely_from="R&D engineers",
                            suggested_answer="Click the source links under each answer and check the original document before you reuse a number."),
            PredictedTicket(question="Is there training for my team?", likely_from="Factory ops",
                            suggested_answer="Yes: 30-minute floor sessions run every Tuesday; ask your supervisor to book one."),
        ],
        training_actions=[
            TrainingAction(action="One-page 'what data is allowed' cheat sheet", audience="All employees",
                           format="Printable PDF + intranet page", impact="high"),
            TrainingAction(action="15-minute shift-handover demo on the floor", audience="Factory ops",
                           format="Live demo", impact="high"),
            TrainingAction(action="Prompt library for reports and emails", audience="Business functions",
                           format="Shared prompt templates", impact="medium"),
        ],
        surprising_insight="The most skeptical employees were won over by a single example from their own job, not by feature lists.",
    )


# ---------------- Training ----------------

async def generate_kit(req: TrainingRequest) -> TrainingKit:
    await asyncio.sleep(1.2)
    m = max(15, req.minutes)
    return TrainingKit(
        title=f"{req.topic}: a hands-on session",
        audience=req.audience, format=req.format, total_minutes=m,
        learning_objectives=["Explain in one sentence what the AI assistant does and doesn't do",
                             "Write a clear prompt using Role, Task, Context and Format",
                             "Check an AI answer against its sources before reusing it",
                             "Know which data is allowed and where to get help"],
        sections=[
            TrainingSection(heading="Why this matters for you", minutes=m // 6,
                            content="- What the assistant is: a helper for **drafting, summarising and finding info**\n- What it is not: a source of truth\n- Two real examples from your team",
                            speaker_notes="Open with a 60-second live demo using a task from this audience's job."),
            TrainingSection(heading="Your first great prompt", minutes=m // 3,
                            content="Use the **RTCF** recipe:\n1. **Role**: who should the AI act as?\n2. **Task**: what exactly do you want?\n3. **Context**: background it needs\n4. **Format**: bullets, table, email...",
                            speaker_notes="Show a weak prompt, then improve it live with the room."),
            TrainingSection(heading="Trust, but verify", minutes=m // 6,
                            content="- Always open the source links\n- Double-check numbers and names\n- Never paste personal or customer data into public tools",
                            speaker_notes="Show an example where the AI made a confident mistake."),
            TrainingSection(heading="Practice and Q&A", minutes=m - (m // 6) * 2 - m // 3,
                            content="Work through the exercises below in pairs, then share one win.",
                            speaker_notes="Walk the room; collect questions for the FAQ."),
        ],
        hands_on_exercises=[
            Exercise(title="Summarise an email thread",
                     prompt_to_try="Act as my assistant. Summarise this email thread in 5 bullets, then list open action items with owners: [PASTE THREAD]",
                     expected_outcome="A short summary plus a clear action list."),
            Exercise(title="Draft a status update",
                     prompt_to_try="Turn these notes into a 120-word status update for my manager, friendly but professional: [NOTES]",
                     expected_outcome="A ready-to-send update you only lightly edit."),
        ],
        quiz=[
            QuizQuestion(question="What should you do before reusing a number from an AI answer?",
                         options=["Nothing, it's always right", "Check the original source", "Ask the AI again", "Round it"],
                         answer_index=1, explanation="AI can be confidently wrong; sources are the truth."),
            QuizQuestion(question="Which part of RTCF tells the AI how to shape its answer?",
                         options=["Role", "Task", "Context", "Format"], answer_index=3,
                         explanation="Format = bullets, table, email, length."),
            QuizQuestion(question="Where can you paste confidential customer data?",
                         options=["Any AI chatbot", "Only approved internal tools", "Personal ChatGPT", "Nowhere ever"],
                         answer_index=1, explanation="Approved internal tools keep data inside the company."),
        ],
        glossary=[GlossaryItem(term="Prompt", plain_english="The instruction you type to the AI."),
                  GlossaryItem(term="Hallucination", plain_english="When the AI makes up something that sounds true."),
                  GlossaryItem(term="Grounded answer", plain_english="An answer based on your company documents, with links.")],
        do_and_dont=["DO give context and an example", "DO check sources",
                     "DON'T paste personal data into public tools", "DON'T copy answers without reading them"],
    )


async def translate(req: TranslateRequest) -> Translation:
    await asyncio.sleep(0.8)
    return Translation(
        plain_version=("The assistant reads our company documents first, then answers your question using what it found, "
                       "and shows you links to where each answer came from. (" + NOTE + ")"),
        reading_level_before="Expert", reading_level_after="Everyone",
        glossary=[GlossaryItem(term="RAG", plain_english="The AI looks things up in our documents before answering."),
                  GlossaryItem(term="Tokens", plain_english="Small chunks of text the AI reads and writes.")],
        analogy="It's like a new colleague who checks the company handbook before answering you, and tells you which page they used.",
    )


# ---------------- Feedback ----------------

async def analyze(req: FeedbackRequest) -> FeedbackAnalysis:
    await asyncio.sleep(1.2)
    items = [l for l in req.feedback.splitlines() if l.strip()]
    n = max(1, len(items))
    neg = sum(1 for l in items if re.search(r"slow|wrong|confus|can't|cannot|error|don't|not|hard|never", l, re.I))
    pos = sum(1 for l in items if re.search(r"love|great|saved|easy|helpful|amazing|useful", l, re.I))
    pos = min(pos, n - neg) if n - neg > 0 else 0
    neutral = n - neg - pos
    pick = lambda pat: [l.strip()[:140] for l in items if re.search(pat, l, re.I)][:2] or [items[0][:140] if items else ""]
    return FeedbackAnalysis(
        executive_summary=f"{NOTE} Users like the time savings on writing tasks, but slow answers, unclear data rules and wrong citations are blocking wider adoption.",
        total_items=n, positive=pos, neutral=neutral, negative=neg,
        adoption_health="at risk" if neg > n / 3 else "healthy",
        themes=[
            Theme(name="Time savings on writing", description="Drafting emails and reports is much faster.",
                  count=max(1, pos), sentiment="positive", example_quotes=pick(r"saved|love|great|useful")),
            Theme(name="Speed and reliability", description="Slow or failed answers on large files.",
                  count=max(1, neg // 2), sentiment="negative", example_quotes=pick(r"slow|error|timeout")),
            Theme(name="Unclear data rules", description="People don't know what they may paste.",
                  count=max(1, neg // 3), sentiment="negative", example_quotes=pick(r"confiden|allowed|data|privacy")),
        ],
        issues=[
            FeedbackIssue(title="Timeouts on large PDF uploads", category="performance", severity="high", mentions=max(1, neg // 2),
                          escalate_to="Engineering", recommended_next_step="Share sample files and timestamps with the platform team."),
            FeedbackIssue(title="No clear data-handling guidance", category="compliance", severity="high", mentions=max(1, neg // 3),
                          escalate_to="Legal & compliance", recommended_next_step="Publish a one-page allowed-data guide."),
            FeedbackIssue(title="Users want more prompt examples", category="training gap", severity="medium", mentions=2,
                          escalate_to="Training team", recommended_next_step="Launch a role-based prompt library."),
        ],
        adoption_blockers=["Fear of pasting confidential data", "Slow responses on big documents", "No examples for factory roles"],
        quick_wins=["Pin an 'allowed data' FAQ in the chat tool", "Run a 15-minute drop-in prompt clinic", "Share 5 prompts per department"],
        faq_candidates=[FaqItem(question="Can I upload customer documents?", answer="Yes, in the approved internal assistant only."),
                        FaqItem(question="Why is it slow with big files?", answer="Large files take longer to read; split files over 50 pages for now.")],
    )


# ---------------- Prompt coach ----------------

async def coach(req: CoachRequest) -> PromptReview:
    await asyncio.sleep(1.0)
    p = req.prompt.strip()
    words = len(p.split())
    base = min(9, 2 + words // 12)
    crit = [("Clarity of task", base), ("Context", max(1, base - 2)), ("Specificity", max(1, base - 1)),
            ("Output format", 2 if not re.search(r"bullet|table|format|words|list", p, re.I) else 7),
            ("Constraints", 2), ("Examples", 1 if "example" not in p.lower() else 6)]
    overall = int(sum(s for _, s in crit) / 60 * 100)
    goal = (req.goal or "get a useful result").strip()
    goal = goal[:1].lower() + goal[1:]
    role = (req.user_role or "workplace").lower()
    improved = (f"You are an experienced assistant to a {role}.\n\n"
                f"Task: {p}\n\nContext: I need this to {goal}. The audience is [WHO WILL READ IT].\n\n"
                "Instructions:\n1. Ask me one clarifying question if anything important is missing.\n"
                "2. Keep it under [LENGTH] words.\n3. Use plain, professional English.\n\n"
                "Format: Return [BULLETS / TABLE / EMAIL] with a one-line summary at the top.")
    return PromptReview(
        overall_score=overall, summary=f"{NOTE} The intent is clear, but the AI has to guess the audience, length and format.",
        criteria=[CriterionScore(criterion=c, score=s, comment="Good." if s >= 7 else "Add more detail here.") for c, s in crit],
        problems=["No audience or purpose given", "No output format", "No length or tone constraints"],
        improved_prompt=improved, improved_score=88,
        why_it_is_better=["Gives the AI a role", "States purpose and audience", "Sets a clear output format and length"],
        techniques_used=["Role prompting", "Context setting", "Output formatting", "Placeholders"],
        reusable_template="You are a [ROLE]. Task: [TASK]. Context: [BACKGROUND]. Audience: [WHO]. Format: [FORMAT], under [N] words.",
    )


async def run_prompt(prompt: str) -> AsyncIterator[str]:
    short = len(prompt.split()) < 25
    text = ("Here is a general answer. Without more detail about your audience and format, I kept it generic: "
            "the key points are summarised below in a standard paragraph." if short else
            "**Summary:** Here is a focused answer shaped to your audience.\n\n- Point one, tailored to your role\n"
            "- Point two, with the format you asked for\n- Point three, within your length limit")
    async for c in _stream(text + f"\n\n({NOTE})"):
        yield c


# ---------------- Chat ----------------

async def chat_stream(req: ChatRequest) -> AsyncIterator[str]:
    p = req.persona
    rng = _rng(p.id, str(len(req.history)))
    if req.mode == "support":
        if not req.history:
            text = (req.scenario and f"Hi, quick one. {req.scenario} Can you help?") or \
                   f"Hi, I tried the AI assistant for {p.ai_use_cases[0].lower()} and it just keeps giving me an error. What am I doing wrong?"
        else:
            text = rng.choice(["Okay... what do you mean by that exactly? I'm not very technical.",
                               "Let me try that. Where do I click?", "That worked, thanks! That was easier than I expected.",
                               "Hmm, it still doesn't work. Is it something on my side?"])
    else:
        text = rng.choice([f"Honestly, in {p.department} most of my day is {p.daily_work.lower()}",
                           f"My biggest worry is {p.concerns[0].lower()}.",
                           f"I'd use it for things like {p.ai_use_cases[0].lower()}, if someone showed me how.",
                           f"What frustrates me is {p.frustrations[0].lower()}."])
    async for c in _stream(text + " (demo reply)"):
        yield c


async def grade(req: GradeRequest) -> SupportGrade:
    await asyncio.sleep(1.0)
    replies = [m.content for m in req.history if m.role == "user"]
    jargon = sum(len(re.findall(r"\b(api|token|llm|rag|cache|sso|vpn|endpoint)\b", r, re.I)) for r in replies)
    empathy = 80 if any(re.search(r"sorry|understand|thanks|happy to help", r, re.I) for r in replies) else 55
    return SupportGrade(
        overall_score=min(95, 50 + len(replies) * 8 - jargon * 5), resolved=len(replies) >= 2,
        empathy=empathy, clarity=72, accuracy=70, jargon_free=max(30, 95 - jargon * 15),
        what_went_well=["Responded quickly", "Stayed polite"],
        what_to_improve=["Confirm the problem in the user's own words first", "Give one step at a time", NOTE],
        escalation_needed=False, escalation_note="",
        model_reply=f"Thanks {req.persona.name.split()[0]}, sorry for the hassle! Let's fix it together: first, could you tell me exactly what the error message says?",
    )
