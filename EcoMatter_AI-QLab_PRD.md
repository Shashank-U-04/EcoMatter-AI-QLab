# EcoMatter AI-QLab
## Product Requirements Document — v1.0 (Build-Ready)
**Samsung Solve for Tomorrow 2026 | Theme: AI Living for India**
**Team size:** 3 | **Build window:** 3–6 weeks | **Skill level:** Upper-intermediate, fast learners

---

## 0. How to Read This Document

Every module below is written to a rule: **if it can't realistically be built by a 3-person team in 3–6 weeks, it's either cut, simplified, or replaced with an existing tool.** That's not a compromise — it's how real materials-discovery labs (and every serious hackathon-winning team) actually operate. Nobody trains a retrosynthesis Transformer from scratch in a month; they orchestrate existing chemistry AI, add a genuinely original layer on top, and prove it on real examples.

Your original PRD draft was a good vision document. The "150–300 page, 10-volume" suggestion you were given elsewhere would take a funded team a year and would not make your prototype any more real — it would just consume the 3–6 weeks you have on documentation instead of building. This document replaces that plan with something you can actually execute.

---

## 1. Executive Summary

**EcoMatter AI-QLab** is an AI-powered inverse materials design platform. A researcher describes the properties they need (e.g. *biodegradable, lightweight, heat-resistant, low-cost*), and the platform:

1. Generates novel candidate molecular structures matching those properties (**Generative Materials Lab** — primary feature)
2. Screens and ranks candidates using fast AI property predictors
3. Recommends a plausible synthesis route for the best candidates (**AI Retrosynthesis Planner** — secondary/supporting feature)
4. Produces an explainable research report

**Why this combination works:** Property → Structure (generation) is the harder, more novel half of the story and your judged differentiator. Structure → Synthesis (retrosynthesis) answers the question judges will ask immediately: *"Ok, you found a molecule — can anyone actually make it?"* Having both, even in simplified form, makes the demo feel like a complete pipeline instead of a single trick.

**"QLab"** signals your future roadmap (quantum-chemistry-ready validation) without requiring you to touch actual quantum hardware or full ab initio DFT for the hackathon — see Section 5.

---

## 2. Problem Statement

Discovering sustainable materials — biodegradable plastics, lightweight EV components, affordable water-purification membranes — takes years of costly trial-and-error lab research. This slows India's shift away from polluting, imported, or expensive materials, at a time when packaging waste, EV adoption, and clean-water access are all urgent, visible problems.

## 3. Solution Overview

A researcher types the properties they need. An AI agent generates candidate molecules, screens them instantly with trained property-prediction models, ranks them on performance/cost/sustainability, and pairs the top candidates with an AI-recommended synthesis route — compressing months of lab trial-and-error into a same-day shortlist of real, makeable material candidates.

## 4. Target Users

Material scientists, chemistry researchers, university labs, and sustainability-focused startups across India developing eco-friendly materials for packaging, EVs, and clean water — plus industrial R&D teams and government research institutes wanting to move from trial-and-error experimentation to AI-assisted innovation without an in-house computational chemistry team.

---

## 5. Scope: The Most Important Section in This Document

### 5.1 What you ARE building (Phase 1 MVP)

| Module | What it does | How (realistic technique) |
|---|---|---|
| Property Designer | User specifies target properties via form (sliders/tags), picks an application domain | React form, no ML needed |
| Generative Engine | Produces 20–50 valid candidate molecules matching the property target | RDKit-based evolutionary/genetic search over molecular fragments, fitness-scored by your property predictors (see 5.3) |
| Property Predictor | Estimates density, thermal stability, biodegradability proxy, cost proxy, etc. for each candidate | Lightweight ML models (Random Forest / Gradient Boosting / small GNN) trained on public datasets, using RDKit descriptors as features |
| Ranking Engine | Sorts/filters candidates by weighted or Pareto score across objectives | Multi-objective scoring function, no exotic optimization needed |
| Retrosynthesis Layer | Given a top candidate, shows a plausible precursor/reaction pathway | API/template integration (IBM RXN for Chemistry and/or RetroRules templates) — **not** trained in-house |
| Molecule Visualization | 2D structure always; 3D optional stretch goal | RDKit → 2D image/SVG; 3Dmol.js for 3D if time allows |
| Explainability Panel | Shows why a candidate ranked well, similar known molecules, feature importance | SHAP values on your own predictor models + Tanimoto similarity search against a small local PubChem/ChEMBL subset |
| Report Export | One-click PDF/CSV of a project's results | `reportlab` or `WeasyPrint`, or the existing docx/pdf skills if generating inside Claude |
| Auth & Projects | Simple login, save/reopen a project | Email/password only; skip OAuth/MFA for MVP |

