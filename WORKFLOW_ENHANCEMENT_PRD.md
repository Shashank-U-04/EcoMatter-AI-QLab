# EcoMatter AI-QLab — In-Site Workflow Enhancement PRD

**Version:** 1.0
**Status:** Build-ready, partially implemented in this iteration
**Scope owner:** EcoMatter AI-QLab team
**Relationship to prior work:** This PRD is a focused, workflow-first companion to
`COMPETITION_READINESS_PRD.md`. That document is about *scientific trust* (claims,
polymerisation, evidence, benchmarks). This document is about the *researcher's flow
through the app* — how quickly and clearly a user can go from "I have a target profile"
to "these are the two candidates I will investigate." Where the two overlap (e.g. the
"Novelty" mislabel), this PRD adopts the honest-language direction from the readiness PRD.

---

## 1. Why this PRD exists

The prototype already works end to end: signup → project → genetic search → ranked
candidates → candidate detail → reports/share. The gap is not *capability*, it is
*flow*. A user who returns to the dashboard, or who is staring at a 30-row candidate
table, hits avoidable friction at three points in the core loop.

This PRD makes the core decision loop — **triage projects → scan candidates → compare →
decide** — faster and more legible, without adding new scientific claims and without
regressing any existing workflow.

### 1.1 Product rule (unchanged from the readiness PRD)

All work is additive or migration-safe. Every existing workflow — signup/login,
project creation, generation, candidate detail, starring, rename/delete, share links,
PDF/CSV/JSON export, old shared links — must continue to work unchanged. New response
fields are optional with safe defaults; no existing column, endpoint, or field name is
removed or repurposed.

### 1.2 Baseline gate (unchanged)

Before any change merges:

```bash
cd backend && .venv/bin/python -m pytest tests/ -q   # all pass
cd ../frontend && npm run build                        # completes
```

---

## 2. The three friction points (observed in the current code)

| # | Where | What the user experiences today | Cost to the workflow |
|---|---|---|---|
| F1 | `/dashboard` | Project cards show only name, domain, date, and target count. Nothing tells the user which projects finished, are still running, or failed. | A returning user must open projects one by one to find the finished one. No way to search, filter, or sort as the project list grows. |
| F2 | `/projects/[id]` | The candidate table shows raw SMILES text and mislabels reference-library distance as "Novelty." There is no way to compare candidates. | The core decision of the whole product — "which of these do I pick?" — forces the user to open candidates one at a time and hold their properties in memory. |
| F3 | `/candidates/[id]` | Navigation is "next candidate" only. When a PubChem check was skipped, the page shows nothing about novelty at all. | The user cannot walk the ranked list fluidly, and cannot tell "novel" apart from "we didn't check." |

---

## 3. Goals and success criteria

| ID | Goal | Success evidence |
|---|---|---|
| W1 | A returning user understands the state of every project at a glance. | Each dashboard card shows run status, candidate count, and best score; the list is searchable, filterable by status, and sortable. |
| W2 | A user can compare shortlisted candidates without leaving the results page. | User can select candidates and see their properties side by side in one view. |
| W3 | Candidate labels are honest and navigation is fluid. | "Novelty" is renamed to "Reference distance" with an explanatory tooltip; a skipped PubChem check reads "Not checked"; the user can move prev/next through the ranked list with buttons and arrow keys. |
| W4 | No regression. | Backend tests and frontend build stay green; old projects, share links, and reports are unaffected. |

---

## 4. Feature specifications

### 4.1 Feature W1 — Dashboard project triage

**Backend (additive):** Extend `ProjectOut` with four optional, nullable fields,
populated only in the project-list endpoint (they default to `null` everywhere else,
so `create`, `get`, and `rename` responses are byte-compatible for old clients):

