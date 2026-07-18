"""Rule-based polymerisation-feasibility classifier for packaging candidates.

This is an *explainable structural screen*, not a reaction predictor and not a
safety assessment. It answers one question: given this molecule's functional
groups, is there a supported step-growth or ring-opening polymerisation family it
could plausibly belong to — and what would it need? Every verdict carries the
human-readable reasons and warnings behind it, never an opaque score alone.

It never infers food safety, toxicity, or synthesis success from structure.
"""
from __future__ import annotations

import json

from rdkit import Chem

from ..models import PolymerizationAssessment
from .descriptors import compute_descriptors, mol_from_smiles

RULE_VERSION = "polymer-feasibility-v1"

# Reaction family per classification — re-derived on read so it need not be a
# stored column. Supported step-growth/ROP families only; flagged/unsupported
# return an empty list because the route needs manual review.
_REACTIONS = {
    "ab_monomer": ["melt polycondensation"],
    "ring_opening_monomer": ["ring-opening polymerisation"],
    "diacid_comonomer": ["melt polycondensation"],
    "diol_comonomer": ["melt polycondensation"],
    "diamine_comonomer": ["melt polycondensation"],
}

# --- Functional-group patterns -------------------------------------------------
# Carboxylic acid (protonated or carboxylate).
_ACID = Chem.MolFromSmarts("[CX3](=O)[OX2H1,OX1-]")
# Hydroxyl on a carbon that is NOT a carbonyl carbon → alcohol/phenol, not acid.
_ALCOHOL = Chem.MolFromSmarts("[#6;!$([CX3]=[OX1])][OX2H]")
# Amine (primary/secondary) that is not an amide nitrogen.
_AMINE = Chem.MolFromSmarts("[NX3;H2,H1;!$(N[CX3]=[OX1])]")
# Ring ester (lactone) and ring carbonate → ring-opening polymerisation.
_LACTONE = Chem.MolFromSmarts("[CX3;R](=[OX1])[OX2;R]")
_CYCLIC_CARBONATE = Chem.MolFromSmarts("[OX2;R][CX3;R](=[OX1])[OX2;R]")

# Base feasibility score per classification, before penalties.
_BASE_SCORE = {
    "ab_monomer": 85,
    "ring_opening_monomer": 82,
    "diacid_comonomer": 70,
    "diol_comonomer": 70,
    "diamine_comonomer": 68,
    "unsupported": 20,
    "flagged": 30,
}

_CO_MONOMER = {
    "ab_monomer": "none",
    "ring_opening_monomer": "none",
    "diacid_comonomer": "diol or diamine co-monomer",
    "diol_comonomer": "diacid or diisocyanate co-monomer",
    "diamine_comonomer": "diacid or diacyl co-monomer",
    "unsupported": "n/a",
}


def _count(mol: Chem.Mol, pattern: Chem.Mol) -> int:
    return len(mol.GetSubstructMatches(pattern)) if pattern is not None else 0