### 5.2 What you are explicitly NOT building (say this out loud in your pitch — it builds credibility, not doubt)

- ❌ Real laboratory synthesis or validation
- ❌ True ab initio DFT (PySCF/Psi4-grade quantum chemistry) — this alone is a PhD-level, compute-heavy undertaking
- ❌ A retrosynthesis GNN trained from scratch on USPTO — this is genuine multi-month research; you integrate an existing engine instead
- ❌ A novel deep generative model (diffusion/VAE) trained from scratch — you use evolutionary search guided by your own predictors, which *is* legitimate inverse design methodology, just not deep-learning-native
- ❌ Multi-tenant enterprise auth, RBAC, audit logs, Kubernetes, quantum hardware (Qiskit/PennyLane) — all future roadmap, mentioned in the pitch as vision, not built now
- ❌ Full periodic table / arbitrary chemistry — scope your generator to **polymer-like organic molecules** relevant to your two demo scenarios (Section 9)

### 5.3 The Honest Technical Strategy (say this to judges — it's a feature, not a confession)

Real materials-discovery research increasingly works exactly this way: **cheap ML surrogates replace expensive simulations, and existing chemistry AI services get orchestrated rather than rebuilt.** Concretely:

- Instead of running real DFT per candidate (hours per molecule), you train small ML models on datasets where DFT-computed properties already exist (e.g. **QM9**, which contains ~134k small organic molecules with DFT-labelled properties). This is a legitimate "ML surrogate for DFT" — the same idea used in production materials-screening pipelines — just scoped to properties your training data actually supports.
- Instead of training a generative deep model, you run a **genetic algorithm over molecular fragments/SMILES mutations** (add/remove functional groups, swap fragments), using RDKit to keep molecules chemically valid, and your property predictor as the fitness function. This is real, published inverse-design methodology (surrogate-guided evolutionary search), buildable in days, not months.
- Instead of building your own retrosynthesis Transformer, you call an **existing retrosynthesis engine**:
  - **IBM RXN for Chemistry** (`rxn4chemistry` Python wrapper) — free account, molecular-transformer-based retrosynthesis predictions via API.
  - **RetroRules** — an open, template-based reaction database with a documented API (2026 release adds organic-chemistry/USPTO-derived templates on top of biochemical ones) — good as a no-signup-risk fallback or complement.
  - Your original value-add sits **on top** of these: converting their raw output into a ranked, explained, property-aware report tied to *your* generated molecule.

State this strategy plainly in your pitch deck. Judges evaluating a school/youth hackathon are assessing problem understanding, feasibility, and impact — not whether you reinvented a five-year research program in three weeks.

---

## 6. System Architecture

```
┌─────────────────────────────┐
│        Frontend (Next.js)    │
│  Property form → Results →   │
│  Molecule detail → Report    │
└──────────────┬───────────────┘
               │ REST (JSON)
┌──────────────▼───────────────┐
│      Backend API (FastAPI)   │
├───────────────────────────────┤
│ Auth Service                  │
│ Project Service                │
│ Generation Service ──► RDKit + Genetic Algorithm
│ Property Prediction Service ──► Trained ML models (RF/GBM/small GNN)
│ Ranking Service ──► Multi-objective scoring
│ Retrosynthesis Service ──► IBM RXN API / RetroRules API
│ Explainability Service ──► SHAP + similarity search
│ Report Service ──► PDF/CSV/JSON export
└──────────────┬───────────────┘
               │
      ┌────────▼────────┐
      │  PostgreSQL       │  (projects, molecules, predictions, routes)
      └───────────────────┘
      ┌───────────────────┐
      │ Object storage     │  (report files, cached molecule images)
      └───────────────────┘
```

