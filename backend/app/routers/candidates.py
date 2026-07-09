"""Candidate detail, 2D image, and synthesis route endpoints."""
import json

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from ..database import get_db
from ..models import Candidate, Project, Ranking, User
from ..schemas import (
    CandidateDetail,
    ExplanationOut,
    PredictionOut,
    SynthesisRouteOut,
)
from ..security import get_current_user
from ..services.descriptors import mol_from_smiles
from ..services.explainability import build_explanation
from ..services.rendering import smiles_to_svg

router = APIRouter(prefix="/candidates", tags=["candidates"])


def _owned_candidate(candidate_id: int, user: User, db: Session) -> Candidate:
    candidate = db.scalar(
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .options(
            selectinload(Candidate.predictions),
            selectinload(Candidate.ranking),
            selectinload(Candidate.synthesis_route),
            selectinload(Candidate.run),
        )
    )
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    project = db.get(Project, candidate.run.project_id)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return candidate


def _targets_for(candidate: Candidate, db: Session) -> list[dict]:
    project = db.get(Project, candidate.run.project_id)
    return [
        {"property_name": t.property_name, "target_value": t.target_value, "weight": t.weight}
        for t in project.property_targets
    ]


@router.get("/{candidate_id}", response_model=CandidateDetail)
def candidate_detail(
    candidate_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = _owned_candidate(candidate_id, user, db)
    mol = mol_from_smiles(candidate.smiles)
    if mol is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Structure could not be parsed")
    predictions = {p.property_name: p.predicted_value for p in candidate.predictions}
    explanation = build_explanation(mol, _targets_for(candidate, db), predictions)
    next_candidate_id = None
    if candidate.ranking is not None:
        next_candidate_id = db.scalar(
            select(Candidate.id)
            .join(Ranking, Ranking.candidate_id == Candidate.id)
            .where(
                Candidate.run_id == candidate.run_id,
                Ranking.rank == candidate.ranking.rank + 1,
            )
        )
    return CandidateDetail(
        id=candidate.id,
        smiles=candidate.smiles,
        generation_method=candidate.generation_method,
        project_id=candidate.run.project_id,
        next_candidate_id=next_candidate_id,
        pubchem_cid=candidate.pubchem_cid,
        starred=bool(candidate.starred),
        novelty_score=candidate.novelty_score,
        composite_score=candidate.ranking.composite_score if candidate.ranking else 0.0,
        rank=candidate.ranking.rank if candidate.ranking else 0,
        predictions=[PredictionOut.model_validate(p) for p in candidate.predictions],
        explanation=ExplanationOut(**explanation),
    )


@router.patch("/{candidate_id}/star")
def toggle_star(
    candidate_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = _owned_candidate(candidate_id, user, db)
    candidate.starred = 0 if candidate.starred else 1
    db.commit()
    return {"id": candidate.id, "starred": bool(candidate.starred)}


@router.get("/{candidate_id}/image")
def candidate_image(
    candidate_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = _owned_candidate(candidate_id, user, db)
    svg = smiles_to_svg(candidate.smiles)
    if svg is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot render structure")
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/{candidate_id}/synthesis", response_model=SynthesisRouteOut)
def candidate_synthesis(
    candidate_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = _owned_candidate(candidate_id, user, db)
    route = candidate.synthesis_route
    if route is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No synthesis route found for this candidate",
        )
    data = json.loads(route.route_json)
    return SynthesisRouteOut(
        source_engine=data["source_engine"],
        steps=data["steps"],
        estimated_cost=data["estimated_cost"],
        estimated_yield=data["estimated_yield"],
        green_chemistry_score=data["green_chemistry_score"],
        confidence=data["confidence"],
        note=data.get("note", ""),
    )
