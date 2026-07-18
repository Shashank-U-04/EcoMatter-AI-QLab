# EcoMatter AI-QLab — Competition Readiness Implementation PRD

**Version:** 1.0  
**Status:** Build-ready implementation plan  
**Owner:** EcoMatter AI-QLab team  
**Primary competition use case:** AI-assisted discovery of biodegradable food-packaging polymer building blocks for India  
**Time horizon:** 3 focused implementation weeks, followed by validation and rehearsal  
**Product rule:** Improve scientific trust and India-specific impact without regressing the existing end-to-end application.

---

## 1. Purpose and decision

EcoMatter already has a working deployed prototype: property input, RDKit-based genetic search, candidate ranking, 2D/3D structure views, explainability, synthetic-feasibility output, reports, authentication, project persistence, public sharing, and a FastAPI/Next.js deployment.

The next phase is **not** to add more generic platform features. It is to turn the prototype into a credible, evidence-led sustainable-materials product for a Samsung Solve for Tomorrow pitch.

The product must move from this broad claim:

> “AI generates sustainable polymer materials.”

to this precise and defensible claim:

> “EcoMatter helps Indian packaging researchers shortlist polymerizable, sustainable molecular building blocks. It combines surrogate screening, polymerisation-feasibility checks, India-specific supply and end-of-life constraints, and cited evidence. It is a research-screening tool, not a laboratory validation system.”

This distinction is mandatory. The current generator produces **small molecules, monomers, and repeat-unit analogues**; it does not simulate finished bulk polymers or certify product safety.

---

## 2. Current baseline to preserve

All work in this PRD is additive or explicitly migration-safe. The following workflows are release-blocking and must continue to work unchanged throughout development.

### 2.1 Existing user workflows

1. A user can sign up and log in with email/password.
2. A user can use Firebase/Google login when Firebase environment variables are configured.
3. A user can create a project in either current domain:
   - `packaging`
   - `ev_component`
4. A user can set all five current target properties:
   - `biodegradability`
   - `thermal_stability`
   - `lightweight`
   - `flexibility`
   - `affordability`
5. A project generation run returns ranked, chemically valid candidates.
6. A candidate detail page loads structure, predictions, explanation, similar molecules, cost estimate, 2D rendering, optional 3D structure, and a synthesis output when available.
7. A user can star candidates, regenerate a project, rename/delete a project, share read-only results, and export PDF/CSV/JSON reports.
8. Existing public share links continue to render old projects without requiring new database fields.

### 2.2 Existing interfaces that must not break

- `POST /projects/{id}/generate`
- `GET /projects/{id}/candidates`
- `GET /candidates/{id}`
- `GET /candidates/{id}/synthesis`
- `GET /projects/{id}/report?format=pdf|csv|json`
- Existing frontend routes and local-storage session keys
- Existing SQL tables and their stored records

### 2.3 Baseline verification gate

Before any feature branch is merged, run:

```bash
cd backend
.venv/bin/python -m pytest tests/ -q

cd ../frontend
npm run build
```

All existing backend tests must pass. The production frontend build must complete. A feature that improves one score but breaks report export, generation, authentication, or existing shared links is rejected.

### 2.4 Explicit non-goals for this phase

Do **not** build the following until this PRD is complete and validated:

- MFA, enterprise RBAC, audit logs, notifications, organisations, or collaboration workspaces.
- New application domains beyond packaging and the retained EV demo.
- Laboratory automation, DFT, molecular dynamics, quantum computing, or a from-scratch GNN/diffusion model.
- A claim of food-contact compliance, toxicity certification, compostability certification, clinical/scientific validation, or manufacturing readiness.
- A live price scraper or a dependency on external APIs during the judged demo.
- A UI redesign that changes the existing successful user flow without a user need.

---

## 3. Product scope and target user

### 3.1 Primary user

**Packaging material researcher or early-stage packaging startup in India** evaluating biodegradable alternatives to common single-use food packaging.

They need a quick, transparent answer to:

> “Which polymerisable building blocks should I investigate first if I care about biodegradability, usable heat performance, low weight, low cost, Indian feedstock availability, and a credible disposal route?”

### 3.2 Narrow flagship scenario

**Biodegradable hot-food packaging film/container.**

The product must use this scenario for the primary demo, benchmark, report template, pitch narrative, and evidence dataset. The EV scenario remains functional as an existing exploratory demo, but is not expanded in this implementation phase.

### 3.3 Required user outcome

Within two minutes of starting a run, the user receives a shortlist that states, for every candidate:

1. Whether it is a polymerisable building block and why.
2. Its likely polymerisation family or a clear reason it is unsupported.
3. Its existing five screening scores and the provenance of each score.
4. Its source-backed India Material Readiness Score.
5. Its actual PubChem status when checked; otherwise, an explicit “not checked” label.
6. What evidence supports the candidate and what remains unvalidated.
7. A synthesis/assembly output whose source and confidence are unambiguous.

---

## 4. Goals, measurable success criteria, and release gates

### 4.1 Product goals

