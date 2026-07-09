"""Molecule rendering: 2D SVG and 3D conformer MOL block via RDKit."""
import logging

from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem.Draw import rdMolDraw2D

logger = logging.getLogger(__name__)


def smiles_to_svg(smiles: str, width: int = 420, height: int = 320) -> str | None:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    options = drawer.drawOptions()
    options.clearBackground = False  # transparent, theme-friendly
    rdMolDraw2D.PrepareAndDrawMolecule(drawer, mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


def smiles_to_molblock_3d(smiles: str) -> str | None:
    """Embed a 3D conformer (MMFF-optimised) and return an MDL MOL block.

    Returns None if the structure is invalid or cannot be embedded.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    mol = Chem.AddHs(mol)
    try:
        if AllChem.EmbedMolecule(mol, randomSeed=42) != 0:
            return None
        AllChem.MMFFOptimizeMolecule(mol)
    except Exception:
        logger.debug("3D embedding failed for %s", smiles, exc_info=True)
        return None
    return Chem.MolToMolBlock(mol)
