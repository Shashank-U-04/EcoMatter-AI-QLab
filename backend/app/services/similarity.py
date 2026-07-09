"""Tanimoto similarity search against a small local library of known
monomers/materials (stand-in for a PubChem/ChEMBL subset, PRD section 14)."""
import json
from functools import lru_cache

from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator

from ..config import DATA_DIR

_fp_generator = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048)


def fingerprint(mol: Chem.Mol):
    return _fp_generator.GetFingerprint(mol)


@lru_cache(maxsize=1)
def _reference_library() -> list[dict]:
    path = DATA_DIR / "reference_molecules.json"
    entries = json.loads(path.read_text(encoding="utf-8"))
    library = []
    for entry in entries:
        mol = Chem.MolFromSmiles(entry["smiles"])
        if mol is None:
            continue
        library.append({**entry, "fp": fingerprint(mol)})
    return library


def similar_molecules(mol: Chem.Mol, top_k: int = 3) -> list[dict]:
    """Top-k known molecules by Tanimoto similarity, with a one-line note."""
    fp = fingerprint(mol)
    scored = [
        {
            "name": ref["name"],
            "smiles": ref["smiles"],
            "similarity": round(DataStructs.TanimotoSimilarity(fp, ref["fp"]), 3),
            "note": ref["note"],
        }
        for ref in _reference_library()
    ]
    scored.sort(key=lambda r: -r["similarity"])
    return scored[:top_k]


def max_reference_similarity(mol: Chem.Mol) -> float:
    """Highest Tanimoto vs the known library — also used for novelty scoring."""
    fp = fingerprint(mol)
    return max(
        (DataStructs.TanimotoSimilarity(fp, ref["fp"]) for ref in _reference_library()),
        default=0.0,
    )


def novelty_score(mol: Chem.Mol) -> float:
    return round(1.0 - max_reference_similarity(mol), 3)
