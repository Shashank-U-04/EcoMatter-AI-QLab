"""Ranking / multi-objective scoring tests."""
from app.services.ranking import composite_score, rank_candidates


def test_perfect_match_scores_near_hundred():
    targets = [{"property_name": "biodegradability", "target_value": 80, "weight": 1.0}]
    score = composite_score({"biodegradability": 80}, targets, novelty=0.0)
    assert score > 94  # only the small novelty term is missing


def test_far_miss_scores_low():
    targets = [{"property_name": "biodegradability", "target_value": 90, "weight": 1.0}]
    score = composite_score({"biodegradability": 10}, targets, novelty=0.0)
    assert score < 30


def test_rank_assignment_is_descending():
    candidates = [
        {"smiles": "A", "composite_score": 40.0},
        {"smiles": "B", "composite_score": 90.0},
        {"smiles": "C", "composite_score": 65.0},
    ]
    ranked = rank_candidates(candidates)
    assert [c["smiles"] for c in ranked] == ["B", "C", "A"]
    assert [c["rank"] for c in ranked] == [1, 2, 3]
