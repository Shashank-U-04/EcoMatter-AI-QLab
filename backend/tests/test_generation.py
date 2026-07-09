"""Generation-engine tests: validity, dedup, and success-metric thresholds."""
import random

from rdkit import Chem

from app.services.generation import run_generation


def _targets():
    return [
        {"property_name": "biodegradability", "target_value": 80, "weight": 2.0},
        {"property_name": "thermal_stability", "target_value": 60, "weight": 1.0},
        {"property_name": "lightweight", "target_value": 70, "weight": 1.0},
    ]


def test_generation_produces_valid_unique_candidates():
    results = run_generation(
        "packaging",
        _targets(),
        population_size=30,
        generations=4,
        max_candidates=20,
        rng=random.Random(7),
    )
    assert len(results) > 0
    smiles = [r["smiles"] for r in results]
    # PRD success metric: >90% valid SMILES.
    valid = [s for s in smiles if Chem.MolFromSmiles(s) is not None]
    assert len(valid) / len(smiles) >= 0.9
    # Deduplicated by canonical SMILES.
    assert len(set(smiles)) == len(smiles)


def test_generation_respects_domain_seeds():
    results = run_generation(
        "ev_component",
        _targets(),
        population_size=20,
        generations=2,
        max_candidates=10,
        rng=random.Random(3),
    )
    assert all(Chem.MolFromSmiles(r["smiles"]) is not None for r in results)
