"""Seed molecules and fragment pool for the genetic algorithm.

Scoped to polymer-like organic chemistry (PRD section 5.2): monomers and
repeat-unit analogues relevant to biodegradable packaging and lightweight EV
component materials.
"""

# Domain-specific seed molecules (all verified-parseable SMILES).
SEED_MOLECULES = {
    "packaging": [
        "CC(O)C(=O)O",                       # lactic acid (PLA monomer)
        "CC(O)CC(=O)O",                      # 3-hydroxybutyric acid (PHB monomer)
        "OCC(O)CO",                          # glycerol
        "OC(=O)CCCCC(=O)O",                  # adipic acid
        "OCCO",                              # ethylene glycol
        "OC(=O)CCCC(=O)O",                   # glutaric acid
        "O=C1CCCCCO1",                       # caprolactone
        "OC(=O)c1ccc(C(=O)O)o1",             # furan-2,5-dicarboxylic acid (FDCA)
        "CC(=O)OC1OC(CO)C(O)C(O)C1O",        # acetylated sugar fragment
        "OCC1OC(O)C(O)C(O)C1O",              # glucose (cellulose unit)
        "CC(O)C(=O)OC(C)C(=O)O",             # lactide open form (PLA dimer)
        "OCCCCO",                            # 1,4-butanediol (PBS monomer)
        "OC(=O)CCCCCCCCC(=O)O",              # sebacic acid
        "NCCCCCC(=O)O",                      # aminocaproic acid (nylon-6 analog)
    ],
    "ev_component": [
        "OC(=O)c1ccc(C(=O)O)cc1",            # terephthalic acid (PET/aramid unit)
        "Nc1ccc(N)cc1",                      # p-phenylenediamine (aramid unit)
        "OC(=O)c1ccc(C(=O)O)o1",             # FDCA (bio-based aromatic)
        "OCC(C)(C)CO",                       # neopentyl glycol
        "O=C1OCCO1",                         # ethylene carbonate (electrolyte-adjacent)
        "CC(C)(c1ccc(O)cc1)c1ccc(O)cc1",     # bisphenol A (polycarbonate unit)
        "O=C(O)C1CCC(C(=O)O)CC1",            # cyclohexanedicarboxylic acid
        "OCC1CCC(CO)CC1",                    # cyclohexanedimethanol
        "Nc1ccc(-c2ccc(N)cc2)cc1",           # benzidine analog (rigid diamine)
        "OC(=O)CCCCC(=O)O",                  # adipic acid
        "OCCO",                              # ethylene glycol
        "O=c1[nH]c(=O)c2[nH]cnc2[nH]1",      # uric-acid-like heterocycle (flame resist)
    ],
}

# Small building-block fragments used for mutation (attachable groups as SMILES).
MUTATION_FRAGMENTS = [
    "CC(=O)O",        # acetic acid / ester source
    "OCCO",           # glycol
    "NCC(=O)O",       # glycine
    "c1ccoc1",        # furan
    "c1ccccc1",       # benzene
    "CC(C)O",         # isopropanol
    "OCC(O)CO",       # glycerol
    "CCOC(=O)C",      # ethyl acetate
    "CC(O)C(=O)O",    # lactic acid
    "OC(=O)CCC(=O)O", # succinic acid
    "CCO",            # ethanol
    "CN",             # methylamine
    "CO",             # methanol
    "C1CCOC1",        # THF ring
    "O=C1CCCCCO1",    # caprolactone
]
