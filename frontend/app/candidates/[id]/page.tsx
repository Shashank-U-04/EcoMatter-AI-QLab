"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { BackLink, Badge, Disclaimer, ErrorNote, PropertyRow, Spinner } from "@/components/ui";
import { ApiError, fetchImageObjectUrl, getCandidate, getSynthesis, getToken } from "@/lib/api";
import { PROPERTY_LABEL } from "@/lib/properties";
import { CandidateDetail, SynthesisRoute } from "@/lib/types";

export default function CandidatePage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = Number(params.id);

  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [route, setRoute] = useState<SynthesisRoute | null>(null);
  const [routeMissing, setRouteMissing] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
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

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateId, router]);

  if (error) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">
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
        <main className="mx-auto flex max-w-5xl justify-center px-4 py-24">
          <Spinner label="Loading candidate…" />
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <BackLink href={`/projects/${detail.project_id}`}>Back to results</BackLink>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Candidate #{detail.rank}</h1>
          <Badge>score {detail.composite_score.toFixed(1)}</Badge>
          <Badge>novelty {(detail.novelty_score * 100).toFixed(0)}%</Badge>
          <span className="text-xs text-slate-400">{detail.generation_method}</span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* 2D structure */}
          <section className="card p-5">
            <h2 className="font-semibold text-slate-800">Structure</h2>
            <div className="mt-3 flex min-h-56 items-center justify-center rounded-lg bg-white">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={`2D structure of ${detail.smiles}`} className="max-h-64 w-auto" />
              ) : (
                <Spinner label="Rendering structure…" />
              )}
            </div>
            <p className="mt-3 break-all font-mono text-xs text-slate-500">{detail.smiles}</p>
          </section>

          {/* Predicted properties with confidence */}
          <section className="card p-5">
            <h2 className="font-semibold text-slate-800">Predicted properties</h2>
            <div className="mt-2 divide-y divide-slate-100">
              {detail.predictions.map((p) => (
                <PropertyRow
                  key={p.property_name}
                  name={p.property_name}
                  value={p.predicted_value}
                  confidence={p.confidence}
                />
              ))}
            </div>
            <div className="mt-3"><Disclaimer /></div>
          </section>

          {/* Explanation panel */}
          <section className="card p-5">
            <h2 className="font-semibold text-slate-800">Why this candidate ranked here</h2>
            <p className="mt-2 text-sm text-slate-600">{detail.explanation.summary}</p>

            {detail.explanation.feature_importance.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Top drivers — {PROPERTY_LABEL[detail.explanation.feature_importance[0].property || ""] || "primary target"}
                </h3>
                <ul className="mt-2 space-y-1">
                  {detail.explanation.feature_importance.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{f.factor}</span>
                      <span className={f.direction === "up" ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
                        {f.direction === "up" ? "+" : "−"}{Math.abs(f.points).toFixed(0)} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {detail.explanation.trade_offs.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Trade-offs</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {detail.explanation.trade_offs.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Similar known molecules */}
          <section className="card p-5">
            <h2 className="font-semibold text-slate-800">Similar known molecules</h2>
            {detail.explanation.similar_molecules.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No close match in the reference set — a highly novel structure.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {detail.explanation.similar_molecules.map((m) => (
                  <li key={m.smiles} className="py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium text-slate-800">{m.name}</span>
                      <Badge>{(m.similarity * 100).toFixed(0)}% similar</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{m.note}</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{m.smiles}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Synthesis route */}
        <section className="card mt-6 p-5">
          <h2 className="font-semibold text-slate-800">Recommended synthesis route</h2>

          {!route && !routeMissing && (
            <div className="mt-3"><Spinner label="Loading route…" /></div>
          )}

          {routeMissing && (
            <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No synthesis route was found for this candidate.{" "}
              {detail.next_candidate_id ? (
                <Link href={`/candidates/${detail.next_candidate_id}`} className="font-semibold underline">
                  Try the next-best candidate →
                </Link>
              ) : (
                <Link href={`/projects/${detail.project_id}`} className="font-semibold underline">
                  Back to the ranked list →
                </Link>
              )}
            </div>
          )}

          {route && (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>engine: {route.source_engine}</Badge>
                <Badge>est. yield {(route.estimated_yield * 100).toFixed(0)}%</Badge>
                <Badge>green score {route.green_chemistry_score.toFixed(0)}/100</Badge>
                <Badge>confidence {(route.confidence * 100).toFixed(0)}%</Badge>
              </div>
              <ol className="mt-4 space-y-3">
                {route.steps.map((s) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700">{s.description}</p>
                      {s.precursors.length > 0 && (
                        <p className="mt-0.5 break-all font-mono text-[11px] text-slate-400">
                          precursors: {s.precursors.join(" + ")}
                        </p>
                      )}
                      {s.reaction_hint && (
                        <p className="mt-0.5 text-xs text-slate-500">{s.reaction_hint}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {route.note && <p className="mt-4 text-xs text-slate-400">{route.note}</p>}
            </>
          )}
        </section>

        {detail.next_candidate_id && (
          <div className="mt-6 text-right">
            <Link href={`/candidates/${detail.next_candidate_id}`} className="text-brand-600 hover:underline">
              Next candidate →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
