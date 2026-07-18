"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PROPERTIES } from "@/lib/properties";
import { CandidateSummary } from "@/lib/types";

interface Row {
  label: string;
  hint?: string;
  value: (c: CandidateSummary) => number;
  format: (v: number) => string;
}

// Every row here is "higher is better" for the purpose of leader-highlighting:
// property scores and composite score reward higher values, and a larger
// reference distance means further from known references. The highlight marks the
// highest value in the row — it is a scan aid, not a verdict.
const ROWS: Row[] = [
  {
    label: "Research fit score",
    hint: "composite",
    value: (c) => c.composite_score,
    format: (v) => v.toFixed(1),
  },
  {
    label: "Reference distance",
    hint: "vs local library",
    value: (c) => c.novelty_score * 100,
    format: (v) => `${v.toFixed(0)}%`,
  },
  ...PROPERTIES.map((p) => ({
    label: p.label,
    value: (c: CandidateSummary) =>
      c.predictions.find((x) => x.property_name === p.key)?.predicted_value ?? 0,
    format: (v: number) => v.toFixed(0),
  })),
];

export default function CandidateCompare({
  candidates,
  onClose,
}: {
  candidates: CandidateSummary[];
  onClose: () => void;
}) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Compare candidates"
      onClick={onClose}
    >
      <div
        className="card max-h-[85vh] w-full max-w-4xl overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="overline">Side-by-side</div>
            <h2 className="mt-1 font-display text-2xl text-ink">
              Comparing {candidates.length} candidates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost px-3 py-1.5 text-sm"
            aria-label="Close comparison"
          >
            Close ✕
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                  Metric
                </th>
                {candidates.map((c) => (
                  <th key={c.id} className="px-3 py-3">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="font-mono text-xs text-ember-300 hover:text-ember-200"
                    >
                      #{c.rank}
                    </Link>
                    <div className="mt-1 max-w-[10rem] truncate font-mono text-[10px] text-faint">
                      {c.smiles}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const values = candidates.map(row.value);
                const best = Math.max(...values);
                return (
                  <tr key={row.label} className="border-b border-edge/50">
                    <td className="px-3 py-3 text-dim">
                      {row.label}
                      {row.hint && (
                        <span className="ml-1.5 font-mono text-[10px] text-faint">
                          {row.hint}
                        </span>
                      )}
                    </td>
                    {candidates.map((c, i) => {
                      const isLeader = values[i] === best && candidates.length > 1;
                      return (
                        <td
                          key={c.id}
                          className={`px-3 py-3 font-mono ${
                            isLeader ? "font-bold text-ember-300" : "text-ink"
                          }`}
                        >
                          {row.format(values[i])}
                          {isLeader && <span className="ml-1 text-[10px]">▲</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono text-[10px] leading-relaxed text-faint">
          ▲ marks the highest value in each row across the selected candidates — a
          scan aid for spotting trade-offs, not a recommendation.
        </p>
      </div>
    </div>
  );
}
