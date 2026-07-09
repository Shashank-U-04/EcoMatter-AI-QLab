"""2D molecule rendering to SVG via RDKit."""
from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D


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
