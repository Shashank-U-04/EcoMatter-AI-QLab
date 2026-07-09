"""Surrogate-guided evolutionary molecule generation (PRD section 5.3).

A genetic algorithm over BRICS fragments: seed molecules relevant to the
chosen domain are decomposed into fragments, recombined and mutated, with the
property predictors acting as the fitness function. RDKit sanitization keeps
every surviving structure chemically valid.
"""
import logging
import random
import time
from typing import Callable

from rdkit import Chem, RDLogger
from rdkit.Chem import BRICS

from .. import config
from .descriptors import compute_descriptors, mol_from_smiles
from .fragments import MUTATION_FRAGMENTS, SEED_MOLECULES
from .prediction import predict_properties
from .similarity import max_reference_similarity

logger = logging.getLogger(__name__)
RDLogger.DisableLog("rdApp.*")  # silence per-molecule sanitization chatter

MIN_MOL_WEIGHT = 90.0
MAX_MOL_WEIGHT = 700.0
MAX_HEAVY_ATOMS = 50


def _is_acceptable(mol: Chem.Mol) -> bool:
    if mol is None:
        return False
    d = compute_descriptors(mol)
    return (
        MIN_MOL_WEIGHT <= d["mol_weight"] <= MAX_MOL_WEIGHT
        and d["heavy_atoms"] <= MAX_HEAVY_ATOMS
    )


def _fragments_of(mol: Chem.Mol) -> list[Chem.Mol]:
    try:
        pieces = BRICS.BRICSDecompose(mol)
    except Exception:
        return []
    frags = []
    for smi in pieces:
        frag = Chem.MolFromSmiles(smi)
        if frag is not None:
            frags.append(frag)
    return frags


def _build_from_fragments(frags: list[Chem.Mol], attempts: int = 8) -> list[Chem.Mol]:
    """Recombine BRICS fragments into whole molecules (a few per call)."""
    if not frags:
        return []
    built = []
    try:
        gen = BRICS.BRICSBuild(frags)
        for _ in range(attempts):
            candidate = next(gen, None)
            if candidate is None:
                break
            try:
                Chem.SanitizeMol(candidate)
            except Exception:
                continue
            if _is_acceptable(candidate):
                built.append(candidate)
    except Exception as exc:  # BRICSBuild can raise on odd fragment sets
        logger.debug("BRICSBuild failed: %s", exc)
    return built


def fitness(mol: Chem.Mol, targets: list[dict]) -> float:
    """Weighted closeness (0-1) of predicted properties to the user's targets.

    targets: [{property_name, target_value (0-100), weight}]
    """
    ref_sim = max_reference_similarity(mol)
    predictions = {p.property_name: p.value for p in predict_properties(mol, ref_sim)}
    total_weight = sum(t["weight"] for t in targets) or 1.0
    score = 0.0
    for t in targets:
        predicted = predictions.get(t["property_name"])
        if predicted is None:
            continue
        closeness = 1.0 - abs(predicted - t["target_value"]) / 100.0
        score += t["weight"] * closeness
    return score / total_weight


def run_generation(
    domain: str,
    targets: list[dict],
    population_size: int | None = None,
    generations: int | None = None,
    max_candidates: int | None = None,
    time_budget_seconds: int | None = None,
    rng: random.Random | None = None,
    progress_cb: Callable[[int, int, float, int], None] | None = None,
) -> list[dict]:
    """Run the GA and return the final deduplicated candidate pool.

    Returns [{smiles, fitness, novelty}] sorted by fitness (best first).
    """
    population_size = population_size or config.GA_POPULATION_SIZE
    generations = generations or config.GA_GENERATIONS
    max_candidates = max_candidates or config.GA_MAX_CANDIDATES
    time_budget = time_budget_seconds or config.GA_TIME_BUDGET_SECONDS
    rng = rng or random.Random()
    deadline = time.monotonic() + time_budget

    seeds = [mol_from_smiles(s) for s in SEED_MOLECULES.get(domain, [])]
    seeds = [m for m in seeds if m is not None]
    fragment_pool = [mol_from_smiles(s) for s in MUTATION_FRAGMENTS]
    fragment_pool = [m for m in fragment_pool if m is not None]

    # --- Initial population: seeds + recombinations of their fragments ---
    population: dict[str, Chem.Mol] = {}

    def _add(mol: Chem.Mol) -> None:
        smi = Chem.MolToSmiles(mol)
        if smi not in population:
            population[smi] = mol

    for seed in seeds:
        if _is_acceptable(seed):
            _add(seed)
    seed_frags = [f for seed in seeds for f in _fragments_of(seed)]
    while len(population) < population_size and time.monotonic() < deadline:
        sample = rng.sample(seed_frags, min(3, len(seed_frags))) if seed_frags else []
        built = _build_from_fragments(sample + rng.sample(fragment_pool, 1))
        for mol in built:
            _add(mol)
        if not built and not seed_frags:
            break

    # --- Evolution loop ---
    scored = {smi: fitness(mol, targets) for smi, mol in population.items()}

    def _report(gen: int) -> None:
        if progress_cb is not None and scored:
            try:
                progress_cb(gen, generations, max(scored.values()), len(population))
            except Exception:  # telemetry must never kill the run
                logger.debug("progress callback failed", exc_info=True)

    _report(0)
    for gen_index in range(generations):
        if time.monotonic() > deadline:
            logger.info("GA time budget reached; returning best-so-far")
            break
        elite = sorted(population, key=lambda s: -scored[s])[
            : max(4, population_size // 4)
        ]
        offspring: list[Chem.Mol] = []
        for _ in range(population_size // 2):
            parent_a = population[rng.choice(elite)]
            parent_b = population[rng.choice(elite)]
            frags = _fragments_of(parent_a) + _fragments_of(parent_b)
            if rng.random() < 0.5 and fragment_pool:  # mutation: inject fragment
                frags.append(rng.choice(fragment_pool))
            if len(frags) > 4:
                frags = rng.sample(frags, 4)
            offspring.extend(_build_from_fragments(frags, attempts=4))
        for child in offspring:
            smi = Chem.MolToSmiles(child)
            if smi not in scored:
                population[smi] = child
                scored[smi] = fitness(child, targets)
        # Survival of the fittest: trim population back down
        survivors = sorted(population, key=lambda s: -scored[s])[:population_size]
        population = {s: population[s] for s in survivors}
        scored = {s: scored[s] for s in survivors}
        _report(gen_index + 1)

    best = sorted(population, key=lambda s: -scored[s])[:max_candidates]
    return [
        {
            "smiles": smi,
            "fitness": round(scored[smi], 4),
            "novelty": round(1.0 - max_reference_similarity(population[smi]), 3),
        }
        for smi in best
    ]
