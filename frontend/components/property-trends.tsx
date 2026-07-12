"use client";

import { useId, useMemo, useRef, useState } from "react";
import { PROPERTY_LABEL } from "@/lib/properties";
import { CandidateSummary, PropertyTarget } from "@/lib/types";

// Same theme-aware chart tokens as FitnessChart (set in globals.css).
const LINE = "var(--chart-line)";
const RING = "var(--chart-ring)";
const TARGET_LINE = "rgb(var(--c-ink) / 0.25)";

const W = 220;
const H = 56;
const PAD = { top: 6, right: 6, bottom: 6, left: 6 };

interface SeriesPoint {
  rank: number;
  value: number;
}

function TrendCard({
  label,
  series,
  target,
  delay,
}: {
  label: string;
  series: SeriesPoint[];
  target: number;
  delay: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { points, targetY } = useMemo(() => {
    const values = series.map((s) => s.value);
    const lo = Math.min(...values, target);
    const hi = Math.max(...values, target);
    const span = Math.max(hi - lo, 1);
    const yMin = lo - span * 0.12;
    const yMax = hi + span * 0.12;
    const x = (i: number) =>
      series.length === 1
        ? W / 2
        : PAD.left + (i / (series.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
    return {
      points: series.map((s, i) => ({ ...s, x: x(i), y: y(s.value) })),
      targetY: y(target),
    };
  }, [series, target]);

  const best = Math.max(...series.map((s) => s.value));
  const avg = series.reduce((sum, s) => sum + s.value, 0) / series.length;
  const delta = best - target;
  const isOnTarget = delta >= 0;
  const hover = hoverIdx !== null ? points[hoverIdx] : null;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const baseY = H - PAD.bottom;
  const area =
    points.length >= 2
      ? `${path} L${points[points.length - 1].x.toFixed(1)},${baseY} L${points[0].x.toFixed(1)},${baseY} Z`
      : "";

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - px);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  return (
    <section
      className="card reveal p-5"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="overline">{label}</div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
            isOnTarget ? "bg-ember-400/10 text-ember-300" : "bg-red-500/10 text-red-300"
          }`}
          title={`Best candidate vs your target of ${target}`}
        >
          {isOnTarget ? "+" : "−"}
          {Math.abs(delta).toFixed(0)} vs target
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-3xl text-ink">{best.toFixed(0)}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          best of {series.length}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full touch-none select-none"
        role="img"
        aria-label={`${label}: predicted values across ${series.length} ranked candidates, best ${best.toFixed(0)}, target ${target}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: LINE }} stopOpacity="0.14" />
            <stop offset="100%" style={{ stopColor: LINE }} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* target reference */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={targetY}
          y2={targetY}
          style={{ stroke: TARGET_LINE }}
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {points.length >= 2 && (
          <path
            d={path}
            fill="none"
            style={{ stroke: LINE }}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {(hover ?? points[0]) && (
          <circle
            cx={(hover ?? points[0]).x}
            cy={(hover ?? points[0]).y}
            r="3.5"
            style={{ fill: LINE, stroke: RING }}
            strokeWidth="2"
          />
        )}
      </svg>

      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
        {hover ? (
          <span>
            candidate #{hover.rank} · <b className="text-ink">{hover.value.toFixed(0)}</b>
          </span>
        ) : (
          <span>avg {avg.toFixed(0)} · by rank</span>
        )}
        <span>target {target}</span>
      </div>
    </section>
  );
}

/**
 * One card per project target property, showing how that property is
 * distributed across the ranked candidate list (best value, delta vs the
 * user's target, sparkline ordered by rank).
 */
export default function PropertyTrends({
  targets,
  candidates,
}: {
  targets: PropertyTarget[];
  candidates: CandidateSummary[];
}) {
  const cards = useMemo(() => {
    const byRank = [...candidates].sort((a, b) => a.rank - b.rank);
    return targets
      .map((t) => ({
        key: t.property_name,
        label: PROPERTY_LABEL[t.property_name] || t.property_name,
        target: t.target_value,
        series: byRank
          .map((c) => ({
            rank: c.rank,
            value: c.predictions.find((p) => p.property_name === t.property_name)
              ?.predicted_value,
          }))
          .filter((s): s is SeriesPoint => s.value !== undefined),
      }))
      .filter((c) => c.series.length > 0);
  }, [targets, candidates]);

  if (cards.length === 0) return null;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => (
        <TrendCard
          key={c.key}
          label={c.label}
          series={c.series}
          target={c.target}
          delay={i * 70}
        />
      ))}
    </div>
  );
}