def assess(mol: Chem.Mol) -> dict:
    """Classify a molecule's packaging-polymerisation feasibility.

    Returns a dict matching PolymerizationAssessmentOut. Pure and deterministic.
    """
    n_acid = _count(mol, _ACID)
    n_ol = _count(mol, _ALCOHOL)
    n_amine = _count(mol, _AMINE)
    has_lactone = _count(mol, _LACTONE) > 0
    has_cyclic_carbonate = _count(mol, _CYCLIC_CARBONATE) > 0

    d = compute_descriptors(mol)
    halogens = int(d["halogen_count"])
    exotic = int(d["exotic_atoms"])
    aromatic_fraction = d["aromatic_fraction"]
    total_reactive = n_acid + n_ol + n_amine

    reasons: list[str] = []
    warnings: list[str] = []

    # --- Primary classification (priority order) ---
    classification = "unsupported"
    family: str | None = None
    reactions: list[str] = []

    if has_cyclic_carbonate:
        classification = "ring_opening_monomer"
        family = "aliphatic polycarbonate (ROP)"
        reactions = ["ring-opening polymerisation"]
        reasons.append("Contains a cyclic carbonate ring — a ring-opening monomer.")
    elif has_lactone:
        classification = "ring_opening_monomer"
        family = "aliphatic polyester (ROP)"
        reactions = ["ring-opening polymerisation"]
        reasons.append("Contains a cyclic ester (lactone) — a ring-opening monomer.")
    elif n_acid >= 1 and n_ol >= 1:
        classification = "ab_monomer"
        family = "aliphatic polyester"
        reactions = ["melt polycondensation"]
        reasons.append(
            f"Has {n_ol} hydroxyl and {n_acid} carboxylic-acid group(s) — a hydroxy-acid "
            "that can self-condense into a polyester."
        )
    elif n_acid >= 1 and n_amine >= 1:
        classification = "ab_monomer"
        family = "polyamide"
        reactions = ["melt polycondensation"]
        reasons.append(
            f"Has {n_amine} amine and {n_acid} carboxylic-acid group(s) — an amino-acid "
            "that can self-condense into a polyamide."
        )
    elif n_acid >= 2:
        classification = "diacid_comonomer"
        family = "polyester / polyamide (with a diol or diamine)"
        reactions = ["melt polycondensation"]
        reasons.append(f"Has {n_acid} carboxylic-acid groups — a diacid co-monomer.")
    elif n_ol >= 2:
        classification = "diol_comonomer"
        family = "polyester / polyurethane (with a diacid or diisocyanate)"
        reactions = ["melt polycondensation"]
        reasons.append(f"Has {n_ol} hydroxyl groups — a diol co-monomer.")
    elif n_amine >= 2:
        classification = "diamine_comonomer"
        family = "polyamide (with a diacid)"
        reactions = ["melt polycondensation"]
        reasons.append(f"Has {n_amine} amine groups — a diamine co-monomer.")
    else:
        reasons.append(
            "No supported packaging polymerisation motif (hydroxy-acid, amino-acid, "
            "lactone, cyclic carbonate, diacid, diol, or diamine) was found."
        )

    # --- Safety / complexity signals (never a food-safety claim) ---
    if halogens > 0:
        warnings.append(
            f"Contains {halogens} halogen atom(s) — review environmental and "
            "end-of-life implications before pursuing."
        )
    if exotic > 0:
        warnings.append(
            f"Contains {exotic} uncommon heteroatom(s) beyond C/N/O/S — outside typical "
            "packaging-polymer chemistry."
        )
    if aromatic_fraction > 0.55:
        warnings.append(
            "Heavily aromatic backbone — may resist biodegradation and complicate "
            "melt processing."
        )
    if total_reactive > 6:
        warnings.append(
            f"High functional-group count ({total_reactive}) — risk of cross-linking or "
            "gelation rather than a linear polymer."
        )
    if classification != "unsupported":
        warnings.append("Requires laboratory validation of molecular-weight build-up.")

    # --- Escalate supported chemistry to manual review on a blocking hazard ---
    blocking = halogens > 0 or exotic > 0
    if classification != "unsupported" and blocking:
        reasons.append(
            f"Supported chemistry ({family}) is flagged for manual review due to a "
            "structural concern above."
        )
        classification = "flagged"

    # --- Feasibility score ---
    score = _BASE_SCORE[classification]
    score -= 8 * len([w for w in warnings if "validation" not in w])
    if halogens > 0:
        score -= 15
    if exotic > 0:
        score -= 20
    if aromatic_fraction > 0.55:
        score -= 10
    score = max(5, min(95, score))

    return {
        "classification": classification,
        "feasibility_score": int(score),
        "polymer_family": family,
        "co_monomer_requirement": _CO_MONOMER.get(classification, "manual review"),
        "supported_reaction_types": reactions,
        "reasons": reasons,
        "warnings": warnings,
        "rule_version": RULE_VERSION,
    }


def assess_smiles(smiles: str) -> dict | None:
    mol = mol_from_smiles(smiles)
    return assess(mol) if mol is not None else None


def to_row(candidate_id: int, data: dict) -> PolymerizationAssessment:
    """Build a persistable ORM row from an assess() result."""
    return PolymerizationAssessment(
        candidate_id=candidate_id,
        classification=data["classification"],
        feasibility_score=data["feasibility_score"],
        polymer_family=data["polymer_family"],
        co_monomer_requirement=data["co_monomer_requirement"],
        reasons_json=json.dumps(data["reasons"]),
        warnings_json=json.dumps(data["warnings"]),
        rule_version=data["rule_version"],
    )


def row_to_dict(row: PolymerizationAssessment) -> dict:
    """Convert a stored assessment back into the API shape."""
    return {
        "classification": row.classification,
        "feasibility_score": row.feasibility_score,
        "polymer_family": row.polymer_family,
        "co_monomer_requirement": row.co_monomer_requirement,
        "supported_reaction_types": _REACTIONS.get(row.classification, []),
        "reasons": json.loads(row.reasons_json or "[]"),
        "warnings": json.loads(row.warnings_json or "[]"),
        "rule_version": row.rule_version,
    }
