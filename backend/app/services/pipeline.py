"""Generation-run orchestrator: GA -> predict -> rank -> retrosynthesis for the
top candidates -> persist. Runs on a worker thread with its own DB session."""
import logging
from datetime import datetime, timezone

from ..database import SessionLocal
from ..models import Candidate, GenerationRun, Prediction, Ranking, SynthesisRoute
from .descriptors import mol_from_smiles
from .generation import run_generation
from .prediction import predict_properties
from .ranking import composite_score, rank_candidates
from .retrosynthesis import plan_route, route_to_json
from .similarity import max_reference_similarity

logger = logging.getLogger(__name__)

ROUTES_FOR_TOP_N = 10


def execute_run(run_id: int, domain: str, targets: list[dict]) -> None:
    db = SessionLocal()
    try:
        run = db.get(GenerationRun, run_id)
        if run is None:
            return
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()

        raw_candidates = run_generation(domain, targets)

        enriched = []
        for item in raw_candidates:
            mol = mol_from_smiles(item["smiles"])
            if mol is None:  # never surface a broken structure
                logger.warning("Discarding invalid generated SMILES: %s", item["smiles"])
                continue
            ref_sim = max_reference_similarity(mol)
            predictions = predict_properties(mol, ref_sim)
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
            candidate = Candidate(
                run_id=run.id,
                smiles=item["smiles"],
                generation_method="ga-brics-v1",
                novelty_score=item["novelty"],
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
                        model_version="heuristic-v1",
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