| ID | Goal | Release evidence |
|---|---|---|
| G1 | Eliminate scientifically misleading labels and claims. | Claim audit checklist is complete; UI, README, report, and pitch use the approved language. |
| G2 | Ensure packaging results are relevant to polymer development. | At least 90% of the top-10 packaging results have a polymerisation classification or are visibly marked unsupported. |
| G3 | Make Indian relevance measurable instead of decorative. | Every packaging readiness score uses versioned, cited India-relevant source data or is marked unavailable. |
| G4 | Demonstrate transparent evidence quality. | A benchmark dataset and evaluation report are shipped and exposed in the app. |
| G5 | Preserve user trust and product reliability. | Existing tests and build pass; a full hosted demo succeeds twice consecutively without manual code changes. |

### 4.2 Competition success criteria

The project must make it easy to answer the following judging questions in under 30 seconds each:

| Judge question | Required product/pitch proof |
|---|---|
| What real Indian problem are you solving? | One packaging-waste user story, a cited scale indicator, and a clearly named beneficiary. |
| What is actually innovative? | India Material Readiness Score and polymerisation-aware inverse screening, not merely a generic chat or API wrapper. |
| Is the AI real and honest? | Model card, provenance tags, benchmark page, uncertainty labels, and no overclaiming. |
| Can it be built and adopted? | Narrow workflow, cached local evidence, partner feedback, and a practical next validation step. |
| Can it scale? | Reusable source schema, modular rules, API contracts, and a documented expansion path. |

### 4.3 Release gate definitions

- **Gate A — Claim integrity:** all user-visible labels are accurate even when external services are absent.
- **Gate B — Polymer relevance:** generator output is classified and ranked without silently discarding all existing valid candidates.
- **Gate C — Evidence:** benchmark data and citations are present, versioned, and rendered.
- **Gate D — Demo readiness:** hosted flow works from signup through report export using a stable, cached test profile.
- **Gate E — Pitch readiness:** deck, demo script, sample report, limitations, and validation plan match the deployed product exactly.

No later gate can be declared complete while an earlier gate is incomplete.

---

## 5. Terminology and mandatory claim language

### 5.1 Approved terminology

| Use this | Do not use unless evidence changes |
|---|---|
| candidate molecular building block | discovered polymer material |
| polymerisation feasibility screening | manufacturable or production-ready |
| descriptor/physics-based screening estimate | laboratory measurement |
| trained aqueous-solubility model | trained biodegradability model |
| source-backed cost range/index | market quote or exact production cost |
| PubChem exact-match status | novel molecule, unless PubChem returned an exact miss |
| synthetic-feasibility sketch | validated synthesis route |
| evidence gap / requires lab validation | safe, food-safe, certified compostable |

### 5.2 Existing model provenance rules

The app currently contains one trained model: a Random Forest for measured ESOL aqueous solubility. It contributes one signal to biodegradability screening. Thermal stability and flexibility remain descriptor-based directional estimates; lightweight uses an RDKit 3D density calculation for final candidates; affordability uses a cost index.

Requirements:

1. Every predicted property must keep its current provenance tag.
2. A page, report, or pitch must never call all five scores “ML predictions.”
3. The candidate detail page must add a compact “What this means” explanation for each tag.
4. The landing-page footer and README must be corrected to say “surrogate-guided screening” rather than “property screening is original ML.”
5. Any new property requires a documented dataset, unit, method, uncertainty treatment, and benchmark before it can appear as a numeric score.

---

## 6. Feature 1 — Claim integrity and novelty semantics

### 6.1 Problem

The current `novelty_score` is calculated as `1 - max Tanimoto similarity` against a local reference library. This is useful as chemical distance, but it is not proof that the molecule is novel. A separate PubChem lookup provides an actual exact-match result for selected candidates.

### 6.2 User requirements

On every candidate card and detail page, the user must see two separate concepts:

1. **Reference-library distance** — how structurally different the candidate is from the local reference set; value is 0–100.
2. **PubChem exact-match status** — one of:
   - `Known in PubChem` with CID and outbound link
   - `No exact PubChem match found` only when the lookup returns `0`
   - `Not checked` when the lookup was skipped or failed

### 6.3 Backward-compatible data and API rules

1. Keep database column `candidates.novelty_score` unchanged for existing records.
2. Treat that field as the legacy storage for reference-library distance.
3. Keep API field `novelty_score` for old frontend clients, but mark it deprecated in API documentation.
4. Add an additive field `reference_distance_score` to `CandidateSummary` and `CandidateDetail`; initially it mirrors `novelty_score * 100` or follows one consistently documented scale.
5. Do not add a boolean `is_novel`; PubChem lookup failure must remain distinguishable from an exact miss.
6. Add `pubchem_status` with values `known`, `no_exact_match`, `not_checked` to response objects. It is derived from the existing nullable `pubchem_cid` field.

### 6.4 UI requirements

- Replace table label “Novelty” with “Reference distance.”
- Add an info tooltip: “Distance from EcoMatter’s local reference library; not a novelty claim.”
- On detail page, render PubChem status separately from reference distance.
- Reports must use the same terms. Existing exported field names may remain for machine compatibility but must include a `field_notes` section.
- The pitch must only use “new-to-PubChem exact structure” for an actual exact miss and must state lookup date.

