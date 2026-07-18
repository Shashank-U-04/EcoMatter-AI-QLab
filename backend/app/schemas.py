"""Pydantic request/response schemas for the REST API."""
import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# ---- Auth ----


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    org: str = Field(default="", max_length=255)

    @field_validator("name", "org")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class FirebaseLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)
    # Optional profile details captured at signup; token claims win when absent.
    name: str = Field(default="", max_length=120)
    org: str = Field(default="", max_length=255)

    @field_validator("name", "org")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ---- Projects ----


KNOWN_PROPERTIES = frozenset(
    {"biodegradability", "thermal_stability", "lightweight", "flexibility", "affordability"}
)


class PropertyTargetIn(BaseModel):
    property_name: str
    target_value: float = Field(ge=0, le=100)
    weight: float = Field(default=1.0, ge=0, le=5)

    @field_validator("property_name")
    @classmethod
    def known_property(cls, value: str) -> str:
        if value not in KNOWN_PROPERTIES:
            raise ValueError(f"Unknown property; expected one of {sorted(KNOWN_PROPERTIES)}")
        return value


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    domain: str = Field(pattern="^(packaging|ev_component)$")
    property_targets: list[PropertyTargetIn] = Field(min_length=1, max_length=5)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Project name cannot be blank")
        return stripped

    @field_validator("property_targets")
    @classmethod
    def unique_properties(cls, targets: list[PropertyTargetIn]) -> list[PropertyTargetIn]:
        names = [t.property_name for t in targets]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate property targets")
        return targets


class PropertyTargetOut(PropertyTargetIn):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProjectOut(BaseModel):
    id: int
    name: str
    domain: str
    created_at: datetime
    share_token: str | None = None  # owner-only view; None = not shared
    property_targets: list[PropertyTargetOut] = []
    # Dashboard triage summary — populated only by the project-list endpoint.
    # Nullable with safe defaults so create/get/rename responses stay unchanged
    # and old clients ignore the extra fields.
    latest_run_status: str | None = None  # pending|running|completed|failed|None
    candidate_count: int | None = None  # candidates in the latest completed run
    top_score: float | None = None  # best composite score in that run
    last_activity: datetime | None = None  # most recent run time, else created_at

    model_config = ConfigDict(from_attributes=True)


# ---- Generation & candidates ----


class GenerationPoint(BaseModel):
    gen: int
    best: float
    valid: int


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
    progress_history: list[GenerationPoint] = []

    @field_validator("progress_history", mode="before")
    @classmethod
    def parse_history(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return []
        return value or []

    model_config = ConfigDict(from_attributes=True)


class ProjectRename(BaseModel):
    name: str = Field(min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Project name cannot be blank")
        return stripped


class PredictionOut(BaseModel):
    property_name: str
    predicted_value: float
    confidence: float
    model_version: str

    model_config = ConfigDict(from_attributes=True)


class PolymerizationAssessmentOut(BaseModel):
    classification: str
    feasibility_score: int
    polymer_family: str | None = None
    co_monomer_requirement: str = "n/a"
    supported_reaction_types: list[str] = []
    reasons: list[str] = []
    warnings: list[str] = []
    rule_version: str = "polymer-feasibility-v1"


class CandidateSummary(BaseModel):
    id: int
    smiles: str
    novelty_score: float
    composite_score: float
    rank: int
    starred: bool = False
    predictions: list[PredictionOut]
    # Compact polymerisation-feasibility badge for the results table; None until
    # the candidate has been assessed (additive, tolerated absent by old clients).
    classification: str | None = None
    polymer_family: str | None = None


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
    cost_estimate_usd_per_kg: float | None = None
    ml_drivers: list[dict] = []


class CandidateDetail(CandidateSummary):
    generation_method: str
    project_id: int
    next_candidate_id: int | None = None  # next-ranked candidate in the same run
    prev_candidate_id: int | None = None  # previous-ranked candidate (None for rank 1)
    pubchem_cid: int | None = None  # None unchecked, 0 novel, >0 known compound
    explanation: ExplanationOut
    polymerization: PolymerizationAssessmentOut | None = None  # None if not assessed


class SynthesisStep(BaseModel):
    step: int
    description: str
    precursors: list[str]
    reaction_hint: str


class SynthesisRouteOut(BaseModel):
    source_engine: str
    steps: list[SynthesisStep]
    largest_block_pct: float | None = None  # real: biggest block's share of the skeleton
    building_blocks: int = 0
    flags: list[str] = []
    note: str = ""


# ---- Public share links ----


class ShareLinkOut(BaseModel):
    share_token: str | None  # None after revocation


class SharedProjectOut(BaseModel):
    """Read-only public snapshot of a project's latest completed results."""

    name: str
    domain: str
    created_at: datetime
    property_targets: list[PropertyTargetOut] = []
    run: RunStatusOut | None = None
    candidates: list[CandidateSummary] = []
