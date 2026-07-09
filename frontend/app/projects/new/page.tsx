"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { ErrorNote, SectionLabel } from "@/components/ui";
import { createProject, getToken, startGeneration } from "@/lib/api";
import { DOMAINS, DOMAIN_PRESETS, PROPERTIES } from "@/lib/properties";
import { Domain } from "@/lib/types";

const WEIGHT_LABEL: Record<number, string> = { 0.5: "low", 1: "normal", 2: "high", 3: "critical" };

export default function NewProject() {
  const router = useRouter();
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

  function pickDomain(d: Domain) {
    setDomain(d);
    setValues(DOMAIN_PRESETS[d]);
    setName(
      d === "packaging"
        ? "Biodegradable food-packaging film"
        : "Lightweight EV battery separator"
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          <p className="tagline mt-2 text-sm">
            Pick a domain, then dial in the property profile you need. Weights say which
            objectives matter most.
          </p>
        </div>

        <form onSubmit={submit} className="mt-9 space-y-9">
          {error && <ErrorNote message={error} />}

          <div className="reveal" style={{ "--d": "100ms" } as React.CSSProperties}>
            <label className="label">Application domain</label>
            <div className="grid gap-4 sm:grid-cols-2">
              {DOMAINS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => pickDomain(d.key)}
                  className={`card p-5 text-left transition-all duration-300 ${
                    domain === d.key
                      ? "border-ember-400/60 shadow-glow"
                      : "card-hover opacity-80"
                  }`}
                >
                  <div className="text-2xl">{d.emoji}</div>
                  <div className="mt-2 font-display text-lg text-ink">{d.label}</div>
                  <div className="mt-1 text-xs leading-relaxed text-dim">{d.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="reveal" style={{ "--d": "200ms" } as React.CSSProperties}>
            <label className="label">Project name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-5">
            <label className="label">Target property profile</label>
            {PROPERTIES.map((p, i) => (
              <div
                key={p.key}
                className="card reveal p-5"
                style={{ "--d": `${280 + i * 80}ms` } as React.CSSProperties}
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-medium text-ink">{p.label}</span>
                    <span className="ml-2 text-xs text-faint">{p.hint}</span>
                  </div>
                  <span className="font-mono text-base font-bold text-ember-300">
                    {values[p.key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={values[p.key]}
                  onChange={(e) => setValues({ ...values, [p.key]: Number(e.target.value) })}
                  className="mt-4 w-full accent-ember-400"
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
                          ? "bg-ember-400/20 text-ember-300 shadow-glow"
                          : "bg-white/5 text-faint hover:text-dim"
                      }`}
                    >
                      {WEIGHT_LABEL[w]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-primary reveal w-full py-3.5 text-base"
            style={{ "--d": "700ms" } as React.CSSProperties}
            disabled={busy}
          >
            {busy ? "Starting generation…" : "Generate candidate materials"}
          </button>
        </form>
      </main>
    </>
  );
}
