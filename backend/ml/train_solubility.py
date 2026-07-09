"""Train a real aqueous-solubility (logS) model on the ESOL/Delaney dataset.

ESOL: 1128 organic molecules with measured log solubility (mol/L). A trained
RandomForest over RDKit descriptors is a legitimate ML surrogate — aqueous
solubility is an established driver of environmental bioavailability and ready
biodegradability, so this model feeds the biodegradability estimate with a real,
data-grounded signal instead of a hand-tuned constant.

Run:  python -m ml.train_solubility
Writes: models/solubility_rf.joblib and models/solubility_model_card.json
"""
import csv
import json
import math
from pathlib import Path

import joblib
import numpy as np
from rdkit import RDLogger
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from app.services.descriptors import FEATURE_ORDER, feature_vector, mol_from_smiles

RDLogger.DisableLog("rdApp.*")

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data" / "raw" / "delaney.csv"
MODELS = BASE / "models"
SMILES_COL = "smiles"
TARGET_COL = "measured log solubility in mols per litre"
RANDOM_STATE = 42


def load_dataset() -> tuple[np.ndarray, np.ndarray]:
    X, y = [], []
    with DATA.open(newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            mol = mol_from_smiles(row[SMILES_COL].strip())
            if mol is None:
                continue
            try:
                target = float(row[TARGET_COL])
            except (KeyError, ValueError):
                continue
            X.append(feature_vector(mol))
            y.append(target)
    return np.array(X, dtype=float), np.array(y, dtype=float)


def main() -> None:
    X, y = load_dataset()
    print(f"Loaded {len(y)} molecules with {X.shape[1]} features.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )
    model = RandomForestRegressor(
        n_estimators=300, max_depth=None, min_samples_leaf=2,
        random_state=RANDOM_STATE, n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    rmse = math.sqrt(mean_squared_error(y_test, preds))
    print(f"Held-out test: R2={r2:.3f}  RMSE={rmse:.3f} log units  (n={len(y_test)})")

    MODELS.mkdir(exist_ok=True)
    joblib.dump(model, MODELS / "solubility_rf.joblib")

    card = {
        "name": "Aqueous solubility (logS)",
        "algorithm": "RandomForestRegressor (300 trees)",
        "dataset": "ESOL / Delaney (1128 molecules, measured log mol/L)",
        "features": FEATURE_ORDER,
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "test_r2": round(float(r2), 3),
        "test_rmse_log_units": round(float(rmse), 3),
        "target_units": "log10(solubility in mol/L)",
    }
    (MODELS / "solubility_model_card.json").write_text(json.dumps(card, indent=2))
    print(f"Saved model + card to {MODELS}")


if __name__ == "__main__":
    main()
