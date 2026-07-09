"""RDKit molecular descriptor extraction — the shared feature layer for all
property predictors and explanations."""
from rdkit import Chem
from rdkit.Chem import Crippen, Descriptors, rdMolDescriptors

ESTER = Chem.MolFromSmarts("[CX3](=O)[OX2][#6]")
AMIDE = Chem.MolFromSmarts("[CX3](=O)[NX3]")
HYDROXYL = Chem.MolFromSmarts("[OX2H]")
ETHER = Chem.MolFromSmarts("[OD2]([#6])[#6]")
HALOGEN = Chem.MolFromSmarts("[F,Cl,Br,I]")
CARBONATE = Chem.MolFromSmarts("[OX2][CX3](=O)[OX2]")


def mol_from_smiles(smiles: str) -> Chem.Mol | None:
    """Parse and sanitize; returns None for anything chemically invalid."""
    if not smiles:
        return None
    mol = Chem.MolFromSmiles(smiles)
    return mol


def canonical_smiles(smiles: str) -> str | None:
    mol = mol_from_smiles(smiles)
    return Chem.MolToSmiles(mol) if mol is not None else None


# Fixed feature ordering shared by ML training and inference so a saved model
# always receives its features in the exact order it was trained on.
FEATURE_ORDER = [
    "mol_weight",
    "logp",
    "tpsa",
    "heavy_atoms",
    "rotatable_bonds",
    "rotatable_fraction",
    "ring_count",
    "aromatic_rings",
    "aromatic_fraction",
    "fraction_csp3",
    "hetero_fraction",
    "oxygen_fraction",
    "nitrogen_fraction",
    "ester_groups",
    "amide_groups",
    "carbonate_groups",
    "hydroxyl_groups",
    "ether_groups",
    "halogen_count",
    "exotic_atoms",
    "stereo_centers",
]


def feature_vector(mol: Chem.Mol) -> list[float]:
    """Descriptor values in FEATURE_ORDER — the model input for trained predictors."""
    d = compute_descriptors(mol)
    return [d[name] for name in FEATURE_ORDER]


def compute_descriptors(mol: Chem.Mol) -> dict[str, float]:
    heavy = max(mol.GetNumHeavyAtoms(), 1)
    rot_bonds = rdMolDescriptors.CalcNumRotatableBonds(mol)
    aromatic_atoms = sum(1 for a in mol.GetAtoms() if a.GetIsAromatic())
    hetero = sum(1 for a in mol.GetAtoms() if a.GetAtomicNum() not in (1, 6))
    oxygens = sum(1 for a in mol.GetAtoms() if a.GetAtomicNum() == 8)
    nitrogens = sum(1 for a in mol.GetAtoms() if a.GetAtomicNum() == 7)
    exotic = sum(
        1 for a in mol.GetAtoms() if a.GetAtomicNum() not in (1, 6, 7, 8, 16)
    )

    return {
        "mol_weight": Descriptors.MolWt(mol),
        "logp": Crippen.MolLogP(mol),
        "tpsa": Descriptors.TPSA(mol),
        "heavy_atoms": float(heavy),
        "rotatable_bonds": float(rot_bonds),
        "rotatable_fraction": rot_bonds / heavy,
        "ring_count": float(rdMolDescriptors.CalcNumRings(mol)),
        "aromatic_rings": float(rdMolDescriptors.CalcNumAromaticRings(mol)),
        "aromatic_fraction": aromatic_atoms / heavy,
        "fraction_csp3": rdMolDescriptors.CalcFractionCSP3(mol),
        "hetero_fraction": hetero / heavy,
        "oxygen_fraction": oxygens / heavy,
        "nitrogen_fraction": nitrogens / heavy,
        "ester_groups": float(len(mol.GetSubstructMatches(ESTER))),
        "amide_groups": float(len(mol.GetSubstructMatches(AMIDE))),
        "carbonate_groups": float(len(mol.GetSubstructMatches(CARBONATE))),
        "hydroxyl_groups": float(len(mol.GetSubstructMatches(HYDROXYL))),
        "ether_groups": float(len(mol.GetSubstructMatches(ETHER))),
        "halogen_count": float(len(mol.GetSubstructMatches(HALOGEN))),
        "exotic_atoms": float(exotic),
        "stereo_centers": float(
            len(Chem.FindMolChiralCenters(mol, includeUnassigned=True))
        ),
    }