### 6.5 Acceptance criteria

- A known PubChem compound cannot be displayed as “novel” solely because it has a high reference distance.
- A failed lookup cannot be displayed as “no exact match found.”
- Existing candidate-list API tests remain green.
- CSV, JSON, PDF, candidate detail, share page, and project table all use consistent labels.

---

## 7. Feature 2 — Polymerisation feasibility layer

### 7.1 Problem

The current generator produces valid small molecules from BRICS fragments. Chemical validity alone does not prove that a molecule is an appropriate precursor for a polymer material. Packaging results must therefore be assessed for polymerisation relevance before they are presented as high-priority building blocks.

### 7.2 Scope

This feature is a **rule-based, explainable feasibility classifier** for the packaging domain. It is not a reaction predictor and does not certify synthesis success.

### 7.3 Required classifications

Each packaging candidate must receive exactly one primary classification:

| Code | Meaning | Minimum structural condition |
|---|---|---|
| `ab_monomer` | Single molecule can potentially self-polymerise by condensation. | Complementary reactive groups, such as hydroxy-acid or amino-acid motif. |
| `ring_opening_monomer` | Ring can potentially undergo ring-opening polymerisation. | Supported strained/cyclic ester or carbonate pattern. |
| `diacid_comonomer` | Needs a complementary diol/diamine co-monomer. | At least two carboxylic-acid groups. |
| `diol_comonomer` | Needs a complementary diacid/diisocyanate co-monomer. | At least two suitable hydroxyl groups. |
| `diamine_comonomer` | Needs a complementary diacid/diacyl partner. | At least two amine groups. |
| `unsupported` | Valid molecule but no supported packaging polymerisation family. | No rule matches. |
| `flagged` | Supported chemistry is overridden by a safety/complexity concern. | Hazard/complexity rule requires manual review. |

### 7.4 Required rules and safeguards

1. Implement RDKit SMARTS patterns in a dedicated `polymerization.py` service.
2. Store rule identifiers and human-readable reasons; do not return only an opaque score.
3. Detect at minimum carboxylic acids, alcohols, amines, lactones, cyclic carbonates, amides, ester linkages, aromatic rings, halogens, and unsupported/exotic atoms.
4. Add warnings for halogenated candidates, heavily aromatic candidates, unreasonably high functionality, exotic atoms, and ambiguous functional-group counts.
5. Do not infer food safety from any structural rule.
6. If a candidate is `unsupported`, preserve it in results but do not elevate it because of a readiness score.
7. If filtering leaves fewer than ten packaging candidates, return the best valid existing candidates with an explicit “unsupported for current polymerisation rules” label. Generation must never fail simply because the classifier is conservative.

### 7.5 Polymerisation assessment response contract

Add an optional object to candidate detail and a compact summary to list items:

```json
{
  "classification": "ab_monomer",
  "feasibility_score": 82,
  "polymer_family": "aliphatic polyester",
  "co_monomer_requirement": "none",
  "supported_reaction_types": ["melt polycondensation"],
  "reasons": ["Contains one hydroxyl and one carboxylic-acid group"],
  "warnings": ["Requires laboratory validation of molecular-weight build-up"],
  "rule_version": "polymer-feasibility-v1"
}
```

All fields must be optional in API schemas so shared projects and candidates generated before migration still load.

### 7.6 Data persistence

Create a new table rather than altering candidate semantics:

```text
polymerization_assessments(
  id, candidate_id UNIQUE, classification, feasibility_score,
  polymer_family, co_monomer_requirement, reasons_json,
  warnings_json, rule_version, created_at
)
```

Database migration requirements:

1. Use an idempotent schema patch in the existing database migration mechanism.
2. Never rebuild, drop, or rename current tables.
3. Existing rows receive no forced backfill during deployment; assess lazily when a candidate is requested or report is generated, then persist the result.
4. The migration must work on SQLite and Render PostgreSQL.

### 7.7 Ranking behavior

The existing `composite_score` is preserved exactly as the **Research Fit Score**. It continues to rank property-target closeness plus existing reference distance.

Add a separate **Material Readiness Score**. Do not silently change the default ranking algorithm in the first release.

Formula for v1:

```text
Material Readiness Score =
  0.50 × Research Fit Score
  0.25 × Polymerisation Feasibility Score
  0.15 × India Feedstock Score
  0.10 × Evidence Quality Score
```

Score handling rules:

- Missing evidence produces `null`, not a fabricated zero.
- If any prerequisite is `null`, display “insufficient evidence” rather than a misleading composite score.
- The results page defaults to Research Fit Score until benchmark Gate C passes.
- After Gate C, provide a user-controlled sort: `Research fit` or `Material readiness`.

### 7.8 Acceptance criteria

- Unit tests cover every classification and at least two negative/ambiguous cases per classification.
- Top packaging results display a classification, explanation, and warning state.
- Existing EV behavior remains unchanged except for additive fields.
- Current generation tests and full pipeline tests pass.
- A generated report includes polymerisation assessment only when present.

---

## 8. Feature 3 — India Material Readiness Score and cited evidence

