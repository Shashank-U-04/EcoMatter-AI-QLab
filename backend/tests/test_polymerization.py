"""Unit tests for the rule-based polymerisation-feasibility classifier."""
import pytest

from app.services.polymerization import RULE_VERSION, assess_smiles


def cls(smiles: str) -> str:
    result = assess_smiles(smiles)
    assert result is not None
    return result["classification"]


@pytest.mark.parametrize(
    "smiles,expected",
    [
        # AB monomers — one molecule carries both reactive ends.
        ("CC(O)C(=O)O", "ab_monomer"),      # lactic acid (hydroxy-acid)
        ("OCC(=O)O", "ab_monomer"),          # glycolic acid (hydroxy-acid)
        ("NCCCCCC(=O)O", "ab_monomer"),      # 6-aminohexanoic acid (amino-acid)
        # Ring-opening monomers.
        ("O=C1CCCCCO1", "ring_opening_monomer"),  # caprolactone
        ("O=C1OCCO1", "ring_opening_monomer"),     # ethylene carbonate
        # Co-monomers needing a partner.
        ("OC(=O)CCCCC(=O)O", "diacid_comonomer"),  # adipic acid
        ("OC(=O)CCC(=O)O", "diacid_comonomer"),     # succinic acid
        ("OCCO", "diol_comonomer"),                 # ethylene glycol
        ("OCCCCO", "diol_comonomer"),               # 1,4-butanediol
        ("NCCCCCCN", "diamine_comonomer"),          # hexamethylenediamine
        ("NCCN", "diamine_comonomer"),              # ethylenediamine
        # Unsupported — no polymerisable motif.
        ("c1ccccc1", "unsupported"),                # benzene
        ("CCCCCC", "unsupported"),                  # hexane
        ("CC(=O)O", "unsupported"),                 # acetic acid (one acid only)
        ("CCO", "unsupported"),                     # ethanol (one alcohol only)
    ],
)
def test_classification(smiles, expected):
    assert cls(smiles) == expected


def test_hazard_escalates_supported_chemistry_to_flagged():
    # A diacid (supported) carrying a halogen is escalated to manual review.
    result = assess_smiles("OC(=O)CC(Cl)CC(=O)O")
    assert result["classification"] == "flagged"
    assert any("halogen" in w.lower() for w in result["warnings"])


def test_exotic_atom_escalates_to_flagged():
    # A phosphorus-bearing diol is supported chemistry but flagged as exotic.
    result = assess_smiles("OCCP(=O)(O)OCCO")
    assert result["classification"] == "flagged"


def test_every_result_carries_reasons_and_version():
    result = assess_smiles("CC(O)C(=O)O")
    assert result["reasons"], "classification must explain itself"
    assert result["rule_version"] == RULE_VERSION
    assert result["supported_reaction_types"] == ["melt polycondensation"]


def test_supported_candidates_warn_about_lab_validation():
    for smiles in ("CC(O)C(=O)O", "O=C1CCCCCO1", "OC(=O)CCCCC(=O)O"):
        result = assess_smiles(smiles)
        assert any("validation" in w.lower() for w in result["warnings"])


def test_unsupported_has_no_family_and_low_score():
    result = assess_smiles("CCCCCC")
    assert result["polymer_family"] is None
    assert result["feasibility_score"] <= 25


def test_invalid_smiles_returns_none():
    assert assess_smiles("not-a-molecule") is None
    assert assess_smiles("") is None
