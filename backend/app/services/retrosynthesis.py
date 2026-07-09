"""Retrosynthesis layer.

Default engine: local template-based retro-decomposition using RDKit BRICS
(clearly labeled as such in the UI). If an IBM RXN for Chemistry API key is
configured (RXN_API_KEY), that service is tried first and the local engine
remains the fallback — matching the PRD's 'integrate, don't train' strategy.
"""
import json
import logging

import httpx
from rdkit import Chem
from rdkit.Chem import BRICS

from ..config import RXN_API_KEY
from .descriptors import compute_descriptors

logger = logging.getLogger(__name__)

# Reaction hints keyed by functional groups present in the target.
_LINK_HINTS = [
    ("ester_groups", "Ester linkage — form via acid + alcohol condensation (Fischer esterification) or ring-opening of a lactone"),
    ("amide_groups", "Amide linkage — form via acid/acyl chloride + amine coupling"),
    ("carbonate_groups", "Carbonate linkage — form via diol + carbonate interchange (avoids phosgene)"),
    ("ether_groups", "Ether linkage — form via Williamson ether synthesis"),
    ("aromatic_rings", "Aromatic core — source from a substituted arene feedstock; couple via standard aromatic substitution"),
]


def _local_brics_route(smiles: str) -> dict | None:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    try:
        fragments = sorted(BRICS.BRICSDecompose(mol))
    except Exception as exc:
        logger.warning("BRICS decomposition failed for %s: %s", smiles, exc)
        return None
    # Strip BRICS dummy-atom labels ([1*] etc.) to show clean precursors.
    precursors = []
    for frag in fragments:
        frag_mol = Chem.MolFromSmiles(frag)
        if frag_mol is None:
            continue
        editable = Chem.RWMol(frag_mol)
        dummies = [a.GetIdx() for a in editable.GetAtoms() if a.GetAtomicNum() == 0]
        for idx in sorted(dummies, reverse=True):
            editable.ReplaceAtom(idx, Chem.Atom(1))  # cap with H
        cleaned = editable.GetMol()
        try:
            Chem.SanitizeMol(cleaned)
            cleaned = Chem.RemoveHs(cleaned)
            precursors.append(Chem.MolToSmiles(cleaned))
        except Exception:
            continue
    precursors = sorted(set(precursors))
    if not precursors or precursors == [Chem.MolToSmiles(mol)]:
        return None  # molecule did not decompose into meaningful precursors

    d = compute_descriptors(mol)
    hints = [hint for key, hint in _LINK_HINTS if d.get(key, 0) > 0]
    steps = [
        {
            "step": 1,
            "description": "Source or prepare precursor building blocks",
            "precursors": precursors,
            "reaction_hint": "Commodity or bio-derived feedstocks preferred",
        },
        {
            "step": 2,
            "description": "Assemble target via the linkages below",
            "precursors": [],
            "reaction_hint": "; ".join(hints) if hints else "Standard C-C/C-X coupling chemistry",
        },
    ]

    # Heuristic economics: more precursors and rings -> costlier, lower yield.
    step_penalty = len(precursors) * 6 + d["ring_count"] * 4
    estimated_yield = max(30.0, 85.0 - step_penalty)
    estimated_cost = round(min(95.0, 20.0 + step_penalty + d["exotic_atoms"] * 10), 1)
    green = 60.0
    green += 10 if d["halogen_count"] == 0 else -25
    green += min(d["oxygen_fraction"] * 30, 12)  # condensation-friendly chemistry
    green_score = round(max(5.0, min(95.0, green)), 1)

    return {
        "source_engine": "brics-local",
        "steps": steps,
        "estimated_cost": estimated_cost,
        "estimated_yield": round(estimated_yield, 1),
        "green_chemistry_score": green_score,
        "confidence": 0.55,
        "note": (
            "Template-based route from the local BRICS engine — a plausibility "
            "sketch for screening, not a validated procedure."
        ),
    }


def _ibm_rxn_route(smiles: str) -> dict | None:
    """Best-effort call to IBM RXN; returns None on any failure so the local
    engine can take over."""
    if not RXN_API_KEY:
        return None
    try:
        with httpx.Client(
            base_url="https://rxn.res.ibm.com/rxn/api/api/v1",
            headers={"Authorization": RXN_API_KEY},
            timeout=20.0,
        ) as client:
            response = client.post(
                "/retrosynthesis/predict", json={"product": smiles}
            )
            response.raise_for_status()
            payload = response.json()
        sequences = payload.get("retrosynthetic_paths") or payload.get("sequences")
        if not sequences:
            return None
        first = sequences[0]
        steps = [
            {
                "step": i + 1,
                "description": step.get("reaction", "Predicted transformation"),
                "precursors": step.get("precursors", []),
                "reaction_hint": step.get("reactionClass", ""),
            }
            for i, step in enumerate(first.get("steps", [])[:5])
        ]
        if not steps:
            return None
        return {
            "source_engine": "ibm-rxn",
            "steps": steps,
            "estimated_cost": 50.0,
            "estimated_yield": round(float(first.get("confidence", 0.5)) * 100, 1),
            "green_chemistry_score": 50.0,
            "confidence": round(float(first.get("confidence", 0.5)), 2),
            "note": "Route predicted by IBM RXN for Chemistry (molecular transformer).",
        }
    except Exception as exc:
        logger.warning("IBM RXN call failed, falling back to local engine: %s", exc)
        return None


def plan_route(smiles: str) -> dict | None:
    """Return a route dict or None when no meaningful route exists."""
    return _ibm_rxn_route(smiles) or _local_brics_route(smiles)


def route_to_json(route: dict) -> str:
    return json.dumps(route)
