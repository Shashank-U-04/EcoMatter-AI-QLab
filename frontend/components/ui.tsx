"use client";

import Link from "next/link";
import { PROPERTY_LABEL } from "@/lib/properties";

export function ScoreBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const hue = Math.round((pct / 100) * 120); // red -> green
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span className="font-semibold">{pct.toFixed(0)}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: `hsl(${hue} 65% 45%)` }}
        />
      </div>
    </div>
  );
}

export function PropertyRow({
  name,
  value,
  confidence,
}: {
  name: string;
  value: number;
  confidence?: number;
}) {
  return (
    <div className="py-2">
      <ScoreBar value={value} label={PROPERTY_LABEL[name] || name} />
      {confidence !== undefined && (
        <div className="mt-1 text-[11px] text-slate-400">
          confidence {(confidence * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="text-xs text-slate-400">
      Property values are AI screening estimates from descriptor-based surrogate
      models — directional guidance for shortlisting, not lab-grade measurements.
    </p>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-brand-600 hover:underline">
      ← {children}
    </Link>
  );
}
