"""Pydantic request/response schemas for the REST API."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ---- Auth ----


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    org: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str


# ---- Projects ----


class PropertyTargetIn(BaseModel):
    property_name: str
    target_value: float = Field(ge=0, le=100)
    weight: float = Field(default=1.0, ge=0, le=5)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    domain: str = Field(pattern="^(packaging|ev_component)$")
    property_targets: list[PropertyTargetIn]


class PropertyTargetOut(PropertyTargetIn):
    id: int

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: int
    name: str
    domain: str
    created_at: datetime
    property_targets: list[PropertyTargetOut] = []

    class Config:
        from_attributes = True


# ---- Generation & candidates ----


class RunStatusOut(BaseModel):
    id: int
    status: str
    error: str = ""
    started_at: datetime | None = None
    finished_at: datetime | None = None
    progress_generation: int = 0
    progress_total: int = 0
    progress_best_fitness: float = 0.0
    progress_valid_count: int = 0

    class Config:
        from_attributes = True


class ProjectRename(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class PredictionOut(BaseModel):
    property_name: str
    predicted_value: float
    confidence: float
    model_version: str

    class Config:
        from_attributes = True


class CandidateSummary(BaseModel):
    id: int
    smiles: str
    novelty_score: float
    composite_score: float
    rank: int
    starred: bool = False
    predictions: list[PredictionOut]


class SimilarMolecule(BaseModel):
    name: str
    smiles: str
    similarity: float
    note: str


class ExplanationOut(BaseModel):
    summary: str
    feature_importance: list[dict]
    trade_offs: list[str]
    similar_molecules: list[SimilarMolecule]


class CandidateDetail(CandidateSummary):
    generation_method: str
    project_id: int
    next_candidate_id: int | None = None  # next-ranked candidate in the same run
    pubchem_cid: int | None = None  # None unchecked, 0 novel, >0 known compound
    explanation: ExplanationOut


class SynthesisStep(BaseModel):
    step: int
    description: str
    precursors: list[str]
    reaction_hint: str


class SynthesisRouteOut(BaseModel):
    source_engine: str
    steps: list[SynthesisStep]
    estimated_cost: float
    estimated_yield: float
    green_chemistry_score: float
    confidence: float
    note: str = ""
