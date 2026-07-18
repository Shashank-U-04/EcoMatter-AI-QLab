# EcoMatter AI-QLab — Polymerisation Feasibility + Workflow/Hardening PRD

**Version:** 1.0
**Status:** Implemented in this iteration
**Relationship to prior work:** Fourth in the series. Builds on the merged workflow +
legibility work and delivers the first slice of the scientific-credibility program from
`COMPETITION_READINESS_PRD.md`, plus a batch of workflow and hardening improvements.

This is a deliberately-scoped batch. It ships the single highest-value credibility
feature (polymerisation feasibility) end-to-end, plus several quick, safe wins. The
remaining large credibility features are listed as explicit follow-ups in §6 rather than
half-built here.

---

## 1. Product rule and baseline gate (unchanged)

Additive and migration-safe. New API fields are optional/nullable, no existing column,
endpoint, or field name is removed, and no destructive migration runs. The new
`polymerization_assessments` table is created by `create_all` (idempotent on SQLite and
Postgres); no manual patch needed. Gate:

```bash
cd backend && .venv/bin/python -m pytest tests/ -q   # 45 passed
cd ../frontend && npx tsc --noEmit                    # exit 0
```

---

## 2. Feature — Polymerisation feasibility layer (flagship)

The generator emits chemically-valid small molecules, but validity alone doesn't make a
molecule a usable *polymer building block*. This layer answers, for each packaging
candidate: is there a supported step-growth or ring-opening polymerisation family it could
plausibly belong to — and what would it need?

**It is an explainable structural screen, not a reaction predictor and never a
food-safety or synthesis-success claim.**

### 2.1 Classifications
`ab_monomer` (self-polymerising hydroxy-/amino-acid), `ring_opening_monomer` (lactone or
cyclic carbonate), `diacid_comonomer`, `diol_comonomer`, `diamine_comonomer`,
`unsupported` (no supported family), `flagged` (supported chemistry escalated to manual
review by a hazard — halogens or exotic atoms).

### 2.2 Implementation
- `services/polymerization.py` — RDKit SMARTS rules → a deterministic `assess(mol)` dict
  with `classification`, `feasibility_score`, `polymer_family`, `co_monomer_requirement`,
  `supported_reaction_types`, `reasons`, `warnings`, `rule_version`. Every verdict carries
  its human-readable reasons and warnings.
- `models.PolymerizationAssessment` — new table, `candidate_id` UNIQUE.
- **Computed for every candidate during generation** (SMARTS matching is microseconds and
  fully offline — unlike the network novelty check), and **lazily** for pre-existing
  candidates on first candidate-detail load, then persisted.
- API: `CandidateDetail.polymerization` (full object) and compact
  `CandidateSummary.classification` / `polymer_family` for the results-table badge. Both
  optional and tolerated-absent.

### 2.3 UI
- Candidate detail: a "Polymerisation feasibility" panel (classification, family,
  feasibility score, co-monomer need, reactions, reasons, caveats, rule-version footnote).
- Results table: a compact classification badge under each candidate's structure.

### 2.4 Tests
`tests/test_polymerization.py` — every classification, ambiguous/negative cases (mono-acid,
mono-alcohol, alkane, aromatic), hazard escalation to `flagged`, reasons/version presence,
invalid-SMILES → None. The API pipeline test asserts the assessment is attached and the
list badge is present.

---

## 3. Feature — Run history

The backend already exposed `/projects/{id}/runs` but nothing consumed it. The results
page now has a collapsible "Run history" panel listing each past run's status, time,
generation count, and best fitness. Re-runs no longer silently erase the record of prior
attempts. Frontend-only; uses the existing endpoint.

---

## 4. Quick wins

- **Pydantic v2 cleanup** — `class Config` → `model_config = ConfigDict(...)` in
  `schemas.py`, removing the deprecation warnings from every test run.
- **JWT secret hardening** — startup fails fast if `ENVIRONMENT=production` and
  `JWT_SECRET` is still the dev default. Local/dev/tests keep the default.
- **Dashboard quick-delete** — delete a project directly from its dashboard card
  (hover-revealed control with an inline confirm), without opening it.

---

## 5. Migration behavior

- New table auto-created by `create_all`; existing tables untouched.
- New response fields optional with safe defaults → old clients and pre-feature
  candidates/projects load unchanged; assessments backfill lazily on demand.
- The public share snapshot is unchanged (no new fields exposed on public links).

---

## 6. Explicitly deferred (next tranche)

These were requested but are each a substantial effort; they are **not** in this batch and
are called out so nothing looks half-built:

- **India Material Readiness Score + cited evidence dataset** (the other primary
  differentiator) — needs versioned source data, a readiness rubric, and UI.
- **Benchmark / validation dashboard** — cited benchmark set + repeatable evaluator + UI.
- **Route-source classification** (curated template vs. provider vs. BRICS sketch).
- **Toasts / completion notifications**, **clone-a-project**, **richer share page**.
- **Async/background PubChem lookups**, **persistent rate limiting**, **task-queue** for
  generation (production hardening beyond the demo).

---

## 7. Definition of done (this batch)

- [x] Packaging candidates are classified with explicit reasons and warnings, end-to-end.
- [x] Assessment computed at generation and lazily for old candidates; persisted.
- [x] Run history visible in the UI.
- [x] Pydantic warnings gone; JWT hardened for production; dashboard quick-delete.
- [x] Backend 45 tests pass; frontend type-check clean; additive, no destructive migration.
