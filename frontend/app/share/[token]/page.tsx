"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import FitnessChart from "@/components/fitness-chart";
import { Badge, Disclaimer, ScoreBar, SectionLabel, Spinner } from "@/components/ui";
import { getSharedProject } from "@/lib/api";
import { PROPERTY_LABEL } from "@/lib/properties";
import { SharedProject } from "@/lib/types";

export default function SharedResults() {
  const params = useParams();
  const token = String(params.token || "");
  const [data, setData] = useState<SharedProject | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getSharedProject(token)
      .then(setData)
      .catch((e) =>
        setError(
          e instanceof Error && e.message !== "Not Found"
            ? e.message
            : "This share link is invalid or has been revoked."
        )
      );
  }, [token]);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold uppercase tracking-[0.18em] text-ink transition-colors group-hover:text-ember-300">
              ecomatter
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-400">
              AI·QLab
            </span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Shared results · read-only
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {error && (
          <div className="card reveal mx-auto mt-16 max-w-md p-10 text-center">
            <p className="tagline text-lg">{error}</p>
            <p className="mt-3 text-sm text-dim">
              Ask the project owner for a fresh link, or{" "}
              <Link href="/" className="text-ember-300 underline underline-offset-2">
                explore EcoMatter AI-QLab
              </Link>
              .
            </p>
          </div>
        )}

        {!data && !error && (
          <div className="mt-16 flex justify-center">
            <Spinner label="Loading shared results…" />
          </div>
        )}

        {data && (
          <>
            <div className="reveal">
              <SectionLabel>Shared experiment</SectionLabel>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl text-ink">{data.name}</h1>
                <Badge tone="accent">{data.domain}</Badge>
              </div>
            </div>

            <div className="reveal mt-5 flex flex-wrap gap-2" style={{ "--d": "100ms" } as React.CSSProperties}>
              {data.property_targets.map((t) => (
                <span
                  key={t.property_name}
                  className="rounded-full border border-edge bg-panel px-3.5 py-1.5 font-mono text-[11px] text-dim"
                >
                  {PROPERTY_LABEL[t.property_name] || t.property_name}:{" "}
                  <b className="text-ink">{t.target_value}</b>
                  {t.weight !== 1 && <span className="text-ember-300"> ×{t.weight}</span>}
                </span>
              ))}
            </div>

            {(data.run?.progress_history?.length ?? 0) >= 2 && (
              <div className="card reveal mt-8 p-6" style={{ "--d": "140ms" } as React.CSSProperties}>
                <SectionLabel>Genetic search</SectionLabel>
                <FitnessChart history={data.run!.progress_history} />
              </div>
            )}

            {data.candidates.length > 0 ? (
              <div className="card reveal mt-8 overflow-hidden" style={{ "--d": "180ms" } as React.CSSProperties}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-edge text-left font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
                        <th className="px-4 py-3.5">#</th>
                        <th className="px-3 py-3.5">Structure (SMILES)</th>
                        <th className="px-3 py-3.5">Score</th>
                        <th className="px-3 py-3.5">Novelty</th>
                        <th className="w-52 px-3 py-3.5">Top property</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.candidates.map((c) => {
                        const top = [...c.predictions].sort(
                          (a, b) => b.predicted_value - a.predicted_value
                        )[0];
                        return (
                          <tr key={c.id} className="border-b border-edge/50">
                            <td
                              className={`px-4 py-4 font-mono text-base font-bold ${
                                c.rank === 1 ? "text-ember-400" : "text-dim"
                              }`}
                            >
                              {c.rank}
                            </td>
                            <td className="max-w-xs truncate px-3 py-4 font-mono text-xs text-dim">
                              {c.smiles}
                            </td>
                            <td className="px-3 py-4 font-mono font-bold text-ink">
                              {c.composite_score.toFixed(1)}
                            </td>
                            <td className="px-3 py-4 font-mono text-xs text-dim">
                              {(c.novelty_score * 100).toFixed(0)}%
                            </td>
                            <td className="px-3 py-4">
                              {top && (
                                <ScoreBar
                                  value={top.predicted_value}
                                  label={PROPERTY_LABEL[top.property_name]}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card reveal mt-8 p-10 text-center">
                <p className="text-sm text-dim">No completed results in this project yet.</p>
              </div>
            )}

            <div className="mt-5">
              <Disclaimer />
            </div>
          </>
        )}
      </main>
    </>
  );
}
