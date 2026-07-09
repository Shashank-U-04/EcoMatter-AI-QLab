"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { BackLink, Badge, Disclaimer, ErrorNote, PropertyRow, SectionLabel, Spinner } from "@/components/ui";
import {
  ApiError,
  fetchImageObjectUrl,
  getCandidate,
  getModelCards,
  getSynthesis,
  getToken,
  ModelCard,
} from "@/lib/api";
import { PROPERTY_LABEL } from "@/lib/properties";
import { CandidateDetail, SynthesisRoute } from "@/lib/types";

const Molecule3D = dynamic(() => import("@/components/molecule3d"), { ssr: false });

export default function CandidatePage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = Number(params.id);

  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [route, setRoute] = useState<SynthesisRoute | null>(null);
  const [routeMissing, setRouteMissing] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [view3d, setView3d] = useState(false);
  const [modelCards, setModelCards] = useState<ModelCard[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    let objectUrl = "";
    setDetail(null);
    setRoute(null);
    setRouteMissing(false);
    setImageUrl("");
    setError("");

    getCandidate(candidateId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load candidate"));

    fetchImageObjectUrl(candidateId)
      .then((url) => {
        objectUrl = url;
        setImageUrl(url);
      })
      .catch(() => {/* structure image is optional; SMILES is still shown */});

    getSynthesis(candidateId)
      .then(setRoute)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setRouteMissing(true);
        else setError(e instanceof Error ? e.message : "Could not load synthesis route");
      });

    getModelCards()
      .then((r) => setModelCards(r.models))
      .catch(() => {/* model cards are optional context */});

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateId, router]);

  if (error) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <BackLink href="/dashboard">Back to projects</BackLink>
          <div className="mt-6"><ErrorNote message={error} /></div>
        </main>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex max-w-5xl justify-center px-4 py-28">
          <Spinner label="Loading candidate…" />
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <BackLink href={`/projects/${detail.project_id}`}>Back to results</BackLink>

        <div className="reveal mt-4">
          <SectionLabel>Candidate profile</SectionLabel>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl text-ink">
              Candidate <span className="font-mono font-bold text-ember-400">#{detail.rank}</span>
            </h1>
            <Badge tone="accent">score {detail.composite_score.toFixed(1)}</Badge>
            <Badge>structural novelty {(detail.novelty_score * 100).toFixed(0)}%</Badge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              {detail.generation_method}
            </span>
          </div>

          {/* Real, verifiable novelty: checked against PubChem's ~119M compounds */}
          {detail.pubchem_cid !== null && (
            <div className="mt-3">
              {detail.pubchem_cid === 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-ember-400/25 bg-ember-400/[0.07] px-3.5 py-1.5 text-xs text-ember-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-ember-400" />
                  Novel structure — not found in PubChem&apos;s ~119M known compounds
                </span>
              ) : (
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${detail.pubchem_cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-edge2 bg-white/[0.04] px-3.5 py-1.5 text-xs text-dim transition-colors hover:border-ember-400/30 hover:text-ink"
                >
                  Known compound · PubChem CID {detail.pubchem_cid}
                  <span className="text-faint">↗</span>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Structure — 2D SVG / interactive 3D conformer */}
          <section className="card reveal p-6" style={{ "--d": "80ms" } as React.CSSProperties}>
            <div className="flex items-center justify-between">
              <div className="overline">Structure</div>
              <div className="flex overflow-hidden rounded-full border border-edge2">
                {(["2D", "3D"] as const).map((mode) => {
                  const active = (mode === "3D") === view3d;
                  return (
                    <button
                      key={mode}
                      onClick={() => setView3d(mode === "3D")}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                        active ? "bg-ember-400/15 text-ember-300" : "text-faint hover:text-dim"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4">
              {view3d ? (
                <Molecule3D candidateId={candidateId} />
              ) : (
                <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl bg-[#f4f4ef] shadow-inner">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={`2D structure of ${detail.smiles}`}
                      className="reveal max-h-64 w-auto"
                    />
                  ) : (
                    <Spinner label="Rendering structure…" />
                  )}
                </div>
              )}
            </div>
            <p className="mt-4 break-all font-mono text-xs leading-relaxed text-dim">
              {detail.smiles}
            </p>
            {view3d && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                RDKit MMFF-optimised conformer · drag to rotate
              </p>
            )}
          </section>

          {/* Predicted properties with confidence */}
          <section className="card reveal p-6" style={{ "--d": "160ms" } as React.CSSProperties}>
            <div className="overline">Predicted properties</div>
            <div className="mt-2 divide-y divide-edge/50">
              {detail.predictions.map((p) => (
                <PropertyRow
                  key={p.property_name}
                  name={p.property_name}
                  value={p.predicted_value}
                  confidence={p.confidence}
                  modelVersion={p.model_version}
                />
              ))}
            </div>
            {detail.explanation.cost_estimate_usd_per_kg !== null && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-edge2 bg-white/[0.03] px-4 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-dim">
                  Est. feedstock cost
                </span>
                <span className="font-mono text-sm font-bold text-ink">
                  ${detail.explanation.cost_estimate_usd_per_kg.toFixed(2)}
                  <span className="ml-1 text-[11px] font-normal text-faint">/kg</span>
                </span>
              </div>
            )}
            {modelCards.map((m) => (
              <p key={m.name} className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
                {m.name}: {m.algorithm.split(" (")[0]} · test R²={m.test_r2} · {m.dataset}
              </p>
            ))}
            <div className="mt-3"><Disclaimer /></div>
          </section>

          {/* Explanation panel */}
          <section className="card reveal p-6" style={{ "--d": "240ms" } as React.CSSProperties}>
            <div className="overline">Why this candidate ranked here</div>
            <p className="tagline mt-3 text-base">{detail.explanation.summary}</p>

            {detail.explanation.feature_importance.length > 0 && (
              <>
                <h3 className="overline mt-6">
                  Top drivers —{" "}
                  {PROPERTY_LABEL[detail.explanation.feature_importance[0].property || ""] ||
                    "primary target"}
                </h3>
                <ul className="mt-3 space-y-2">
                  {detail.explanation.feature_importance.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-dim">{f.factor}</span>
                      <span
                        className={`font-mono font-bold ${
                          f.direction === "up" ? "text-ember-300" : "text-red-400"
                        }`}
                      >
                        {f.direction === "up" ? "+" : "−"}
                        {Math.abs(f.points).toFixed(0)} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {detail.explanation.ml_drivers.length > 0 && (
              <>
                <h3 className="overline mt-6">
                  Trained-model drivers · solubility SHAP
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-faint">
                  Descriptors that most moved the trained aqueous-solubility model, which
                  informs biodegradability.
                </p>
                <ul className="mt-3 space-y-2">
                  {detail.explanation.ml_drivers.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-dim">{f.factor}</span>
                      <span
                        className={`font-mono font-bold ${
                          f.direction === "up" ? "text-ember-300" : "text-red-400"
                        }`}
                      >
                        {f.direction === "up" ? "+" : "−"}
                        {Math.abs(f.impact).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {detail.explanation.trade_offs.length > 0 && (
              <>
                <h3 className="overline mt-6">Trade-offs</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-dim">
                  {detail.explanation.trade_offs.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ember-400">◆</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Similar known molecules */}
          <section className="card reveal p-6" style={{ "--d": "320ms" } as React.CSSProperties}>
            <div className="overline">Similar known molecules</div>
            {detail.explanation.similar_molecules.length === 0 ? (
              <p className="tagline mt-3 text-sm">
                No close match in the reference set — a highly novel structure.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-edge/50">
                {detail.explanation.similar_molecules.map((m) => (
                  <li key={m.smiles} className="py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-lg text-ink">{m.name}</span>
                      <Badge>{(m.similarity * 100).toFixed(0)}% similar</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-dim">{m.note}</p>
                    <p className="mt-1.5 break-all font-mono text-[10px] text-faint">{m.smiles}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Synthesis route */}
        <section className="card reveal mt-6 p-6" style={{ "--d": "400ms" } as React.CSSProperties}>
          <div className="overline">Recommended synthesis route</div>

          {!route && !routeMissing && (
            <div className="mt-4"><Spinner label="Loading route…" /></div>
          )}

          {routeMissing && (
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
              No synthesis route was found for this candidate.{" "}
              {detail.next_candidate_id ? (
                <Link
                  href={`/candidates/${detail.next_candidate_id}`}
                  className="font-semibold text-ember-300 underline decoration-ember-400/40 underline-offset-4 transition-colors hover:text-ember-200"
                >
                  Try the next-best candidate →
                </Link>
              ) : (
                <Link
                  href={`/projects/${detail.project_id}`}
                  className="font-semibold text-ember-300 underline decoration-ember-400/40 underline-offset-4 transition-colors hover:text-ember-200"
                >
                  Back to the ranked list →
                </Link>
              )}
            </div>
          )}

          {route && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>engine: {route.source_engine}</Badge>
                {route.largest_block_pct !== null && (
                  <Badge tone="accent">largest block {route.largest_block_pct.toFixed(0)}% of skeleton</Badge>
                )}
                <Badge>{route.building_blocks} building blocks</Badge>
              </div>
              {route.flags.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {route.flags.map((f) => (
                    <li
                      key={f}
                      className="rounded-full border border-edge2 bg-white/[0.03] px-3 py-1 text-[11px] text-dim"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <ol className="mt-6 space-y-5">
                {route.steps.map((s, i) => (
                  <li
                    key={s.step}
                    className="reveal flex gap-4"
                    style={{ "--d": `${i * 100}ms` } as React.CSSProperties}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge2 bg-white/5 font-mono text-sm font-bold text-ember-300">
                      {s.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-ink">{s.description}</p>
                      {s.precursors.length > 0 && (
                        <p className="mt-1 break-all font-mono text-[10px] text-faint">
                          precursors: {s.precursors.join(" + ")}
                        </p>
                      )}
                      {s.reaction_hint && (
                        <p className="mt-1 text-xs text-dim">{s.reaction_hint}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {route.note && <p className="tagline mt-6 text-xs">{route.note}</p>}
            </>
          )}
        </section>

        {detail.next_candidate_id && (
          <div className="mt-8 text-right">
            <Link
              href={`/candidates/${detail.next_candidate_id}`}
              className="group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ember-300 transition-colors hover:text-ember-200"
            >
              Next candidate
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