Keep it a **monolith with clean internal service boundaries** (FastAPI routers/modules), not real microservices — Kubernetes, message queues, and service meshes are 2027 problems, not week-3 problems.

---

## 7. Tech Stack (trim from your original list to what you'll actually touch)

| Layer | Use | Skip for MVP |
|---|---|---|
| Frontend | Next.js, React, Tailwind, Chart.js | React Flow, shadcn/ui (nice-to-have only) |
| Backend | FastAPI, PostgreSQL | Celery/Redis (only add if generation truly needs async queuing) |
| Cheminformatics | RDKit (structure validity, descriptors, 2D rendering, fingerprints) | OpenMM, PySCF, Psi4, ASE |
| ML | scikit-learn / XGBoost for property predictors; PyTorch Geometric only if team has bandwidth for a small GNN upgrade | Graphormer, MegaMolBART, diffusion models |
| Retrosynthesis | `rxn4chemistry` (IBM RXN API), RetroRules API | ASKCOS self-hosting (too heavy to stand up in weeks) |
| Visualization | RDKit 2D → SVG/PNG; 3Dmol.js if time allows | Mol*, NGL, Three.js |
| Explainability | `shap`, RDKit Tanimoto similarity | Attention visualization on a from-scratch model |
| Infra | Docker Compose, single cloud VM (or free-tier Render/Railway) | Kubernetes, Terraform, multi-cloud |

---

## 8. Data Sources (only what you'll actually pull data from)

