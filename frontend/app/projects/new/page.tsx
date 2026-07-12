"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/nav";
import { Badge, ErrorNote, SectionLabel } from "@/components/ui";
import { createProject, getToken, startGeneration } from "@/lib/api";
import {
  DOMAINS,
  DOMAIN_PRESETS,
  PROPERTIES,
  SCENARIO_PRESETS,
  detectConflicts,
} from "@/lib/properties";
import { Domain } from "@/lib/types";

const WEIGHT_LABEL: Record<number, string> = { 0.5: "low", 1: "normal", 2: "high", 3: "critical" };
const STEPS = ["Domain", "Targets", "Review"];

export default function NewProject() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Biodegradable food-packaging film");
  const [domain, setDomain] = useState<Domain>("packaging");
  const [values, setValues] = useState<Record<string, number>>(DOMAIN_PRESETS.packaging);
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(PROPERTIES.map((p) => [p.key, 1]))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  const conflicts = useMemo(() => detectConflicts(values), [values]);

  function pickDomain(d: Domain) {
    setDomain(d);
    setValues(DOMAIN_PRESETS[d]);
    setName(
      d === "packaging"
        ? "Biodegradable food-packaging film"
        : "Lightweight EV battery separator"
    );
  }

  async function launch() {
    setError("");
    setBusy(true);
    try {
      const targets = PROPERTIES.map((p) => ({
        property_name: p.key,
        target_value: values[p.key],
        weight: weights[p.key],
      }));
      const project = await createProject(name, domain, targets);
      await startGeneration(project.id);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start generation");
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="reveal">
          <SectionLabel>New experiment</SectionLabel>
          <h1 className="font-display text-4xl text-ink">Design a new material</h1>
        </div>

        {/* Step indicator */}
        <ol className="reveal mt-7 flex items-center gap-2" style={{ "--d": "80ms" } as React.CSSProperties}>
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-300 ${
                  i === step
                    ? "bg-ember-400/10 text-ember-300"
                    : i < step
                      ? "text-dim hover:text-ink"
                      : "text-faint"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    i < step
                      ? "border-ember-500/40 bg-ember-500/10 text-ember-400"
                      : i === step
                        ? "border-ember-400/40 text-ember-300"
                        : "border-edge2 text-faint"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-edge2" />}
            </li>
          ))}
        </ol>

        {error && <div className="mt-6"><ErrorNote message={error} /></div>}

        {/* ---- Step 1: domain & name ---- */}
        {step === 0 && (
          <div className="reveal mt-8 space-y-7">
            <div>
              <label className="label">Application domain</label>
              <div className="grid gap-4 sm:grid-cols-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => pickDomain(d.key)}
                    className={`card p-5 text-left transition-all duration-300 ${
                      domain === d.key ? "border-ember-400/40 shadow-glow" : "card-hover opacity-75"
                    }`}
                  >
                    <div className="text-2xl">{d.emoji}</div>
                    <div className="mt-2 font-display text-lg text-ink">{d.label}</div>
                    <div className="mt-1 text-xs leading-relaxed text-dim">{d.blurb}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Project name</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button
              className="btn-primary w-full py-3"
              disabled={!name.trim()}
              onClick={() => setStep(1)}
            >
              Continue to targets →
            </button>
          </div>
        )}

        {/* ---- Step 2: property targets ---- */}
        {step === 1 && (
          <div className="reveal mt-8 space-y-6">
            <div>
              <label className="label">Start from a scenario</label>
              <div className="flex flex-wrap gap-2">
                {SCENARIO_PRESETS[domain].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setValues(preset.values)}
                    className="rounded-full border border-edge2 bg-panel px-4 py-1.5 text-xs text-dim transition-all duration-300 hover:border-ember-400/40 hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  Ambitious combination
                </div>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-amber-200/80">
                  {conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-amber-200/60">
                  The engine will still search — it returns best-compromise candidates with the
                  trade-offs explained.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {PROPERTIES.map((p) => (
                <div key={p.key} className="card p-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-medium text-ink">{p.label}</span>
                      <span className="ml-2 text-xs text-faint">{p.hint}</span>
                    </div>
                    <span className="font-mono text-base font-bold text-ink">{values[p.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values[p.key]}
                    onChange={(e) => setValues({ ...values, [p.key]: Number(e.target.value) })}
                    className="mt-4 w-full accent-ember-500"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      Importance
                    </span>
                    {[0.5, 1, 2, 3].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeights({ ...weights, [p.key]: w })}
                        className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                          weights[p.key] === w
                            ? "bg-ember-400/15 text-ember-300"
                            : "bg-raise/5 text-faint hover:text-dim"
                        }`}
                      >
                        {WEIGHT_LABEL[w]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setStep(0)}>
                ← Back
              </button>
              <button className="btn-primary flex-1" onClick={() => setStep(2)}>
                Review →
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 3: review & launch ---- */}
        {step === 2 && (
          <div className="reveal mt-8 space-y-6">
            <div className="card p-6">
              <div className="overline">Experiment summary</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl text-ink">{name}</h2>
                <Badge tone="accent">{DOMAINS.find((d) => d.key === domain)?.label}</Badge>
              </div>
              <div className="mt-5 space-y-2.5">
                {PROPERTIES.map((p) => (
                  <div key={p.key} className="flex items-center justify-between text-sm">
                    <span className="text-dim">
                      {p.label}
                      {weights[p.key] !== 1 && (
                        <span className="ml-2 font-mono text-[10px] uppercase text-ember-300">
                          {WEIGHT_LABEL[weights[p.key]]}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-36 overflow-hidden rounded-full bg-raise/5">
                        <div
                          className="h-full rounded-full bg-ember-600"
                          style={{ width: `${values[p.key]}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs font-bold text-ink">
                        {values[p.key]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {conflicts.length > 0 && (
                <p className="mt-4 text-xs text-amber-200/70">
                  ⚠ {conflicts.length} ambitious trade-off{conflicts.length > 1 ? "s" : ""} flagged —
                  results will explain the compromises made.
                </p>
              )}
              <p className="mt-4 font-mono text-[11px] tracking-wide text-faint">
                genetic search · ~30–90 s · up to 30 ranked candidates
              </p>
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setStep(1)} disabled={busy}>
                ← Adjust targets
              </button>
              <button className="btn-primary flex-1 py-3" onClick={launch} disabled={busy}>
                {busy ? "Starting generation…" : "Launch experiment"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
