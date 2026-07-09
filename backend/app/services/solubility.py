"""Inference for the trained aqueous-solubility (logS) model.

Loads the RandomForest trained by ``ml/train_solubility.py`` once at import and
predicts log solubility for any molecule. Confidence is real epistemic
uncertainty: the spread of the individual trees' predictions.

If the model file is absent (e.g. a fresh checkout that hasn't run training),
``predict_solubility`` returns ``None`` and callers fall back to heuristics.
"""
import json
import logging
import warnings
from pathlib import Path

import numpy as np
from rdkit import Chem

from .descriptors import FEATURE_ORDER, feature_vector

logger = logging.getLogger(__name__)

# Readable labels for the descriptor features surfaced in SHAP explanations.
_FEATURE_LABELS = {
    "logp": "Lipophilicity (logP)",
    "mol_weight": "Molecular weight",
    "tpsa": "Polar surface area",
    "oxygen_fraction": "Oxygen content",
    "nitrogen_fraction": "Nitrogen content",
    "aromatic_fraction": "Aromatic content",
    "hydroxyl_groups": "Hydroxyl groups",
    "rotatable_fraction": "Chain flexibility",
    "heavy_atoms": "Molecular size",
    "fraction_csp3": "Saturated-carbon fraction",
    "ring_count": "Ring count",
}

_MODELS = Path(__file__).resolve().parent.parent.parent / "models"
_MODEL_PATH = _MODELS / "solubility_rf.joblib"
_CARD_PATH = _MODELS / "solubility_model_card.json"

_model = None
_model_loaded = False
_model_card: dict | None = None
_explainer = None


def _load() -> None:
    global _model, _model_loaded, _model_card
    if _model_loaded:
        return
    _model_loaded = True
    try:
        import joblib

        _model = joblib.load(_MODEL_PATH)
        _model_card = json.loads(_CARD_PATH.read_text())
        logger.info("Loaded solubility model (test R2=%s)", _model_card.get("test_r2"))
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.warning("Solubility model unavailable (%s); using heuristics only", exc)
        _model = None


def model_card() -> dict | None:
    _load()
    return _model_card


def predict_solubility(mol: Chem.Mol) -> tuple[float, float] | None:
    """Return (logS in log mol/L, confidence 0-1) or None if the model is absent."""
    _load()
    if _model is None:
        return None
    x = np.array([feature_vector(mol)], dtype=float)
    try:
        # sklearn 1.9 + NumPy 2.5 emit an internal DeprecationWarning per tree;
        # it is third-party and harmless, so silence it around the loop.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            per_tree = np.array([tree.predict(x)[0] for tree in _model.estimators_])
    except Exception:
        logger.debug("solubility prediction failed", exc_info=True)
        return None
    log_s = float(per_tree.mean())
    # Tree-to-tree spread (log units) is the model's own uncertainty; tight
    # agreement → high confidence. Typical ESOL std ≈ 0.3–0.9.
    std = float(per_tree.std())
    confidence = max(0.5, min(0.92, 0.95 - std * 0.5))
    return round(log_s, 2), round(confidence, 2)


def solubility_shap(mol: Chem.Mol, top_k: int = 5) -> list[dict]:
    """Real per-molecule SHAP drivers of the trained solubility prediction.

    Returns [{factor, direction, impact}] — the descriptors that most pushed this
    molecule's predicted logS up or down, straight from the trained RandomForest.
    Empty list if the model or SHAP is unavailable.
    """
    global _explainer
    _load()
    if _model is None:
        return []
    try:
        import warnings

        import shap

        if _explainer is None:
            _explainer = shap.TreeExplainer(_model)
        x = np.array([feature_vector(mol)], dtype=float)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            values = _explainer.shap_values(x)[0]
    except Exception:
        logger.debug("SHAP computation failed", exc_info=True)
        return []
    ranked = sorted(zip(FEATURE_ORDER, values), key=lambda t: -abs(float(t[1])))
    out = []
    for name, val in ranked[:top_k]:
        val = float(val)
        if abs(val) < 0.01:
            continue
        out.append({
            "factor": _FEATURE_LABELS.get(name, name.replace("_", " ")),
            "direction": "up" if val >= 0 else "down",
            "impact": round(val, 3),
        })
    return out