### 8.1 Product intent

This is the team’s primary differentiator. It converts a generic chemistry score into a practical Indian packaging-screening decision. It must be evidence-led; unsupported values must visibly remain unknown.

### 8.2 Required score dimensions

| Dimension | Meaning | Input type | Do not claim |
|---|---|---|---|
| Polymerisation feasibility | Whether a supported polymerisation family is structurally plausible. | Rule-based assessment | Successful synthesis or industrial process. |
| India feedstock availability | Whether plausible feedstock/co-monomer categories have India-relevant availability evidence. | Curated cited dataset | Guaranteed procurement. |
| Cost evidence | Directional INR/kg input range, dated and sourced. | Curated range with source | Exact price, quote, or margin. |
| End-of-life fit | Compatibility with a stated disposal context, such as industrial composting or recycling research. | Curated evidence and limitation | Home compostability or certification. |
| Evidence quality | Completeness, recency, source quality, and applicability of records. | Deterministic rubric | Scientific proof of performance. |

### 8.3 Data source requirements

Create version-controlled source data under:

```text
backend/data/evidence/
  sources.json
  feedstock_profiles.json
  end_of_life_profiles.json
  benchmark_materials.json
  README.md
```

Each source record must contain:

```json
{
  "id": "source-unique-id",
  "title": "Human-readable title",
  "publisher": "Organisation or journal",
  "url": "https://...",
  "published_date": "YYYY-MM-DD or null",
  "accessed_date": "YYYY-MM-DD",
  "geography": "India | Global | State/region",
  "source_type": "government | standards body | peer-reviewed | supplier | industry report",
  "quality_tier": "A | B | C",
  "notes": "Scope and limitations"
}
```

Rules:

1. Every number shown to a user must reference at least one source ID.
2. Source data must state units and date. Convert cost data to INR/kg using a documented conversion record, not a live API.
3. Sources older than 24 months must display “may be stale.”
4. Supplier pricing can be a range/reference only and must not be represented as an India-wide market price.
5. If a candidate is connected only by a chemical-family inference, show “family-level evidence,” not candidate-specific evidence.
6. Never scrape or make a network call inside a generation request. All demo data must be local, cached, and versioned.

### 8.4 Evidence quality rubric

Use the following deterministic score only when at least one evidence record exists:

| Criterion | Points |
|---|---:|
| At least one source has quality tier A | 30 |
| India-specific or India-applicable source exists | 25 |
| Source is less than 24 months old | 15 |
| Exact material/monomer match instead of family inference | 20 |
| Source includes a stated measurement method or range | 10 |

Maximum: 100. Return `null` when no evidence exists. Show the raw reasons behind the score.

### 8.5 Feedstock and end-of-life matching

Implement curated family-level mappings, not false molecule-level certainty. Example categories may include:

- lactic-acid/lactide family
- succinate/adipate/diol aliphatic polyester family
- FDCA-based polyester family
- cellulose/starch-derived packaging additive family

Each mapping must include:

- matching rule or reference family
- possible Indian feedstock route
- source IDs
- applicability limitation
- end-of-life context
- manual-review flags

### 8.6 UI requirements

Add an **Evidence & India readiness** section to candidate detail. It contains:

1. A Material Readiness Score or “Insufficient evidence.”
2. The five dimensions with brief reasons.
3. Source links with publisher, geography, date, and quality tier.
4. A prominent limitations box.
5. A plain-language next validation step, e.g. “Confirm polymerisation experimentally with a packaging chemistry lab.”

Add a compact readiness badge on candidate rows only after the candidate assessment is available. Do not crowd the current results table; use a tooltip or an expandable column on smaller screens.

### 8.7 API requirements

Add additive endpoints:

```text
GET /candidates/{id}/readiness
GET /candidates/{id}/evidence
GET /meta/evidence/sources
GET /meta/benchmarks
```

`GET /candidates/{id}` may embed the readiness object for convenience, but the page must tolerate it being absent.

### 8.8 Acceptance criteria

- Every displayed readiness number has a local, versioned source trail.
- Offline/local generation remains fully functional.
- A candidate with no evidence never receives a deceptive high readiness score.
- Exported JSON includes source IDs and source version; PDF includes a human-readable evidence appendix.
- At least five material-family evidence profiles are present before demo release.

---

## 9. Feature 4 — Scientific benchmark and validation dashboard

### 9.1 Problem

The existing solubility model has a held-out ESOL test result, but this does not validate the product’s thermal stability, flexibility, affordability, polymerisation feasibility, or full biodegradability output. Judges need to see what is validated, what is directional, and how the team tests its own assumptions.

### 9.2 Required benchmark dataset

Create a small, cited benchmark of at least 12 known packaging-relevant materials or monomer systems. Suggested starting set:

- PLA/lactic-acid family
- PHA/PHB family
- PBS/succinate family
- PCL/caprolactone family
- PEF/FDCA family
- PET/terephthalate family as a non-biodegradable comparison
- cellulose-derived packaging reference
- starch-derived packaging reference

Each record must distinguish a polymer, a monomer, and a family. Never attach polymer measurements directly to a monomer without an explicit family-level note.

