"""Public read-only project snapshots, addressed by unguessable share token.

No authentication: possession of the token IS the authorization. Owners mint
and revoke tokens via /projects/{id}/share.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Project
from ..schemas import SharedProjectOut
from .projects import candidate_summaries, latest_completed_run

router = APIRouter(prefix="/share", tags=["share"])


@router.get("/{token}", response_model=SharedProjectOut)
def shared_project(token: str, db: Session = Depends(get_db)):
    project = db.scalar(
        select(Project)
        .where(Project.share_token == token)
        .options(selectinload(Project.property_targets))
    )
    if project is None or not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found or revoked"
        )
    run = latest_completed_run(project.id, db)
    return SharedProjectOut(
        name=project.name,
        domain=project.domain,
        created_at=project.created_at,
        property_targets=project.property_targets,
        run=run,
        candidates=candidate_summaries(run.id, db) if run else [],
    )
