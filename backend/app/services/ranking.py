"""Multi-objective ranking: weighted closeness to targets plus a small novelty
bonus, so the shortlist favors molecules that both fit the brief and are not
just re-discovered textbook monomers."""

NOVELTY_BONUS_WEIGHT = 0.05


def composite_score(
    predictions: dict[str, float], targets: list[dict], novelty: float
) -> float:
    """0-100 composite. targets: [{property_name, target_value, weight}]."""
    total_weight = sum(t["weight"] for t in targets) or 1.0
    closeness = 0.0
    for t in targets:
        predicted = predictions.get(t["property_name"])
        if predicted is None:
            continue
        closeness += t["weight"] * (1.0 - abs(predicted - t["target_value"]) / 100.0)
    base = (closeness / total_weight) * 100.0
    return round(base * (1.0 - NOVELTY_BONUS_WEIGHT) + novelty * 100.0 * NOVELTY_BONUS_WEIGHT, 2)


def rank_candidates(candidates: list[dict]) -> list[dict]:
    """Sort by composite score descending and assign 1-based ranks.

    candidates: [{..., composite_score}] — returns new list with 'rank' added.
    """
    ordered = sorted(candidates, key=lambda c: -c["composite_score"])
    return [{**c, "rank": i + 1} for i, c in enumerate(ordered)]