### 9.3 Required benchmark fields

```text
id
name
material_level: polymer | monomer | family
canonical_smiles_or_null
polymer_family
application_context
actual_density_g_cm3_range_or_null
thermal_metric_name_and_range_or_null
biodegradation_context_or_null
cost_context_inr_per_kg_range_or_null
source_ids
applicability_notes
```

### 9.4 Evaluation methodology

1. Freeze the benchmark source-data version before evaluation.
2. Separate model-development examples from evaluation examples whenever enough data exists.
3. For small datasets, report qualitative agreement and rank correlation; do not invent robust ML accuracy claims from 12 records.
4. Evaluate each output only against a compatible real-world metric.
5. Density may be compared numerically when molecular representation is suitable.
6. Thermal stability must not be called a decomposition temperature unless validated against matching labels.
7. Cost and biodegradation evaluations must use ranges/categories and source context, not a misleading MAE.
8. Publish failures and gaps. A transparent “not enough comparable labels” result is acceptable.

### 9.5 Dashboard requirements

Create a `Validation` or `Evidence` view accessible from the reference library or candidate page. It must show:

- model/proxy card and what it predicts
- dataset/source size
- evaluation methodology
- compatible metric
- latest result or “not validated yet”
- known limitations
- benchmark version and source links

The ESOL Random Forest model card remains visible, including its training size, held-out R², and RMSE. It must be labelled as an aqueous-solubility model, not a direct biodegradability model.

### 9.6 Release thresholds

The team must not set arbitrary targets after seeing results. Before evaluation, define thresholds in `backend/data/evidence/README.md`.

Suggested initial gates:

- Density: report MAE only when at least eight chemically comparable examples exist; target is an improvement over the existing naive density proxy.
- Ranking: report Spearman rank correlation only when at least ten comparable ordered records exist; target is positive correlation and a documented error analysis.
- Polymerisation classifier: manually review at least 20 labelled examples; target at least 90% agreement with the team’s rulebook and 100% explanation coverage.
- Every visualised benchmark result must show sample size and evaluation date.

### 9.7 Acceptance criteria

- Benchmark source files, evaluator script, result JSON, and rendered UI are committed together.
- Re-running the evaluator produces the same results from the same versioned dataset.
- No benchmark card displays a result without methodology and limitations.
- Reports include a one-page validation summary or a link/QR code to the hosted validation page.

---

## 10. Feature 5 — Synthesis output truthfulness and reliability

### 10.1 Current behavior to preserve

The current local fallback uses RDKit BRICS disconnection and computed structural metrics. IBM RXN integration is optional and activated only when its API key is configured.

### 10.2 Required output types

The product must distinguish three route types:

| Route type | Source | User-facing label |
|---|---|---|
| `curated_polymerization_template` | Versioned team-curated template for a supported family | Polymerisation feasibility template |
| `provider_predicted_route` | IBM RXN or approved external engine | Provider-predicted retrosynthesis route |
| `screening_disconnection` | Local RDKit BRICS output | Structural disconnection sketch |

### 10.3 Functional requirements

1. Create a `RouteProvider` interface so route sources do not leak into UI logic.
2. Store route type, provider, timestamp, source/version, limitations, and timeout/fallback reason.
3. For packaging candidates with a supported polymer family, prefer a curated polymerisation feasibility template over a generic BRICS text description.
4. A template may state only broad reaction family and conditions class; it must cite source material and show “requires laboratory optimisation.”
5. Provider calls must have strict timeout, one retry at most, and a local fallback.
6. Do not perform provider calls in the critical first render of the candidate page.
7. Cache provider results by canonical SMILES and route provider/version.
8. Never fabricate yield, safety score, reagent availability, or exact cost when the source does not provide it.

### 10.4 UI requirements

The route panel must show a source banner, for example:

> Structural disconnection sketch — generated locally with RDKit BRICS. It identifies possible building-block cuts; it is not an experimentally validated synthesis procedure.

or:

> Polymerisation feasibility template — family-level guidance based on cited references. Conditions require laboratory optimisation.

### 10.5 Acceptance criteria

- Route source is visible in UI, PDF, CSV/JSON metadata, and share page.
- A provider outage returns a usable local response within the configured timeout.
- Existing candidates with BRICS routes still render.
- No footer, report, or pitch states that all routes are AI-retrosynthesis predictions.

---

## 11. Feature 6 — Demo reliability and performance hardening

### 11.1 Problem

The generation pipeline currently may perform up to ten serial PubChem requests. A slow or unavailable external service can delay the finished run and make a live demonstration unpredictable.

### 11.2 Requirements

1. Generation must return ranked candidates without waiting on external novelty services.
2. PubChem lookups must run after initial persistence, asynchronously or on demand, with bounded concurrency and caching.
3. Candidate list must display `Not checked` until an exact-match lookup completes.
4. Add a demo configuration profile with:
   - deterministic random seed
   - local evidence data only
   - known time budget
   - optional precomputed sample project
