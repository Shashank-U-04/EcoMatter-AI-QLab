"""Feedstock-cost estimate grounded in real commodity price anchors.

Turns a structure into a directional USD/kg feedstock-cost index using
approximate 2024-2025 bulk-chemical prices (data/feedstock_costs.json): cheap
commodity carbon as the base, with premiums for the motifs that genuinely drive
manufacturing cost — fluorination, exotic atoms, stereocentres, fused rings,
amide/ester functionalisation. A directional economic estimate, not a lab quote.
"""
import json
from pathlib import Path

from rdkit import Chem

_DATA = Path(__file__).resolve().parent.parent.parent / "data" / "feedstock_costs.json"

with _DATA.open(encoding="utf-8") as _fh:
    _ANCHORS = json.load(_fh)

_BASE = _ANCHORS["base_usd_per_kg"]
_PER_ATOM = _ANCHORS["per_heavy_atom_usd"]
_PREMIUM = _ANCHORS["motif_premium_usd_per_kg"]

# Cost band (USD/kg) used to map onto the 0-100 affordability scale.
_CHEAP = 1.0   # commodity-grade → affordability ~100
_EXPENSIVE = 18.0  # specialty fine chemical → affordability ~0


# Common organic elements + halogens; anything else is a truly "exotic" atom
# (Si, P, B, metals…) that carries the exotic sourcing premium. Halogens are
# priced separately, so they are excluded here to avoid double-counting.
_ORGANIC_AND_HALOGEN = {1, 6, 7, 8, 16, 9, 17, 35, 53}


def _atom_counts(mol: Chem.Mol) -> tuple[int, int, int, int]:
    """(fluorine, chlorine, bromine+iodine, non-halogen exotic) atom counts."""
    f = cl = bri = exotic = 0
    for atom in mol.GetAtoms():
        n = atom.GetAtomicNum()
        if n == 9:
            f += 1
        elif n == 17:
            cl += 1
        elif n in (35, 53):
            bri += 1
        elif n not in _ORGANIC_AND_HALOGEN:
            exotic += 1
    return f, cl, bri, exotic


def estimate_cost_per_kg(mol: Chem.Mol, d: dict) -> tuple[float, list[dict]]:
    """Return (USD/kg estimate, cost-breakdown terms)."""
    f, cl, bri, exotic = _atom_counts(mol)
    fused = max(0.0, d["aromatic_rings"] - 1)  # extra rings in a fused system
    terms = [
        ("Commodity feedstock base", _BASE),
        ("Molecular size", d["heavy_atoms"] * _PER_ATOM),
        ("Aromatic rings (BTX-derived)", d["aromatic_rings"] * _PREMIUM["aromatic_ring"]),
        ("Fused-ring synthesis", fused * _PREMIUM["fused_ring_system"]),
        ("Amide functionalisation", d["amide_groups"] * _PREMIUM["amide_group"]),
        ("Ester functionalisation", d["ester_groups"] * _PREMIUM["ester_group"]),
        ("Stereocentre control", d["stereo_centers"] * _PREMIUM["stereo_center"]),
        ("Fluorination", f * _PREMIUM["fluorine_atom"]),
        ("Chlorination", cl * _PREMIUM["chlorine_atom"]),
        ("Bromine/iodine", bri * _PREMIUM["bromine_iodine_atom"]),
        ("Exotic-atom sourcing", exotic * _PREMIUM["exotic_atom"]),
    ]
    cost = round(sum(v for _, v in terms), 2)
    breakdown = [
        {"factor": name, "usd_per_kg": round(v, 2)} for name, v in terms if v >= 0.05
    ]
    breakdown.sort(key=lambda t: -t["usd_per_kg"])
    return cost, breakdown


def affordability_from_cost(cost_per_kg: float) -> float:
    """Map a USD/kg estimate onto 0-100 where cheaper = higher affordability."""
    span = _EXPENSIVE - _CHEAP
    score = (1.0 - (cost_per_kg - _CHEAP) / span) * 100.0
    return max(0.0, min(100.0, score))
