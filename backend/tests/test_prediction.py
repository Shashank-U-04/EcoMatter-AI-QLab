"""Property predictor behavior tests."""
from app.services.descriptors import mol_from_smiles
from app.services.prediction import PROPERTY_NAMES, predict_properties


def _values(smiles):
    mol = mol_from_smiles(smiles)
    return {p.property_name: p.value for p in predict_properties(mol)}


def test_all_properties_returned_in_range():
    preds = predict_properties(mol_from_smiles("CC(O)C(=O)O"))
    names = {p.property_name for p in preds}
    assert names == set(PROPERTY_NAMES)
    for p in preds:
        assert 0.0 <= p.value <= 100.0
        assert 0.0 <= p.confidence <= 1.0


def test_polyester_scores_more_biodegradable_than_polyethylene():
    lactic = _values("CC(O)C(=O)O")          # ester-forming, degradable
    polyethylene = _values("CCCCCCCCCCCC")    # inert alkane chain
    assert lactic["biodegradability"] > polyethylene["biodegradability"]


def test_aromatic_scores_more_thermally_stable_than_aliphatic():
    aromatic = _values("OC(=O)c1ccc(C(=O)O)cc1")  # terephthalic acid
    aliphatic = _values("OC(=O)CCCCC(=O)O")        # adipic acid
    assert aromatic["thermal_stability"] > aliphatic["thermal_stability"]


def test_halogenation_reduces_biodegradability():
    clean = _values("CCCCCC(=O)O")
    chlorinated = _values("ClC(Cl)CCCC(=O)O")
    assert chlorinated["biodegradability"] < clean["biodegradability"]
