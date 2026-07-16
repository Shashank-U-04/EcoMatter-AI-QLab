# EcoMatter AI-QLab

AI-assisted inverse design of sustainable polymer materials. Describe the properties you
need (biodegradability, thermal stability, weight, flexibility, cost), and the system
generates candidate polymer-like molecules, predicts their properties, ranks them against
your targets, proposes synthesis routes, and exports an explained report.

Anchored on two demo scenarios:

1. **Biodegradable food-packaging polymer** — lightweight, heat-resistant, low-cost.
2. **Lightweight, low-cost EV component material** — separator/casing candidates.

## Architecture

```
┌─────────────────────────────┐
│      Frontend (Next.js)      │  10 screens: landing, signup, login, dashboard,
│  app router + Tailwind CSS   │  new-project wizard, results (+ fitness chart),
│                              │  candidate detail, reference library, public share, settings
└──────────────┬───────────────┘
               │ REST (JSON, JWT bearer auth)
┌──────────────▼───────────────┐
│     Backend API (FastAPI)    │  monolith with clean router/service boundaries
├──────────────────────────────┤
│ auth        PBKDF2 + JWT     │
│ generation  RDKit genetic algorithm over BRICS fragments (live progress telemetry)
│ prediction  trained-ML + 3D-computed + cost-model + heuristic (per-property provenance)
│ solubility  RandomForest on ESOL (logS) + SHAP explanations
│ cost        feedstock-cost index from commodity price anchors
│ ranking     weighted multi-objective scoring vs. target profile
│ retrosynth  BRICS disconnection with computed green-chemistry metrics
│ novelty     real PubChem exact-match check
│ explain     feature drivers + SHAP + Tanimoto similarity to 30 known monomers
│ rendering   RDKit 2D → SVG and 3D → MOL block (3Dmol.js viewer)
│ reports     PDF (reportlab) / CSV / JSON export + read-only public share links
│ hardening   per-IP rate limiting, strict input validation, error-message hygiene
└──────────────┬───────────────┘
               │ SQLAlchemy
      ┌────────▼────────┐
      │ SQLite (default) │  10 tables: users, projects, property_targets, runs,
      │ or PostgreSQL    │  candidates, predictions, routes, reports, ...
      └──────────────────┘
```

## What's real vs. estimated (honest note)

Every property carries a **provenance tag** in the UI so nothing is dressed up as
more than it is:

- **Biodegradability — trained ML.** A `RandomForest` trained on the public **ESOL**
  aqueous-solubility dataset (1,128 molecules, measured logS, **test R² = 0.879**)
  feeds a bioavailability signal into the biodegradability estimate. Confidence comes
  from real per-tree variance; **SHAP** (`TreeExplainer`) shows which descriptors drove
  each prediction. Retrain with `python -m ml.train_solubility`.
- **Lightweight — 3D-computed.** Real bulk density from an RDKit 3D van der Waals
  volume (MMFF conformer) with a Kitaigorodskii packing factor — genuine g/cm³, not a
  formula.
- **Affordability — cost model.** A USD/kg feedstock-cost index built from 2024–2025
  commodity price anchors (commodity base + fluorination / exotic-atom / stereocentre /
  fused-ring premiums), shown as a concrete $/kg estimate.
- **Novelty — verifiable.** Every top candidate is checked against **PubChem** (~119M
  compounds); "novel" means a real exact-structure miss, and known compounds link to
  their CID.
- **Retrosynthesis — real metrics only.** RDKit **BRICS** disconnection with
  *computed* green-chemistry metrics: largest-building-block skeleton coverage,
  building-block count, and structural reagent flags. No invented yield/cost numbers.
- **Thermal stability & flexibility — labelled estimates.** Transparent descriptor
  models (aromaticity/ring rigidity; rotatable-bond fraction) — the physically correct
  drivers, honestly marked "estimate" rather than given a false ML badge. (We trained a
  QM9 HOMO-LUMO-gap model but did *not* ship it for thermal stability: electronic gap
  is not a valid decomposition-temperature proxy.)
