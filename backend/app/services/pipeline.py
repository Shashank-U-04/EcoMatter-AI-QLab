"""Generation-run orchestrator: GA -> predict -> rank -> retrosynthesis for the
top candidates -> persist. Runs on a worker thread with its own DB session."""
import logging
from datetime import datetime, timezone

from .. import config
from ..database import SessionLocal
from ..models import Candidate, GenerationRun, Prediction, Ranking, SynthesisRoute
from .descriptors import compute_descriptors, mol_from_smiles
from .generation import run_generation
from .prediction import (
    biodegradability_with_solubility,
    compute_real_density,
    lightweight_from_density,
    predict_properties,
)
from .solubility import predict_solubility
from .pubchem import lookup_cid
from .ranking import composite_score, rank_candidates
from .retrosynthesis import plan_route, route_to_json
from .similarity import max_reference_similarity

logger = logging.getLogger(__name__)

ROUTES_FOR_TOP_N = 10
NOVELTY_CHECK_TOP_N = 10  # PubChem lookups only for candidates users open


def execute_run(run_id: int, domain: str, targets: list[dict]) -> None:
    db = SessionLocal()
    try:
        run = db.get(GenerationRun, run_id)
        if run is None:
            return
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()

        def report_progress(gen: int, total: int, best: float, valid: int) -> None:
            run.progress_generation = gen
            run.progress_total = total
            run.progress_best_fitness = round(best, 4)
            run.progress_valid_count = valid
            db.commit()

        raw_candidates = run_generation(domain, targets, progress_cb=report_progress)

        enriched = []
        for item in raw_candidates:
            mol = mol_from_smiles(item["smiles"])
            if mol is None:  # never surface a broken structure
                logger.warning("Discarding invalid generated SMILES: %s", item["smiles"])
                continue
            ref_sim = max_reference_similarity(mol)
            predictions = predict_properties(mol, ref_sim)
            # Upgrade estimates to real computation/ML for the final candidates
            # (too slow to run inside the GA fitness loop).
            density = compute_real_density(mol)
            if density is not None:
                predictions = [
                    lightweight_from_density(density) if p.property_name == "lightweight" else p
                    for p in predictions
                ]
            solubility = predict_solubility(mol)
            if solubility is not None:
                log_s, sol_conf = solubility
                predictions = [
                    biodegradability_with_solubility(compute_descriptors(mol), log_s, sol_conf)
                    if p.property_name == "biodegradability"
                    else p
                    for p in predictions
                ]
            values = {p.property_name: p.value for p in predictions}
            enriched.append(
                {
                    "smiles": item["smiles"],
                    "novelty": item["novelty"],
                    "predictions": predictions,
                    "composite_score": composite_score(values, targets, item["novelty"]),
                }
            )

        ranked = rank_candidates(enriched)

        for item in ranked:
            # Real novelty check: query PubChem only for the top candidates users
            # actually open (bounds API calls; failures return None = unchecked).
            pubchem_cid = None
            if config.PUBCHEM_NOVELTY_ENABLED and item["rank"] <= NOVELTY_CHECK_TOP_N:
                pubchem_cid = lookup_cid(item["smiles"])

            candidate = Candidate(
                run_id=run.id,
                smiles=item["smiles"],
                generation_method="ga-brics-v1",
                novelty_score=item["novelty"],
                pubchem_cid=pubchem_cid,
            )
            db.add(candidate)
            db.flush()
            for p in item["predictions"]:
                db.add(
                    Prediction(
                        candidate_id=candidate.id,
                        property_name=p.property_name,
                        predicted_value=p.value,
                        confidence=p.confidence,
                        model_version=p.model_version,
                    )
                )
            db.add(
                Ranking(
                    candidate_id=candidate.id,
                    composite_score=item["composite_score"],
                    rank=item["rank"],
                )
            )
            if item["rank"] <= ROUTES_FOR_TOP_N:
                route = plan_route(item["smiles"])
                if route is not None:
                    db.add(
                        SynthesisRoute(
                            candidate_id=candidate.id,
                            source_engine=route["source_engine"],
                            route_json=route_to_json(route),
                            estimated_cost=route["estimated_cost"],
                            estimated_yield=route["estimated_yield"],
                            green_chemistry_score=route["green_chemistry_score"],
                            confidence=route["confidence"],
                        )
                    )

        run.status = "completed"
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("Run %s completed with %s candidates", run_id, len(ranked))
    except Exception as exc:
        logger.exception("Generation run %s failed", run_id)
        db.rollback()
        run = db.get(GenerationRun, run_id)
        if run is not None:
            run.status = "failed"
            run.error = str(exc)[:2000]
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
