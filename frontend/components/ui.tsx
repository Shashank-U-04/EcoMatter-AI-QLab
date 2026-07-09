"use client";

import Link from "next/link";
import { PROPERTY_LABEL } from "@/lib/properties";

export function ScoreBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-dim">{label}</span>
          <span className="font-mono text-xs font-semibold text-ink">{pct.toFixed(0)}</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundImage: "linear-gradient(90deg, #1d8a4e, #3bbd6c)",
          }}
        />
      </div>
    </div>
  );
}

const MODEL_TAGS: Record<string, string> = {
  "rdkit-3d-density-v1": "3D-computed",
  "heuristic-v1": "estimate",
};

export function PropertyRow({
  name,
  value,
  confidence,
  modelVersion,
}: {
  name: string;
  value: number;
  confidence?: number;
  modelVersion?: string;
}) {
  const tag = modelVersion ? MODEL_TAGS[modelVersion] ?? "model" : undefined;
  const isReal = modelVersion !== undefined && modelVersion !== "heuristic-v1";
  return (
    <div className="py-2.5">
      <ScoreBar value={value} label={PROPERTY_LABEL[name] || name} />
      <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-faint">
        {confidence !== undefined && <span>confidence {(confidence * 100).toFixed(0)}%</span>}
        {tag && (
          <span className={isReal ? "text-ember-400/70" : "text-faint"}>· {tag}</span>
        )}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent";
}) {
  const styles =
    tone === "accent"
      ? "border-ember-400/20 bg-ember-400/[0.07] text-ember-300"
      : "border-edge2 bg-white/[0.04] text-dim";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-dim">
      <span className="relative flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-30" />
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ember-400 border-t-transparent" />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="reveal rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
      {message}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
      Property values are AI screening estimates from descriptor-based surrogate
      models — directional guidance for shortlisting, not lab-grade measurements.
    </p>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-faint transition-colors hover:text-ember-300"
    >
      <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
      {children}
    </Link>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="overline mb-3">{children}</div>;
}