- **3D structure viewer.** Interactive MMFF-optimised conformer (3Dmol.js).
- **Not built (deliberately):** lab synthesis/validation, ab initio DFT per candidate,
  from-scratch generative deep models, neural retrosynthesis (e.g. AiZynthFinder — a
  future upgrade), quantum hardware. Roadmap, not MVP.

## Prerequisites

- Python 3.11+ (developed on 3.13)
- Node.js 20+ (developed on 22)
- No database server needed — SQLite is the default. Docker is optional.

## Setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # defaults work out of the box
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs — health check: `GET /health`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # points at http://localhost:8000
npm run dev
```

Open http://localhost:3000, sign up, create a project, and hit **Generate**.
A generation run finishes in well under 2 minutes (default budget: 90 s, 30 candidates).

### Tests

```bash
cd backend
.venv/Scripts/python -m pytest tests/ -q   # 18 tests incl. full end-to-end pipeline
```

End-to-end browser tests (Playwright) drive the real signup → generate → detail →
report → share flow against both live servers:

```bash
cd frontend
npx playwright install chromium   # first run only
npm run e2e                        # boots backend + dev server, runs the suite
```

## API overview

| Method & path | Purpose |
|---|---|
| `POST /auth/signup`, `POST /auth/login` | Create account / get JWT |
| `POST /auth/change-password` | Change password (verifies current) |
| `POST /projects`, `GET /projects`, `GET /projects/{id}` | Project + target profile CRUD |
| `PATCH /projects/{id}`, `DELETE /projects/{id}` | Rename / delete a project (cascade) |
| `POST /projects/{id}/generate` | Start a generation run (202, background worker) |
| `GET /projects/{id}/runs`, `GET /projects/{id}/runs/latest` | Run history / poll live progress |
| `GET /projects/{id}/candidates` | Ranked candidate list |
| `GET /candidates/{id}` | Detail: predictions + explanation + novelty |
| `PATCH /candidates/{id}/star` | Toggle shortlist star |
| `GET /candidates/{id}/synthesis` | Retrosynthesis route + green metrics |
| `GET /candidates/{id}/image` | 2D structure (SVG) |
| `GET /candidates/{id}/structure3d` | 3D conformer (MOL block) |
| `GET /projects/{id}/report?format=pdf\|csv\|json` | Export report |
| `POST /projects/{id}/share`, `DELETE /projects/{id}/share` | Mint / revoke a public share token |
| `GET /share/{token}` | Public read-only project snapshot (no auth) |
| `GET /meta/models` | Trained-model cards (algorithm, dataset, test R²) |
| `GET /meta/reference-library` | 30 seed monomers with RDKit descriptors + 2D SVGs |

## Conventions

- Domains: `packaging` | `ev_component`.
- Property keys: `biodegradability`, `thermal_stability`, `lightweight`, `flexibility`,
  `affordability`. All scores are 0–100; **higher always means more of the named
  quality** (for affordability, higher = cheaper).

## Configuration

All settings are environment variables with demo-safe defaults — see
`backend/.env.example` (database URL, JWT secret, GA population/generations/time budget)
and `frontend/.env.example` (`NEXT_PUBLIC_API_URL`). Set a real `JWT_SECRET` in any
shared or deployed environment. Extra toggles:

- `PUBCHEM_NOVELTY=0` — disable the live PubChem novelty check (offline runs).
- `CORS_ORIGINS` — comma-separated allowed origins (the frontend falls back to port
  3001 if 3000 is taken, so include both).
- `RXN_API_KEY` — optional IBM RXN retrosynthesis (unused by default; the local BRICS
  engine with computed green metrics is the standard path).
- `RATE_LIMIT=0` — disable per-IP rate limiting (tests). Tune with
  `RATE_LIMIT_AUTH_PER_MINUTE` (default 15) and `RATE_LIMIT_GENERAL_PER_MINUTE`
  (default 240).

The trained solubility model ships committed under `backend/models/`; retrain it any
time with `python -m ml.train_solubility` from `backend/`.