| Field | Type | Meaning |
|---|---|---|
| `latest_run_status` | `str \| null` | `pending` / `running` / `completed` / `failed`, or `null` when the project has never been run. |
| `candidate_count` | `int \| null` | Number of candidates from the latest completed run; `null` if none. |
| `top_score` | `float \| null` | Best composite (Research Fit) score from the latest completed run. |
| `last_activity` | `datetime \| null` | Timestamp of the most recent run (falls back to project creation). |

Computation stays cheap (a bounded number of queries per project; the project list is
small). No new tables, no migration.

**Frontend:**
- Each project card shows a status badge (colour + text label + icon, never colour
  alone) and, when completed, "N candidates · best NN.N".
- A search box filters by project name.
- A status filter (All / Completed / Running / Draft) narrows the grid.
- A sort control (Recent / Name / Best score) orders it.
- Empty and no-match states remain friendly.

**Acceptance:** old dashboard still renders for projects with no runs (`null` summary
fields); filtering/sorting never hides the "New project" affordance.

### 4.2 Feature W2 — Candidate comparison

**Backend:** none — `CandidateSummary` already carries all five predictions.

**Frontend (results page):**
- A "compare" checkbox per row lets the user select up to 4 candidates.
- A sticky compare tray shows how many are selected and a "Compare" action.
- The comparison view shows the selected candidates side by side: composite score,
  reference distance, and all five property scores, with the best value in each row
  highlighted so trade-offs are visible at a glance.
- Selection is ephemeral (no persistence needed); it complements, and does not replace,
  the existing star/shortlist mechanism.

**Acceptance:** comparison uses only already-loaded candidate data (no extra requests);
works with 2–4 candidates; degrades gracefully to a horizontal scroll on small screens.

### 4.3 Feature W3 — Honest labels + fluid candidate navigation

**Backend (additive):** Add `prev_candidate_id: int | null` to `CandidateDetail`,
computed the same way as the existing `next_candidate_id` (the candidate one rank above).

**Frontend:**
- Results table: rename the "Novelty" column and sort key to "Reference distance" with
  a tooltip — "Structural distance from EcoMatter's local reference library; not a
  novelty claim." The underlying API field (`novelty_score`) is unchanged.
- Candidate detail: the "Structural novelty" stat tile becomes "Reference distance."
- Candidate detail PubChem block renders one of three explicit states derived from the
  existing nullable `pubchem_cid`: **Known in PubChem** (with CID link), **No exact
  PubChem match** (only when the lookup returned 0), or **Not checked** (when `null`).
- Candidate detail gains previous/next buttons and left/right arrow-key navigation
  across the ranked list.

**Acceptance:** a skipped lookup never reads as "novel"; a known compound never reads as
novel; arrow keys do not hijack typing in inputs; the API field name `novelty_score`
still exists and is populated.

---

## 5. Out of scope (deferred to the readiness PRD)

Polymerisation feasibility, India readiness scoring, evidence datasets, benchmark
dashboard, route-source classification, and demo-profile hardening are **not** in this
PRD. This PRD deliberately touches only presentation and navigation of data the app
already computes, so it can ship independently and safely.

---

## 6. Test plan

- **Backend unit/integration:** the project-list endpoint returns the new summary
  fields (populated for a completed run, `null` for a never-run project); candidate
  detail returns `prev_candidate_id` (`null` for rank 1, the rank-1 id for rank 2).
- **Regression:** the full existing pipeline test continues to pass unchanged.
- **Build:** `npm run build` completes with the new components.
- **Manual:** dashboard filter/sort; compare 3 candidates; walk prev/next with the
  keyboard; confirm the three PubChem states render correctly.

---

## 7. Definition of done

- [ ] Dashboard shows per-project status, counts, and best score, and is
      searchable/filterable/sortable.
- [ ] A user can compare 2–4 candidates side by side from the results page.
- [ ] "Novelty" is renamed to "Reference distance" everywhere it appears in the UI.
- [ ] PubChem status shows Known / No match / Not checked explicitly.
- [ ] Candidate detail supports prev/next by button and arrow key.
- [ ] Backend tests and frontend build are green; old projects, shares, and reports
      are unaffected.
