"""Project CRUD, generation trigger, and ranked candidate listing."""
import threading

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    Candidate,
    GenerationRun,
    Project,
    PropertyTarget,
    Ranking,
    User,
)
from ..schemas import (
    CandidateSummary,
    PredictionOut,
    ProjectCreate,
    ProjectOut,
    RunStatusOut,
)
from ..security import get_current_user
from ..services.pipeline import execute_run

router = APIRouter(prefix="/projects", tags=["projects"])


def _owned_project(project_id: int, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(user_id=user.id, name=payload.name, domain=payload.domain)
    db.add(project)
    db.flush()
    for target in payload.property_targets:
        db.add(
            PropertyTarget(
                project_id=project.id,
                property_name=target.property_name,
                target_value=target.target_value,
                weight=target.weight,
            )
        )
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    projects = db.scalars(
        select(Project)
        .where(Project.user_id == user.id)
        .options(selectinload(Project.property_targets))
        .order_by(Project.created_at.desc())
    ).all()
    return list(projects)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _owned_project(project_id, user, db)


@router.post("/{project_id}/generate", response_model=RunStatusOut, status_code=status.HTTP_202_ACCEPTED)
def start_generation(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project(project_id, user, db)
    targets = [
        {"property_name": t.property_name, "target_value": t.target_value, "weight": t.weight}
        for t in project.property_targets
    ]
    if not targets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no property targets to optimize",
        )
    run = GenerationRun(project_id=project.id, status="pending")
    db.add(run)
    db.commit()
    db.refresh(run)

    # Run the GA off the request thread so the endpoint returns immediately.
    thread = threading.Thread(
        target=execute_run, args=(run.id, project.domain, targets), daemon=True
    )
    thread.start()
    return run


@router.get("/{project_id}/runs/latest", response_model=RunStatusOut)
def latest_run(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project(project_id, user, db)
    run = db.scalar(
        select(GenerationRun)
        .where(GenerationRun.project_id == project.id)
        .order_by(GenerationRun.id.desc())
    )
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No runs yet")
    return run


@router.get("/{project_id}/candidates", response_model=list[CandidateSummary])
def list_candidates(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project(project_id, user, db)
    latest = db.scalar(
        select(GenerationRun)
        .where(GenerationRun.project_id == project.id, GenerationRun.status == "completed")
        .order_by(GenerationRun.id.desc())
    )
    if latest is None:
        return []
    candidates = db.scalars(
        select(Candidate)
        .where(Candidate.run_id == latest.id)
        .options(selectinload(Candidate.predictions), selectinload(Candidate.ranking))
    ).all()
    summaries = [
        CandidateSummary(
            id=c.id,
            smiles=c.smiles,
            novelty_score=c.novelty_score,
            composite_score=c.ranking.composite_score if c.ranking else 0.0,
            rank=c.ranking.rank if c.ranking else 0,
            predictions=[PredictionOut.model_validate(p) for p in c.predictions],
        )
        for c in candidates
    ]
    summaries.sort(key=lambda s: s.rank)
    return summaries
