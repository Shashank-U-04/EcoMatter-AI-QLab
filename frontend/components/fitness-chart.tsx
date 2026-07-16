"use client";

import { useMemo, useRef, useState } from "react";
import { GenerationPoint } from "@/lib/types";

// Line color per theme (set in globals.css): #1fae60 (ember-600) on the dark
// panel, #0f7a3d (ember-700) on light — both validated for 3:1 contrast.
const LINE = "var(--chart-line)";
const RING = "var(--chart-ring)"; // dot outline, matches the panel surface
const GRID = "rgb(var(--c-ink) / 0.07)";
const CROSSHAIR = "rgb(var(--c-ink) / 0.16)";

const W = 640;
const H = 180;
const PAD = { top: 14, right: 52, bottom: 24, left: 44 };

export default function FitnessChart({ history }: { history: GenerationPoint[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { points, yTicks, yMin, yMax } = useMemo(() => {
    const best = history.map((p) => p.best);
    const lo = Math.min(...best);
    const hi = Math.max(...best);
    const span = Math.max(hi - lo, 0.01);
    const yMin = Math.max(0, lo - span * 0.15);
    const yMax = Math.min(1, hi + span * 0.15);
    const x = (i: number) =>
      history.length === 1
        ? (PAD.left + W - PAD.right) / 2
        : PAD.left + (i / (history.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
    const points = history.map((p, i) => ({ ...p, x: x(i), y: y(p.best) }));
    const yTicks = [0, 0.5, 1].map((t) => {
      const v = yMin + t * (yMax - yMin);
      return { v, y: y(v) };
    });
    return { points, yTicks, yMin, yMax };
  }, [history]);

  if (history.length < 2) return null;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const baseY = H - PAD.bottom;
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${baseY} L${points[0].x.toFixed(1)},${baseY} Z`;
  const last = points[points.length - 1];
  const hover = hoverIdx !== null ? points[hoverIdx] : null;

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
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          Best fitness by generation
        </span>
        {hover ? (
          <span className="font-mono text-[11px] text-dim">
            gen <b className="text-ink">{hover.gen}</b> · best{" "}
            <b className="text-ink">{(hover.best * 100).toFixed(1)}%</b> · {hover.valid} valid
          </span>
        ) : (
          <span className="font-mono text-[11px] text-faint">
            {history.length} generations
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Line chart: best fitness rose from ${(history[0].best * 100).toFixed(1)}% to ${(last.best * 100).toFixed(1)}% over ${history.length} generations`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="fitness-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: LINE }} stopOpacity="0.16" />
            <stop offset="100%" style={{ stopColor: LINE }} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t.v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={t.y}
              y2={t.y}
              style={{ stroke: GRID }}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={t.y + 3}
              textAnchor="end"
              className="fill-faint font-mono"
              fontSize="9"
            >
              {(t.v * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {[points[0], last].map((p) => (
          <text
            key={p.gen}
            x={p.x}
            y={H - PAD.bottom + 14}
            textAnchor="middle"
            className="fill-faint font-mono"
            fontSize="9"
          >
            gen {p.gen}
          </text>
        ))}

        <path d={area} fill="url(#fitness-fill)" />
        <path d={path} fill="none" style={{ stroke: LINE }} strokeWidth="2" strokeLinejoin="round" />

        {/* end value, direct-labeled */}
        <circle cx={last.x} cy={last.y} r="3.5" style={{ fill: LINE, stroke: RING }} strokeWidth="2" />
        <text
          x={last.x + 8}
          y={last.y + 3}
          className="fill-ink font-mono"
          fontSize="10"
          fontWeight="600"
        >
          {(last.best * 100).toFixed(1)}%
        </text>

        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={H - PAD.bottom}
              style={{ stroke: CROSSHAIR }}
              strokeWidth="1"
            />
            <circle cx={hover.x} cy={hover.y} r="4.5" style={{ fill: LINE, stroke: RING }} strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
}
