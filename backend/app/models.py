"""ORM models — mirrors the PRD section 12 schema (10 tables)."""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    org: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    projects: Mapped[list["Project"]] = relationship(back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    domain: Mapped[str] = mapped_column(String(50))  # "packaging" | "ev_component"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="projects")
    property_targets: Mapped[list["PropertyTarget"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    runs: Mapped[list["GenerationRun"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class PropertyTarget(Base):
    __tablename__ = "property_targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    property_name: Mapped[str] = mapped_column(String(80))
    target_value: Mapped[float] = mapped_column(Float)  # 0-100 slider scale
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    project: Mapped[Project] = relationship(back_populates="property_targets")


class GenerationRun(Base):
    __tablename__ = "generation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    # pending | running | completed | failed
    error: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Live GA telemetry, updated once per generation while running.
    progress_generation: Mapped[int] = mapped_column(Integer, default=0)
    progress_total: Mapped[int] = mapped_column(Integer, default=0)
    progress_best_fitness: Mapped[float] = mapped_column(Float, default=0.0)
    progress_valid_count: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship(back_populates="runs")
    candidates: Mapped[list["Candidate"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("generation_runs.id"), index=True)
    smiles: Mapped[str] = mapped_column(Text)
    generation_method: Mapped[str] = mapped_column(String(80), default="ga-rdkit-v1")
    novelty_score: Mapped[float] = mapped_column(Float, default=0.0)
    starred: Mapped[int] = mapped_column(Integer, default=0)  # 0/1 shortlist flag
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped[GenerationRun] = relationship(back_populates="candidates")
    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    ranking: Mapped["Ranking | None"] = relationship(
        back_populates="candidate", cascade="all, delete-orphan", uselist=False
    )
    synthesis_route: Mapped["SynthesisRoute | None"] = relationship(
        back_populates="candidate", cascade="all, delete-orphan", uselist=False
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    property_name: Mapped[str] = mapped_column(String(80))
    predicted_value: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    model_version: Mapped[str] = mapped_column(String(80), default="heuristic-v1")

    candidate: Mapped[Candidate] = relationship(back_populates="predictions")


class Ranking(Base):
    __tablename__ = "rankings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    composite_score: Mapped[float] = mapped_column(Float)
    rank: Mapped[int] = mapped_column(Integer)

    candidate: Mapped[Candidate] = relationship(back_populates="ranking")


class SynthesisRoute(Base):
    __tablename__ = "synthesis_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    source_engine: Mapped[str] = mapped_column(String(80))  # "brics-local" | "ibm-rxn"
    route_json: Mapped[str] = mapped_column(Text)  # JSON: {steps: [...]}
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_yield: Mapped[float] = mapped_column(Float, default=0.0)
    green_chemistry_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)

    candidate: Mapped[Candidate] = relationship(back_populates="synthesis_route")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    file_path: Mapped[str] = mapped_column(Text)
    format: Mapped[str] = mapped_column(String(10))  # pdf | csv | json
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