| Dataset | Use in MVP | Access |
|---|---|---|
| **QM9** | Train property predictors (DFT-labelled properties for small organic molecules) | Free, via DeepChem/MoleculeNet loaders |
| **PubChem** | Seed fragment library + similarity search corpus | Free, PUG REST API |
| **ChEMBL** | Optional secondary training/validation data | Free download |
| **USPTO reactions** (via RetroRules templates or IBM RXN's built-in training) | You don't train on this yourself — it's already baked into the retrosynthesis service you call | N/A |

Be upfront in your submission that **polymer-specific mechanical properties (tensile strength, flexibility)** don't have one clean public labelled dataset the way small-molecule quantum properties do — so your predictors for those are **descriptor-based heuristic regressors**, explicitly framed as *directional estimates for screening, not lab-grade values*. This honesty is a strength, not a weakness, in a judged setting.

---

## 9. Two Flagship Demo Scenarios (don't try to demo "generic chemistry" — anchor on these)

1. **Biodegradable food-packaging polymer** — lightweight, heat-resistant enough for hot food, low cost, biodegradable. Directly ties to India's single-use plastic problem.
2. **Lightweight, low-cost EV battery separator/casing material** — ties to India's EV push, a concrete "AI Living for India" story.

Pick these two and make sure the demo runs flawlessly on them. A narrow, working, well-explained demo beats a broad, flaky one every time.

---

## 10. User Journey (MVP)

```
Sign up / log in
      ↓
Create project → choose application domain (packaging / EV material)
      ↓
Define desired properties (sliders + tags: biodegradable, heat-resistant, lightweight, low-cost)
      ↓
Submit → Generation Engine runs (GA + predictor loop, ~30–90 seconds)
      ↓
Ranked candidate list (score, confidence, key properties)
      ↓
Open a candidate → 2D structure, predicted properties, similar known molecules, explanation
      ↓
View recommended synthesis route for that candidate
      ↓
Export PDF/CSV report
```

---

## 11. Core Screens

1. **Landing** — one-liner, "AI Living for India" framing, demo CTA
2. **Dashboard** — list of projects
3. **New Project / Property Input** — domain picker + property sliders/tags + budget constraint
4. **Results / Candidate List** — table/cards, sortable by score, cost, sustainability
5. **Candidate Detail** — 2D structure, property table with confidence, similar molecules, explanation panel, synthesis route
6. **Report / Export**
7. **Settings** (minimal — profile only)

That's 7 screens. Build these well rather than 15 screens half-built.

---

## 12. Simplified Database Schema

```
users(id, name, email, password_hash, org, created_at)

projects(id, user_id, name, domain, created_at)

property_targets(id, project_id, property_name, target_value, weight)

generation_runs(id, project_id, status, started_at, finished_at)

candidates(id, run_id, smiles, generation_method, novelty_score, created_at)

predictions(id, candidate_id, property_name, predicted_value, confidence, model_version)

rankings(id, candidate_id, composite_score, rank)

synthesis_routes(id, candidate_id, source_engine, route_json, estimated_cost,
                  estimated_yield, green_chemistry_score, confidence)

reports(id, project_id, file_path, format, created_at)
```

Ten tables, not a hundred. Every field maps to something you'll actually query in the MVP.

---

## 13. Core API Endpoints

```
POST   /auth/signup
POST   /auth/login

POST   /projects
GET    /projects
GET    /projects/{id}

POST   /projects/{id}/generate        → kicks off GA + prediction loop
GET    /projects/{id}/candidates      → ranked candidate list
GET    /candidates/{id}               → detail: structure, properties, explanation
GET    /candidates/{id}/synthesis     → retrosynthesis route

GET    /projects/{id}/report?format=pdf|csv|json
```

Roughly a dozen endpoints. Add more only if a real screen needs them.

---

## 14. Explainability (kept honest and simple)

For each candidate, show:
- **Confidence score** per predicted property (from your model's own uncertainty/variance)
- **Feature importance** (SHAP) — which molecular descriptors drove the prediction
- **Similar known molecules** — top-3 by Tanimoto fingerprint similarity from your PubChem/ChEMBL subset, with a one-line "why this is similar"
- **Trade-offs** — e.g. "higher heat resistance came at the cost of biodegradability score"

This satisfies the spirit of "Explainable AI Copilot" from your earlier plan without needing attention-visualization on a model you didn't train.

---

## 15. Edge Cases Worth Actually Handling (not an exhaustive wishlist — just what will really occur in a demo)

- Invalid or contradictory property combinations (e.g. "very heat resistant" + "very low cost" + "fully biodegradable" may have few/no good candidates) → show partial matches with trade-off explanation, don't error out
- Generator produces an invalid SMILES → discard silently, log for debugging, never surface broken structures
- No synthesis route found for a candidate → clearly say so, offer the next-best candidate instead
- Generation taking too long → show progress state, cap iterations, return best-so-far
- Duplicate candidates in a run → deduplicate by canonical SMILES

Everything else (GPU failure, cloud interruption, dataset bias at scale) belongs in the "Future Considerations" slide of your pitch deck, not in three weeks of engineering.

---

## 16. Team Split & 3–6 Week Roadmap

**Suggested role split (adjust to actual strengths):**
- **Person A — Backend & ML:** FastAPI, database, property predictors, ranking
- **Person B — Frontend & Visualization:** Next.js UI, 2D/3D molecule rendering, dashboards
- **Person C — Generation & Retrosynthesis:** GA engine, IBM RXN/RetroRules integration, report export, explainability

### Week 1 — Foundations
- Environment setup (RDKit, FastAPI, Next.js scaffolds)
- Pull and clean QM9 subset; define final property list per domain
- Basic auth + project CRUD
- IBM RXN account created and first API call working; RetroRules API tested as backup
- Low-fi UI wireframes for all 7 screens

### Week 2 — Core Engines
- Genetic algorithm generator producing valid candidate molecules (RDKit)
- First property predictor models trained and evaluated (RF/GBM baseline)
- API endpoints for generation + candidates wired to real (not mock) data
- Frontend property-input form functional end-to-end against backend

### Week 3 — Integration
- Ranking/multi-objective scoring live
- Retrosynthesis service integrated into candidate detail view
- 2D molecule visualization rendering in the UI
- Basic error handling for edge cases in Section 15

### Week 4 — Explainability & Reporting
- SHAP feature importance + similarity search
- PDF/CSV/JSON export
- UI polish pass; loading states; empty states
- Both flagship demo scenarios (Section 9) running reliably end-to-end

### Week 5 (if available) — Hardening
- Bug bash across both demo scenarios
- 3D visualization stretch goal if time allows
- Performance pass on generation time
- Draft pitch deck + record demo video

### Week 6 (if available) — Rehearsal Buffer
- Full run-throughs of the live demo
- Judge Q&A prep (rehearse the "why didn't you train your own retrosynthesis model" answer using Section 5.3)
- Final documentation and submission packaging

---

## 17. Success Metrics for the Hackathon Demo

- Time from property submission to ranked candidate list (target: under 2 minutes)
- Number of chemically valid candidates per run (target: >90% valid SMILES)
- At least one candidate per flagship scenario with a complete synthesis route shown
- Report exports successfully in all three formats
- Zero crashes across a full rehearsed demo run

---

## 18. Risks & Honest Mitigations

| Risk | Mitigation |
|---|---|
| Property predictors are inaccurate for polymer-specific properties (no clean labelled dataset) | Explicitly frame as directional/screening-level estimates in UI and pitch; anchor demo on properties QM9-style data actually supports well |
| IBM RXN API access/rate limits during team signup | Set up account in Week 1, not Week 4; keep RetroRules as a working fallback |
| Generative search produces chemically implausible molecules | RDKit validity checks + sanitization on every generated structure; discard invalid ones automatically |
| Scope creep back toward the 150-page plan | This document is the scope. Anything not in Section 5.1 does not get built before submission — park it in "Future Roadmap" (Section 19) |
| Team member skill gaps under time pressure | Role split lets each person go deep in one area; pair up for integration weeks (3–4) rather than all three working solo throughout |

---

## 19. Future Roadmap (mention in pitch, do not build now)

- Fine-tuned or from-scratch generative models (diffusion/GNN) once real training data and compute are available
- True DFT/ab initio validation for shortlisted top candidates only
- Quantum-chemistry-ready pipeline (PennyLane/Qiskit) — the "Q" in QLab
- Expansion beyond polymers: battery electrodes, water-purification membranes, green catalysts, carbon capture materials
- Multi-user collaboration, org accounts, enterprise security
- Wet-lab partnership for physical validation of a top-ranked candidate

---

## 20. Hackathon Application Answers (character-checked, ready to paste)

**Q12 — Problem (300 char limit, currently 248 chars):**
> Discovering sustainable materials — biodegradable plastics, lightweight EV parts, affordable water-purification membranes — takes years of costly trial-and-error lab research, slowing India's shift away from polluting or expensive imported materials.

**Q13 — Solution (500 char limit, currently 425 chars):**
> EcoMatter AI-QLab lets researchers type the properties they need — e.g. biodegradable, lightweight, heat-resistant — and an AI agent generates brand-new candidate molecules. Each is instantly screened by AI property-prediction models, ranked on performance, cost and sustainability, then paired with an AI-recommended synthesis route, turning months of lab trial-and-error into a same-day shortlist of real, makeable materials.

**Q14 — Target audience (500 char limit, currently 468 chars):**
> Built for material scientists, chemistry researchers, university labs and sustainability-focused startups across India who need faster, cheaper ways to discover eco-friendly materials for packaging, EV components, and clean water access. It also serves industrial R&D teams and government research institutes who want to move from years of trial-and-error lab experimentation to AI-assisted material innovation, without needing an in-house computational chemistry team.

**Q15 — Project stage:** Select whichever matches honestly — given you have a full architecture and are about to start building, "Prototype in development" or the closest equivalent option is the accurate answer, not "Idea stage" or "Fully launched."

---

## 21. Deliverables Checklist for Submission

- [ ] Working web app covering the 7 core screens (Section 11)
- [ ] Both flagship demo scenarios running reliably (Section 9)
- [ ] Sample PDF/CSV/JSON report
- [ ] Short pitch deck (problem → solution → demo screenshots → impact → roadmap)
- [ ] 2–3 minute demo video
- [ ] This PRD (or a trimmed one-pager derived from it) as supporting documentation
- [ ] GitHub repo with a clear README (setup instructions, architecture diagram, honest "what's real AI vs. what's an integrated service" note)

---

*This document intentionally stops at "buildable." Anything that would only matter at 300 pages of enterprise scale doesn't belong in a 3–6 week hackathon build — it belongs in Section 19.*
