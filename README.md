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
│      Frontend (Next.js)      │  7 screens: landing, signup, login, dashboard,
│  app router + Tailwind CSS   │  new project, project results/detail, settings
└──────────────┬───────────────┘
               │ REST (JSON, JWT bearer auth)
┌──────────────▼───────────────┐
│     Backend API (FastAPI)    │  monolith with clean router/service boundaries
├──────────────────────────────┤
│ auth        PBKDF2 + JWT     │
│ generation  RDKit genetic algorithm over BRICS fragments
│ prediction  5 descriptor-based property regressors (0–100 scores)
│ ranking     weighted multi-objective scoring vs. target profile
│ retrosynth  local BRICS decomposition; optional IBM RXN API
│ explain     descriptor contributions + Tanimoto similarity to 30 known monomers
│ rendering   RDKit 2D → SVG
│ reports     PDF (reportlab) / CSV / JSON export
└──────────────┬───────────────┘
               │ SQLAlchemy
      ┌────────▼────────┐
      │ SQLite (default) │  10 tables: users, projects, property_targets, runs,
      │ or PostgreSQL    │  candidates, predictions, routes, reports, ...
      └──────────────────┘
```

## What's real AI vs. what's an integrated service (honest note)

- **Real, ours:** the genetic algorithm (surrogate-guided evolutionary search over
  RDKit-validated molecular fragments), the five property predictors, the
  multi-objective ranking, and the explainability layer. The predictors are
  **descriptor-based heuristic regressors** — directional estimates for screening,
  *not* lab-grade values. There is no clean public labelled dataset for polymer
  mechanical properties, so we say so instead of pretending otherwise.
- **Integrated service:** retrosynthesis. By default we run a local RDKit **BRICS
  decomposition** (template-based, no signup). If an `RXN_API_KEY` is provided, the
  backend calls **IBM RXN for Chemistry** (a molecular-transformer engine we did not
  train). Our value-add is converting raw routes into a ranked, explained,
  property-aware report tied to our generated molecules.
- **Not built (deliberately):** lab synthesis/validation, ab initio DFT, from-scratch
  generative deep models or retrosynthesis transformers, quantum hardware. These are
  roadmap, not MVP.

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
.venv/Scripts/python -m pytest tests/ -q   # 13 tests incl. full end-to-end pipeline
```

## API overview

| Method & path | Purpose |
|---|---|
| `POST /auth/signup`, `POST /auth/login` | Create account / get JWT |
| `POST /projects`, `GET /projects`, `GET /projects/{id}` | Project + target profile CRUD |
| `POST /projects/{id}/generate` | Start a generation run (202, background worker) |
| `GET /projects/{id}/runs/latest` | Poll run status |
| `GET /projects/{id}/candidates` | Ranked candidate list |
| `GET /candidates/{id}` | Detail: predictions + explanation |
| `GET /candidates/{id}/synthesis` | Retrosynthesis route |
| `GET /candidates/{id}/image` | 2D structure (SVG) |
| `GET /projects/{id}/report?format=pdf\|csv\|json` | Export report |

## Conventions

- Domains: `packaging` | `ev_component`.
- Property keys: `biodegradability`, `thermal_stability`, `lightweight`, `flexibility`,
  `affordability`. All scores are 0–100; **higher always means more of the named
  quality** (for affordability, higher = cheaper).

## Configuration

All settings are environment variables with demo-safe defaults — see
`backend/.env.example` (database URL, JWT secret, GA population/generations/time budget,
optional `RXN_API_KEY`) and `frontend/.env.example` (`NEXT_PUBLIC_API_URL`).
Set a real `JWT_SECRET` in any shared or deployed environment.
