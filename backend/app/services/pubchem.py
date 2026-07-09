"""Real novelty check against PubChem.

Given a molecule's canonical SMILES, ask PubChem whether it already exists in
their ~100M-compound database. A miss is a genuine, verifiable novelty claim
("this exact structure is not in PubChem"); a hit returns the CID so the UI can
link to the known compound.

Network failures never raise — the caller treats ``None`` as "not checked" so a
PubChem outage can never break a generation run.
"""
import logging

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
_TIMEOUT = 8.0


def lookup_cid(smiles: str) -> int | None:
    """Return the PubChem CID for an exact-structure match.

    - ``0``   → not found in PubChem (novel structure)
    - ``> 0`` → known compound, value is its CID
    - ``None``→ lookup failed / skipped (network error, rate limit, bad input)
    """
    if not smiles:
        return None
    # POST with the SMILES in the body — path-encoding breaks on '/', '#', '\'.
    url = f"{_BASE}/compound/smiles/cids/JSON"
    try:
        resp = httpx.post(url, data={"smiles": smiles}, timeout=_TIMEOUT)
    except httpx.HTTPError as exc:
        logger.debug("PubChem lookup failed for %s: %s", smiles, exc)
        return None
    if resp.status_code == 404:
        return 0  # PubChem returns 404 for some not-found queries
    if resp.status_code != 200:
        logger.debug("PubChem returned %s for %s", resp.status_code, smiles)
        return None
    try:
        cids = resp.json()["IdentifierList"]["CID"]
    except (KeyError, ValueError):
        return None
    if not cids:
        return 0
    # PubChem yields [0] when the structure has no match.
    return int(cids[0])
