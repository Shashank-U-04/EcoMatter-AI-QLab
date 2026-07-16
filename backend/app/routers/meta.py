"""Model transparency + reference-library endpoints."""
import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter
from rdkit.Chem import rdMolDescriptors

from ..services.descriptors import compute_descriptors, mol_from_smiles
from ..services.rendering import smiles_to_svg
from ..services.solubility import model_card

router = APIRouter(prefix="/meta", tags=["meta"])

REFERENCE_PATH = Path(__file__).resolve().parents[2] / "data" / "reference_molecules.json"


@router.get("/models")
def models():
    """Cards for the trained ML models backing property predictions."""
    cards = []
    solubility = model_card()
    if solubility is not None:
        cards.append(solubility)
    return {"models": cards}


@lru_cache(maxsize=1)
def _reference_library() -> tuple[dict, ...]:
    """Static seed-monomer library enriched with real RDKit descriptors + 2D SVGs."""
    entries = json.loads(REFERENCE_PATH.read_text(encoding="utf-8"))
    enriched = []
    for entry in entries:
        mol = mol_from_smiles(entry["smiles"])
        if mol is None:  # never surface a broken structure
            continue
        d = compute_descriptors(mol)
        enriched.append(
            {
                "name": entry["name"],
                "smiles": entry["smiles"],
                "note": entry.get("note", ""),
                "formula": rdMolDescriptors.CalcMolFormula(mol),
                "mol_weight": round(d["mol_weight"], 1),
                "logp": round(d["logp"], 2),
                "tpsa": round(d["tpsa"], 1),
                "ring_count": int(d["ring_count"]),
                "ester_groups": int(d["ester_groups"]),
                "hydroxyl_groups": int(d["hydroxyl_groups"]),
                "svg": smiles_to_svg(entry["smiles"], width=260, height=200),
            }
        )
    return tuple(enriched)


@router.get("/reference-library")
def reference_library():
    """The 30 seed monomers the GA evolves from, with structures and descriptors."""
    return {"molecules": list(_reference_library())}
