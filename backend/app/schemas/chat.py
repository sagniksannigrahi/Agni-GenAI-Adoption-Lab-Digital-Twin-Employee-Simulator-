from typing import List, Literal, Optional

from pydantic import BaseModel

from .persona import OrgContext, Persona


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    context: OrgContext
    persona: Persona
    mode: Literal["interview", "support"] = "interview"
    scenario: str = ""
    history: List[ChatMessage]


class SupportGrade(BaseModel):
    overall_score: int
    resolved: bool
    empathy: int
    clarity: int
    accuracy: int
    jargon_free: int
    what_went_well: List[str]
    what_to_improve: List[str]
    escalation_needed: bool
    escalation_note: str
    model_reply: str


class GradeRequest(BaseModel):
    context: OrgContext
    persona: Persona
    scenario: str = ""
    history: List[ChatMessage]
