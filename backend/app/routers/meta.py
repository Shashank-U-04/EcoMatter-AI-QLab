"""Model transparency endpoint — surfaces the trained models' cards."""
from fastapi import APIRouter

from ..services.solubility import model_card

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/models")
def models():
    """Cards for the trained ML models backing property predictions."""
    cards = []
    solubility = model_card()
    if solubility is not None:
        cards.append(solubility)
    return {"models": cards}