5. Preserve normal user generation; demo mode must be an explicit environment variable or documented sample flow, never a hidden mock.
6. Add a `/health/ready` endpoint that verifies database reachability, model availability, and local evidence files without performing external calls.
7. Add hosted smoke-test steps for frontend, API health, login, a generation run, candidate detail, report export, and public share link.

### 11.3 Performance targets

| Step | Target | Failure behavior |
|---|---:|---|
| Project creation | under 2 seconds | show actionable API error |
| Initial generation result | under 90 seconds on deployed demo configuration | return best-so-far candidates by time cap |
| Candidate detail first load | under 4 seconds without external call | render core data and lazy-load optional sections |
| Report export | under 10 seconds | retryable error; no corrupt download |
| PubChem exact-match check | background/on-demand; max 8 seconds per request | `Not checked`, never block a result |

### 11.4 Acceptance criteria

- The full hosted demo is rehearsed twice with no manual database manipulation.
- Disabling external network access does not prevent generation, ranking, reports, or polymerisation assessment.
- All error states are understandable to a non-technical judge.

---

## 12. UI, UX, accessibility, and reporting requirements

### 12.1 Existing screens to retain

Landing, signup, login, dashboard, new project wizard, results, candidate detail, library, share page, and settings remain supported.

### 12.2 Required UI additions

| Screen | Addition | Priority |
|---|---|---|
| Landing | Accurate one-sentence scope; no broad unsupported ML claim. | P0 |
| New Project | Mark packaging as the flagship evidence-backed scenario; retain EV. | P1 |
| Results | Rename novelty; show compact polymerisation/readiness state. | P0 |
| Candidate Detail | Add Polymerisation Feasibility and Evidence & India Readiness panels. | P0 |
| Library/Validation | Add benchmark, sources, methodology, model cards, limitations. | P0 |
| Report | Add claim disclaimer, evidence appendix, source type, and next validation step. | P1 |
| Share page | Render new data when present; preserve old share pages when absent. | P1 |

### 12.3 Accessibility requirements

- New scores must not rely only on colour; include text labels and icons with accessible names.
- Tooltips must be keyboard reachable or have visible explanatory text.
- Tables need responsive cards or horizontal scroll without losing labels.
- External source links must identify that they open a reference.
- Warnings and insufficient-evidence states must have text, not just amber/red colour.
- Verify keyboard navigation on new-project, results, candidate detail, and report actions.

### 12.4 Report requirements

PDF, CSV, and JSON must remain available. Additive report content must include:

- report generation timestamp and evidence dataset version
- property provenance legend
- reference distance versus PubChem status distinction
- polymerisation classification, reasons, and warnings
- readiness dimensions and source IDs/links
- route source/type and limitations
- explicit disclaimer that reports are screening guidance, not laboratory validation or certification

CSV must remain machine-readable; place field definitions in a metadata section or companion JSON rather than removing existing columns.

---

## 13. Data model and API migration plan

### 13.1 New tables

```text
polymerization_assessments(
  id, candidate_id UNIQUE, classification, feasibility_score,
  polymer_family, co_monomer_requirement, reasons_json,
  warnings_json, rule_version, created_at
)

candidate_readiness_assessments(
  id, candidate_id UNIQUE, readiness_score NULL,
  feedstock_score NULL, end_of_life_score NULL,
  cost_evidence_score NULL, evidence_quality_score NULL,
  reasons_json, source_ids_json, evidence_version, created_at
)
```

### 13.2 No-breaking-change rules

1. Do not alter or remove current columns from `Candidate`, `Prediction`, `Ranking`, `SynthesisRoute`, or `Project`.
2. New response fields must have defaults of `null`, empty list, or absent optional object.
3. New API endpoints are additive.
4. Existing report schema is extended, not replaced.
5. Lazy assessment/backfill avoids deployment-time long jobs.
6. Any migration must be idempotent and tested on a populated SQLite database and a clean database.

### 13.3 New API schemas

Define typed Pydantic models for:

- `PolymerizationAssessmentOut`
- `ReadinessDimensionOut`
- `CandidateReadinessOut`
- `EvidenceSourceOut`
- `BenchmarkMaterialOut`
- `ValidationMetricOut`

Avoid untyped `dict` response fields except for fixed JSON evidence payloads that have a documented schema.

### 13.4 Error behavior

| Condition | HTTP/UI response |
|---|---|
| Candidate does not exist or belongs to another user | Existing 404 behavior remains. |
| Assessment unavailable for old candidate | `200` with `assessment: null`, not an error. |
| Evidence source data malformed | Fail readiness computation safely; log server error; UI says “Evidence unavailable.” |
| External route provider times out | Persist/use local fallback; no 500 to the user. |
| Benchmark data missing | Validation page gives a clear unavailable state; app core still works. |

---

## 14. Engineering work plan and PR sequence

Each item below should be a separate feature branch and pull request. Do not combine all changes into one unreviewable branch.

### PR 1 — Scientific claim and novelty correction (P0)

**Files likely affected:** frontend copy/components, candidate schemas/routers, reports, README, tests.

Deliver:

- Rename “Novelty” labels to “Reference distance.”
- Add PubChem status and correct disclaimers.
- Correct landing/README/route wording.
- Add regression tests for PubChem status mapping and report text.

