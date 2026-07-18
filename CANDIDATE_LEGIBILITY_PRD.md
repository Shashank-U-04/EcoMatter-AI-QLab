# EcoMatter AI-QLab — Candidate Legibility PRD

**Version:** 1.0
**Status:** Build-ready, implemented in this iteration
**Relationship to prior work:** Third in the workflow series, after
`WORKFLOW_ENHANCEMENT_PRD.md`. The first workflow PRD made *projects* and
*navigation* legible (dashboard triage, compare, honest labels, prev/next). This one
makes the *candidate list itself* legible and actionable: you should be able to read a
structure at a glance, narrow 30 candidates to the few that meet a hard requirement, and
see how each prediction stacks up against the target you actually asked for.

---

## 1. Why this PRD exists

After the first round, the results page is honest and comparable, but the ranked list is
still hard to *act on*:

1. **Structures are invisible.** The table shows raw SMILES strings
   (`O=C(O)CCC(=O)OCC...`). A materials researcher reads structure, not string. To see
   what a candidate *is*, they must open its detail page — one round trip per candidate.
2. **No way to enforce a hard requirement.** Ranking is a soft multi-objective
   compromise. But a user often has a non-negotiable floor ("biodegradability must be at
   least 70, everything else is secondary"). Today they must eyeball all 30 rows.
3. **Targets are invisible on the candidate page.** The detail page shows predicted
   property values, but not the target the project asked for — so the user can't tell if
   a "72" is a win or a miss without flipping back to the results header.

All three are presentation of data the app already has. No new science, no new claims.

---

## 2. Product rule and baseline gate (unchanged)

Additive and migration-safe. Existing workflows — generation, candidate detail,
starring, compare, reports, share links, old projects — must keep working. The gate is
unchanged:

```bash
cd backend && .venv/bin/python -m pytest tests/ -q   # all pass
cd ../frontend && npm run build                        # completes
```

This PRD requires **no backend schema change**. Feature R3 reuses the existing
`/projects/{id}` targets and `/candidates/{id}/image` endpoints.

---

## 3. Feature specifications

### 3.1 Feature R1 — Structure thumbnails in the results table

**What:** Each candidate row shows a small 2D structure image alongside its SMILES, so
the list can be scanned visually.

**How:**
- A `StructureThumb` component fetches the candidate's existing 2D SVG
  (`/candidates/{id}/image`, auth-guarded, via an object URL) and renders it small.
- Loading is **lazy** (IntersectionObserver): a row's image is only fetched when the row
  scrolls near the viewport, so opening a 30-row list does not fire 30 requests at once.
- Object URLs are revoked on unmount to avoid leaks.
- The raw SMILES stays visible (truncated) beneath the thumbnail for copy/traceability.
- If the image fails to render, the row still shows the SMILES — no broken state.

**Acceptance:** the list renders immediately with placeholders; images stream in as the
user scrolls; no console errors; SMILES remains selectable.

### 3.2 Feature R2 — Property-threshold filters

**What:** The user can set a minimum acceptable value per property; candidates whose
predicted value for any active property falls below its floor are hidden.

**How:**
- A compact, collapsible "Filters" control lists the five properties, each with a slider
  (0–100, default 0 = inactive).
- Filtering is client-side over already-loaded predictions — instant, no requests.
- The control shows how many filters are active and how many candidates remain, plus a
  one-click reset.
- Filters compose with the existing sort, "shortlist only", and compare controls.
- When filters hide everything, the page shows a clear "no candidates meet these floors —
  relax a filter" message rather than an empty table.

**Acceptance:** setting biodegradability ≥ 70 hides all candidates predicted below 70;
reset restores the full list; the ranked order of survivors is unchanged.

### 3.3 Feature R3 — Target-vs-predicted on candidate detail

**What:** On the candidate detail page, each predicted property shows the project's
target for that property and whether the prediction meets it.

**How:**
- The detail page fetches the project (`/projects/{id}`) to read `property_targets`.
- Each property bar gains a target marker at the target value and a small delta label:
  "meets target" when predicted ≥ target, otherwise "N below target".
- Properties without a target for this project render exactly as before (no marker).

**Acceptance:** a candidate scoring 80 against a target of 70 shows "meets target"; one
scoring 55 against 70 shows "15 below target"; a project missing a property target does
not error.

---

## 4. Out of scope

No changes to generation, ranking, the scientific models, reports, or the share
snapshot. Structure thumbnails are **not** added to the share page in this round (it
renders for logged-out viewers without the auth'd image endpoint); that is a possible
follow-up.

---

## 5. Test plan

- **Backend:** unchanged; the existing suite must stay green (no backend edits).
- **Frontend build:** `npm run build` completes with the new components.
- **Manual:** scroll the results list and watch thumbnails stream in; set a
  biodegradability floor and confirm the survivors; open a candidate and confirm the
  target marker and meets/below label match the project's targets.

---

## 6. Definition of done

- [ ] Results rows show lazy-loaded 2D structure thumbnails; SMILES still visible.
- [ ] A property-threshold filter panel narrows the list client-side, with reset and a
      "nothing matches" state.
- [ ] Candidate detail shows target markers and meets/below deltas per property.
- [ ] Frontend build and backend tests are green; no backend schema change.
