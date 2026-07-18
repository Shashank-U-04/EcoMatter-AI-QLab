"use client";

import { useState } from "react";
import { PROPERTIES } from "@/lib/properties";

// Minimum-threshold filters over candidate property predictions. A value of 0 means
// the property is not filtered. Filtering itself lives in the parent (client-side over
// already-loaded predictions); this component only owns the control surface.
export default function CandidateFilters({
  values,
  onChange,
  shownCount,
  totalCount,
}: {
  values: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  shownCount: number;
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = PROPERTIES.filter((p) => (values[p.key] ?? 0) > 0).length;

  function setMin(key: string, min: number) {
    onChange({ ...values, [key]: min });
  }

  function reset() {
    onChange(Object.fromEntries(PROPERTIES.map((p) => [p.key, 0])));
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-300 ${
            activeCount > 0
              ? "bg-ember-400/10 text-ember-300"
              : "bg-raise/5 text-faint hover:text-dim"
          }`}
          aria-expanded={open}
        >
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-ember-400/20 px-1.5 text-[10px] text-ember-200">
              {activeCount}
            </span>
          )}
          <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        {activeCount > 0 && (
          <>
            <span className="font-mono text-[11px] text-dim">
              {shownCount} of {totalCount} candidates match
            </span>
            <button
              onClick={reset}
              className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-ink"
            >
              Reset
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="card reveal mt-3 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTIES.map((p) => {
            const min = values[p.key] ?? 0;
            return (
              <div key={p.key}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-dim">{p.label}</span>
                  <span className="font-mono text-xs font-bold text-ink">
                    {min > 0 ? `≥ ${min}` : "any"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={min}
                  onChange={(e) => setMin(p.key, Number(e.target.value))}
                  className="mt-2 w-full accent-ember-500"
                  aria-label={`Minimum ${p.label}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