Definition of done:

- No user-visible page calls reference distance novelty.
- No user-visible text calls every property predictor ML.
- Existing API field remains functional.

### PR 2 — Polymerisation service and persistence (P0)

**Files likely affected:** new service, models, database schema patch, schemas, candidate router, pipeline, tests.

Deliver:

- Rulebook, SMARTS rules, assessment object, safe persistence, additive API response.
- Unit tests for rule classifications and negative cases.

Definition of done:

- Assessment can be computed for new and old candidate records.
- Existing generation and project APIs behave unchanged.

### PR 3 — Candidate UI and report integration (P0)

**Files likely affected:** candidate page, result table, types, API client, report export, share page, E2E tests.

Deliver:

- Clear feasibility/readiness placeholders and evidence limitations.
- Responsive/accessible display.
- PDF/CSV/JSON additions that preserve legacy fields.

Definition of done:

- Candidate detail degrades gracefully if new assessment is absent.
- Existing share link remains valid.

### PR 4 — Evidence data and readiness computation (P0)

**Files likely affected:** versioned data files, data loader, readiness service, metadata router, tests, README.

Deliver:

- Five or more cited family profiles.
- Deterministic quality rubric and source display.
- Local-only generation path.

Definition of done:

- Every displayed value has source IDs and an evidence version.
- Missing evidence does not fabricate a score.

### PR 5 — Benchmark and validation page (P0)

**Files likely affected:** benchmark data/evaluator, meta endpoint, library/validation UI, test fixtures, documentation.

Deliver:

- At least 12 cited benchmark entries.
- Repeatable evaluator output and validation presentation.

Definition of done:

- Method, sample size, limitations, and source links appear together.
- No unsupported accuracy claim is shown.

### PR 6 — Route source classification and offline reliability (P1)

**Files likely affected:** retrosynthesis provider abstraction, pipeline, config, route UI/reports, cache, tests.

Deliver:

- Route type/source labels, local fallback, provider timeout/caching.
- Curated feasibility templates for supported packaging families.

Definition of done:

- Turning off provider credentials never breaks a demo flow.
- Route copy is precise.

### PR 7 — Demo profile, smoke tests, and pitch assets (P1)

**Files likely affected:** config/docs, deployment guide, E2E/smoke script, sample data, README, pitch assets outside code.

Deliver:

- Repeatable demo configuration, readiness endpoint, demo runbook, sample report, Q&A sheet.

Definition of done:

- Two full hosted rehearsals complete successfully.

---

## 15. Test strategy

### 15.1 Unit tests

Add tests for:

- SMARTS classification for every polymerisation family.
- Safety/complexity flags and unsupported molecules.
- Evidence quality scoring with current, stale, India-specific, global, and missing sources.
- Readiness null-handling and score formula.
- PubChem status mapping for `None`, `0`, and positive CID.
- Route source/type mapping and provider fallback.
- Report metadata and terminology.

### 15.2 Integration tests

Add FastAPI tests proving:

- A new generation returns all original fields plus optional assessment data.
- An old candidate without assessment still loads.
- Candidate access control remains enforced for new endpoints.
- PDF/CSV/JSON export works with and without readiness data.
- Shared projects do not leak private source data beyond intended public report fields.

### 15.3 End-to-end tests

Extend the existing critical flow to cover:

1. Signup/login.
2. Packaging project creation.
3. Generation completion.
4. Candidate detail display of assessment and limitations.
5. Report download.
6. Public share view.
7. Keyboard navigation for new controls.

### 15.4 Manual review checklist

- Verify a known PubChem molecule is never labelled novel.
- Verify no molecule is called food-safe.
- Verify external API outage leaves a usable result.
- Verify a small phone viewport can read scores and source links.
- Verify old projects and old public links work after schema migration.
- Verify one full packaging demo uses no fabricated data or hidden mocks.

---

## 16. Deployment and rollback plan

### 16.1 Pre-deployment

1. Back up production database according to Render capabilities.
2. Verify migration against a copy of a populated local database.
3. Run tests and frontend build from a clean checkout.
4. Review environment variables; production must have a strong JWT secret and correct CORS origins.
5. Ensure no API keys, source credentials, or personal data are committed.

### 16.2 Deployment order

1. Deploy backend migration and additive API fields.
2. Confirm `/health` and new `/health/ready` endpoints.
3. Verify old frontend still works against new backend.
4. Deploy frontend additions.
5. Run hosted smoke test.
6. Generate one fresh packaging project and export all three report formats.

### 16.3 Rollback rules

- Because database changes are additive, frontend rollback should remain safe.
- Feature flags/config must allow readiness sections and external route provider calls to be disabled independently.
- Never deploy a destructive schema migration for this phase.
- If evidence data fails to load, hide new readiness content and preserve the existing candidate workflow.

---

## 17. Team ownership

| Owner | Primary responsibility | Secondary review responsibility |
|---|---|---|
| Backend/ML owner | Polymerisation service, readiness computation, benchmark evaluator, data schema, API tests | Scientific claim review |
| Frontend owner | Candidate evidence UI, responsive tables, validation view, report/download UX | Accessibility and language review |
| Research/product owner | Source collection, benchmark curation, expert feedback, pitch, demo script, claim register | Verify every user-visible statement against product behavior |

