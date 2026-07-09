"""Report export endpoint: PDF / CSV / JSON (PRD section 13)."""
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Candidate, GenerationRun, Project, User
from ..security import get_current_user
from ..services import report_export

router = APIRouter(prefix="/projects", tags=["reports"])

_MEDIA = {
    "pdf": "application/pdf",
    "csv": "text/csv",
    "json": "application/json",
}


@router.get("/{project_id}/report")
def export_report(
    project_id: int,
    format: str = Query("pdf", pattern="^(pdf|csv|json)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    latest = db.scalar(
        select(GenerationRun)
        .where(GenerationRun.project_id == project.id, GenerationRun.status == "completed")
        .order_by(GenerationRun.id.desc())
    )
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed generation run to report on yet",
        )

    candidates = db.scalars(
        select(Candidate)
        .where(Candidate.run_id == latest.id)
        .options(
            selectinload(Candidate.predictions),
            selectinload(Candidate.ranking),
            selectinload(Candidate.synthesis_route),
        )
    ).all()

    project_dict = {
        "name": project.name,
        "domain": project.domain,
        "property_targets": [
            {"property_name": t.property_name, "target_value": t.target_value, "weight": t.weight}
            for t in project.property_targets
        ],
    }
    candidate_dicts = []
    for c in sorted(candidates, key=lambda x: (x.ranking.rank if x.ranking else 999)):
        candidate_dicts.append(
            {
                "rank": c.ranking.rank if c.ranking else 0,
                "smiles": c.smiles,
                "composite_score": c.ranking.composite_score if c.ranking else 0.0,
                "novelty_score": c.novelty_score,
                "predictions": [
                    {
                        "property_name": p.property_name,
                        "predicted_value": p.predicted_value,
                        "confidence": p.confidence,
                    }
                    for p in c.predictions
                ],
                "synthesis_route": (
                    json.loads(c.synthesis_route.route_json)
                    if c.synthesis_route
                    else None
                ),
            }
        )

    if format == "csv":
        body = report_export.build_csv(project_dict, candidate_dicts)
    elif format == "json":
        body = report_export.build_json(project_dict, candidate_dicts)
    else:
        body = report_export.build_pdf(project_dict, candidate_dicts)

    filename = f"ecomatter_{project.id}_report.{format}"
    return Response(
        content=body,
        media_type=_MEDIA[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
