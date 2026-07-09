"""Explanation assembly for a candidate: why it scored the way it did,
trade-offs against the target profile, and similar known molecules."""
from rdkit import Chem

from .prediction import PROPERTY_LABELS, predict_properties
from .similarity import max_reference_similarity, similar_molecules

TRADE_OFF_GAP = 20.0  # points of miss that count as a real trade-off


def build_explanation(
    mol: Chem.Mol, targets: list[dict], predictions: dict[str, float]
) -> dict:
    ref_sim = max_reference_similarity(mol)
    detailed = predict_properties(mol, ref_sim)

    # Feature importance: actual term contributions of the strongest-weighted
    # target property (falls back to biodegradability).
    primary = max(targets, key=lambda t: t["weight"])["property_name"] if targets else "biodegradability"
    primary_detail = next(
        (p for p in detailed if p.property_name == primary), detailed[0]
    )
    feature_importance = [
        {**c, "property": primary_detail.property_name} for c in primary_detail.contributions[:5]
    ]

    trade_offs = []
    hits, misses = [], []
    for t in targets:
        predicted = predictions.get(t["property_name"])
        if predicted is None:
            continue
        label = PROPERTY_LABELS.get(t["property_name"], t["property_name"])
        gap = predicted - t["target_value"]
        if abs(gap) <= TRADE_OFF_GAP:
            hits.append(label)
        else:
            misses.append((label, gap))
    for label, gap in misses:
        direction = "above" if gap > 0 else "below"
        trade_offs.append(
            f"{label} is {abs(gap):.0f} points {direction} target — accepted as a "
            "trade-off to keep the other objectives on profile."
        )

    if hits and not misses:
        summary = (
            f"Matches all {len(hits)} target properties within tolerance "
            f"({', '.join(hits)})."
        )
    elif hits:
        summary = (
            f"Strong on {', '.join(hits)}; ranked despite {len(misses)} "
            "trade-off(s) listed below."
        )
    else:
        summary = "Partial match — best available compromise for a demanding target profile."

    return {
        "summary": summary,
        "feature_importance": feature_importance,
        "trade_offs": trade_offs,
        "similar_molecules": similar_molecules(mol, top_k=3),
    }