Every pull request requires one reviewer other than its author. No one should both add evidence data and approve their own scientific wording.

---

## 18. Demo and pitch runbook

### 18.1 Recommended 90-second live demo

1. State the India packaging problem and the user.
2. Choose the biodegradable hot-food packaging preset.
3. Explain the five desired trade-offs in plain language.
4. Start or open a prepared deterministic generation run.
5. Open the top candidate.
6. Point to:
   - property provenance
   - polymerisation feasibility and warning
   - India Material Readiness evidence
   - source-backed limitations
   - PubChem exact-match status
7. Export a report.
8. End with the next real-world validation step and partner need.

### 18.2 Mandatory answer to “Is this scientifically validated?”

> “No candidate is lab-validated by the platform. EcoMatter is a transparent screening and prioritisation tool. We validate what we can against cited benchmarks, label proxy estimates, and use the tool to decide which few candidates deserve expert and laboratory testing.”

### 18.3 Mandatory answer to “What is your innovation?”

> “Existing chemistry tools can generate or inspect molecules. Our original layer is polymerisation-aware inverse screening tied to India-specific feedstock, cost-evidence, and end-of-life constraints, with uncertainty and citations exposed instead of hidden.”

### 18.4 Pitch evidence pack

Before the presentation, prepare:

- One-page problem evidence sheet with cited Indian context.
- One-page model/proxy and benchmark summary.
- One anonymised expert-review quote or documented feedback session.
- One sample PDF report from the hosted app.
- One architecture diagram that accurately matches deployment.
- One limitations/future-validation slide.

---

## 19. Risks and mitigations

| Risk | Mitigation | Owner |
|---|---|---|
| Team adds unsupported scientific claims under deadline pressure. | Claim register, copy review, provenance labels, and release Gate A. | Research/product owner |
| Polymerisation rules produce false positives. | Conservative categories, explicit warnings, manual review dataset, no certification claim. | Backend/ML owner |
| Evidence dataset becomes a pile of uncited links. | Required source schema, versioning, quality tier, and review checklist. | Research/product owner |
| External PubChem/route API is slow or unavailable. | Async/on-demand lookup, strict timeout, cache, local fallback. | Backend/ML owner |
| New schema breaks old projects or share links. | Additive tables/fields, lazy assessment, integration tests on old fixtures. | Backend owner |
| Scope expands into other materials or enterprise features. | Packaging-first decision; all additional ideas go to backlog. | Whole team |
| Demo fails because cold backend or unpredictable run. | Rehearsed hosted smoke test, deterministic sample project, readiness endpoint. | Whole team |

---

## 20. Final definition of done

The Competition Readiness release is complete only when all statements below are true:

- [ ] Existing end-to-end product tests and frontend production build pass.
- [ ] All claim language matches the actual implementation.
- [ ] Packaging candidates are labelled as polymerisable/unsupported with explicit reasons.
- [ ] Research Fit Score and Material Readiness Score are distinct and explained.
- [ ] Reference distance and PubChem exact-match status are distinct everywhere.
- [ ] India-readiness values are local, versioned, cited, and show evidence limitations.
- [ ] A benchmark dataset and repeatable evaluator are committed and exposed to users.
- [ ] Route types clearly state whether they are template, provider prediction, or structural sketch.
- [ ] Demo works when external novelty/retrosynthesis APIs are unavailable.
- [ ] PDF, CSV, JSON, public sharing, old projects, and the EV scenario still work.
- [ ] Two full hosted rehearsals have completed successfully.
- [ ] Pitch, README, live app, sample report, and architecture diagram tell the same truthful story.

---

## Appendix A — Repository organisation after implementation

```text
backend/
  app/
    services/
      polymerization.py
      readiness.py
      evidence.py
      benchmark.py
      retrosynthesis.py
    routers/
      meta.py
      candidates.py
  data/
    evidence/
      README.md
      sources.json
      feedstock_profiles.json
      end_of_life_profiles.json
      benchmark_materials.json
      benchmark_results.json
  tests/
    test_polymerization.py
    test_readiness.py
    test_evidence.py
    test_benchmark.py
frontend/
  app/
    library/page.tsx          # validation/evidence view
    candidates/[id]/page.tsx  # feasibility and readiness panels
  components/
    readiness-card.tsx
    evidence-list.tsx
    provenance-badge.tsx
COMPETITION_READINESS_PRD.md
```

## Appendix B — Branch and pull-request workflow

For each numbered PR:

```bash
git switch main
git pull --ff-only
git switch -c feat/<short-feature-name>
# make one logical change set
git add <specific files>
git commit -m "feat: <clear change>"
git push -u origin feat/<short-feature-name>
```

Open a pull request into `main`. Include:

1. Requirement IDs implemented.
2. Screenshots or API response examples.
3. Tests run and results.
4. Migration behavior.
5. Claim-language changes, if any.
6. Known limitations and follow-up work.

Never push feature work directly to `main`.
