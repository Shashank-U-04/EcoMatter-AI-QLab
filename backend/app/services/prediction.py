"""Descriptor-based property predictors.

These are deliberately framed as *directional screening estimates*, not
lab-grade values (PRD section 8). Each predictor is a transparent formula over
RDKit descriptors, which also makes the explainability layer honest: the
reported "feature importance" is the actual term contribution, not a post-hoc
approximation.

All scored properties live on a 0-100 scale where higher = more of the named
quality (affordability means higher = cheaper to make).
"""
from dataclasses import dataclass

from rdkit import Chem

from .descriptors import compute_descriptors

MODEL_VERSION = "heuristic-v1"

PROPERTY_NAMES = [
    "biodegradability",
    "thermal_stability",
    "lightweight",
    "flexibility",
    "affordability",
]

PROPERTY_LABELS = {
    "biodegradability": "Biodegradability",
    "thermal_stability": "Thermal stability",
    "lightweight": "Lightweight",
    "flexibility": "Flexibility",
    "affordability": "Affordability (low cost)",
}


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


@dataclass
class PropertyPrediction:
    property_name: str
    value: float
    confidence: float
    contributions: list[dict]  # [{factor, direction, points}]


def _biodegradability(d: dict) -> tuple[float, list[dict]]:
    hydrolyzable = d["ester_groups"] + d["amide_groups"] + d["carbonate_groups"]
    hydro_density = hydrolyzable / max(d["heavy_atoms"], 1)
    terms = [
        ("Baseline (organic backbone)", 30.0),
        ("Hydrolyzable ester/amide bonds", min(hydro_density * 320, 40.0)),
        ("Oxygen-rich backbone", min(d["oxygen_fraction"] * 80, 15.0)),
        ("Chain flexibility (microbial access)", min(d["rotatable_fraction"] * 40, 10.0)),
        ("Aromatic ring persistence", -min(d["aromatic_fraction"] * 45, 25.0)),
        ("Halogenation penalty", -min(d["halogen_count"] * 15, 40.0)),
    ]
    return _score_from_terms(terms)


def _thermal_stability(d: dict) -> tuple[float, list[dict]]:
    ring_density = d["ring_count"] / max(d["heavy_atoms"], 1)
    terms = [
        ("Baseline", 25.0),
        ("Aromatic ring content", min(d["aromatic_fraction"] * 90, 45.0)),
        ("Ring rigidity", min(ring_density * 120, 20.0)),
        ("Polar cohesion (H-bonding groups)", min((d["amide_groups"] + d["hydroxyl_groups"]) * 4, 12.0)),
        ("Flexible chain penalty", -min(d["rotatable_fraction"] * 55, 30.0)),
    ]
    return _score_from_terms(terms)


def estimate_density(d: dict) -> float:
    """Very rough polymer-density proxy in g/cm^3."""
    density = 0.92
    density += d["aromatic_fraction"] * 0.28
    density += d["halogen_count"] / max(d["heavy_atoms"], 1) * 0.9
    density += d["oxygen_fraction"] * 0.25
    density += d["nitrogen_fraction"] * 0.15
    return round(min(density, 2.2), 3)


def _lightweight(d: dict) -> tuple[float, list[dict]]:
    density = estimate_density(d)
    # Map density 0.9 -> ~95, 1.5 -> ~35, 2.0 -> ~10
    base = _clamp((1.85 - density) * 100)
    terms = [
        (f"Estimated density {density} g/cm3", base - 50.0),
        ("Baseline", 50.0),
    ]
    return _score_from_terms(terms)


def _flexibility(d: dict) -> tuple[float, list[dict]]:
    terms = [
        ("Baseline", 20.0),
        ("Rotatable backbone bonds", min(d["rotatable_fraction"] * 190, 60.0)),
        ("Ether linkage softness", min(d["ether_groups"] * 5, 15.0)),
        ("Ring stiffness penalty", -min(d["aromatic_fraction"] * 50, 30.0)),
        ("Sp3 carbon content", min(d["fraction_csp3"] * 25, 15.0)),
    ]
    return _score_from_terms(terms)


def _affordability(d: dict) -> tuple[float, list[dict]]:
    terms = [
        ("Baseline (commodity feedstock)", 85.0),
        ("Molecular size", -min(d["heavy_atoms"] * 0.55, 30.0)),
        ("Ring-system complexity", -min(d["ring_count"] * 4, 20.0)),
        ("Stereochemistry control cost", -min(d["stereo_centers"] * 5, 20.0)),
        ("Exotic-atom sourcing", -min(d["exotic_atoms"] * 12, 30.0)),
    ]
    return _score_from_terms(terms)


def _score_from_terms(terms: list[tuple[str, float]]) -> tuple[float, list[dict]]:
    score = _clamp(sum(points for _, points in terms))
    contributions = [
        {
            "factor": name,
            "direction": "up" if points >= 0 else "down",
            "points": round(points, 1),
        }
        for name, points in terms
        if abs(points) >= 0.5
    ]
    contributions.sort(key=lambda c: -abs(c["points"]))
    return score, contributions


_PREDICTOR_FNS = {
    "biodegradability": _biodegradability,
    "thermal_stability": _thermal_stability,
    "lightweight": _lightweight,
    "flexibility": _flexibility,
    "affordability": _affordability,
}

# Confidence reflects how directly the descriptor evidence supports each proxy.
_BASE_CONFIDENCE = {
    "biodegradability": 0.62,
    "thermal_stability": 0.60,
    "lightweight": 0.72,
    "flexibility": 0.70,
    "affordability": 0.58,
}


def predict_properties(
    mol: Chem.Mol, reference_similarity: float = 0.5
) -> list[PropertyPrediction]:
    """Predict all screening properties for a molecule.

    reference_similarity (max Tanimoto vs the known-molecule library) scales
    confidence: predictions far from known chemistry are flagged as less
    certain.
    """
    d = compute_descriptors(mol)
    conf_scale = 0.7 + 0.3 * max(0.0, min(reference_similarity, 1.0))
    results = []
    for name, fn in _PREDICTOR_FNS.items():
        value, contributions = fn(d)
        results.append(
            PropertyPrediction(
                property_name=name,
                value=round(value, 1),
                confidence=round(_BASE_CONFIDENCE[name] * conf_scale, 2),
                contributions=contributions,
            )
        )
    return results
