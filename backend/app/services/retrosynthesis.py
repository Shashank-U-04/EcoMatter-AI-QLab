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
from rdkit.Chem import BRICS, Descriptors

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

    # Real, computable metrics — no invented yield/cost numbers. Largest-block
    # coverage = fraction of the target's heavy-atom skeleton delivered by the
    # single biggest building block (higher = more of it is pre-assembled).
    product_heavy = max(mol.GetNumHeavyAtoms(), 1)
    frag_heavy = [
        fm.GetNumHeavyAtoms()
        for fm in (Chem.MolFromSmiles(p) for p in precursors)
        if fm is not None
    ]
    largest_block_pct = round(max(frag_heavy) / product_heavy * 100, 1) if frag_heavy else None

    flags = []
    if d["halogen_count"] == 0:
        flags.append("Halide-free target - avoids halogenated reagents")
    else:
        flags.append(f"{int(d['halogen_count'])} halogen(s) - needs halide reagents")
    if d["exotic_atoms"] > 0:
        flags.append(f"{int(d['exotic_atoms'])} exotic heteroatom(s) - specialised reagents")
    if d["stereo_centers"] > 0:
        flags.append(f"{int(d['stereo_centers'])} stereocentre(s) - require stereocontrol")
    if d["amide_groups"] > 0:
        flags.append("Amide bond(s) - coupling agents (e.g. carbodiimides) typical")

    return {
        "source_engine": "brics-local",
        "steps": steps,
        "largest_block_pct": largest_block_pct,
        "building_blocks": len(precursors),
        "flags": flags,
        "note": (
            "Retrosynthetic disconnection via RDKit BRICS. Metrics are computed "
            "from structure (building-block count, skeleton coverage, reagent "
            "flags) - a plausibility sketch for screening, not a validated procedure."
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
            "largest_block_pct": None,
            "building_blocks": len(steps),
            "flags": [],
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
