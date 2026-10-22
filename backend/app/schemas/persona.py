from typing import List, Literal

from pydantic import BaseModel


class OrgContext(BaseModel):
    """Who we're simulating and what AI solution is being rolled out to them."""
    organization: str = "Seagate Technology"
    ai_solution: str = ""
    departments: str = ""
    notes: str = ""


class Persona(BaseModel):
    id: str
    name: str
    avatar_emoji: str
    age: int
    location: str
    department: str
    job_title: str
    segment: str
    years_at_company: int
    ai_literacy: Literal["beginner", "intermediate", "advanced"]
    attitude_to_ai: Literal["enthusiast", "curious", "neutral", "skeptical", "resistant"]
    preferred_learning: Literal["hands-on", "video", "written guide", "live workshop", "peer help"]
    daily_work: str
    personality: str
    goals: List[str]
    frustrations: List[str]
    ai_use_cases: List[str]
    concerns: List[str]
    signature_quote: str


class PersonaSet(BaseModel):
    personas: List[Persona]


class GeneratePersonasRequest(BaseModel):
    context: OrgContext
    count: int = 8
