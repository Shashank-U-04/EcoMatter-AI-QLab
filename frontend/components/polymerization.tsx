"use client";

import { POLYMER_CLASS_META } from "@/lib/properties";
import { PolymerizationAssessment } from "@/lib/types";

const TONE_CLASS: Record<string, string> = {
  good: "border-ember-400/25 bg-ember-400/[0.07] text-ember-300",
  info: "border-sky-400/25 bg-sky-400/[0.07] text-sky-300",
  warn: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300",
  muted: "border-edge2 bg-raise/[0.03] text-faint",
};

// Compact classification pill — reused on results rows and the detail header.
export function PolymerBadge({
  classification,
  title,
}: {
  classification?: string | null;
  title?: string;
}) {
  if (!classification) return null;
  const meta = POLYMER_CLASS_META[classification];
  if (!meta) return null;
  return (
    <span
      title={title ?? meta.blurb}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        TONE_CLASS[meta.tone]
      }`}
    >
      {meta.tone === "warn" ? "⚠" : meta.tone === "muted" ? "○" : "◆"}
      {meta.label}
    </span>
  );
}

// Full feasibility panel for the candidate detail page.
export default function PolymerizationPanel({
  data,
}: {
  data: PolymerizationAssessment;
}) {
  const meta = POLYMER_CLASS_META[data.classification];
  return (
    <section className="card reveal p-6" style={{ "--d": "300ms" } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-3">
        <div className="overline">Polymerisation feasibility</div>
        <PolymerBadge classification={data.classification} />
      </div>

      {meta && <p className="tagline mt-3 text-base">{meta.blurb}</p>}

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Feasibility
          </div>
          <div className="mt-1 font-display text-2xl text-ink">
            {data.feasibility_score}
            <span className="ml-1 font-mono text-xs font-normal text-faint">/100</span>
          </div>
        </div>
        {data.polymer_family && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Likely family
            </div>
            <div className="mt-1 text-sm text-ink">{data.polymer_family}</div>
          </div>
        )}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Co-monomer
          </div>
          <div className="mt-1 text-sm text-ink">{data.co_monomer_requirement}</div>
        </div>
      </div>

      {data.supported_reaction_types.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.supported_reaction_types.map((r) => (
            <span
              key={r}
              className="rounded-full border border-edge2 bg-raise/[0.03] px-3 py-1 text-[11px] text-dim"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {data.reasons.length > 0 && (
        <>
          <h3 className="overline mt-6">Why</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-dim">
            {data.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-ember-400">◆</span>
                {r}
              </li>
            ))}
          </ul>
        </>
      )}

      {data.warnings.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
            Caveats
          </div>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-amber-200/80">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] leading-relaxed text-faint">
        Rule-based structural screen ({data.rule_version}) — not a reaction prediction,
        synthesis guarantee, or food-safety assessment.
      </p>
    </section>
  );
}
