"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { ErrorNote } from "@/components/ui";
import { createProject, getToken, startGeneration } from "@/lib/api";
import { DOMAINS, DOMAIN_PRESETS, PROPERTIES } from "@/lib/properties";
import { Domain } from "@/lib/types";

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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Design a new material</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a domain, then dial in the property profile you need. Weights say
          which objectives matter most.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-8">
          {error && <ErrorNote message={error} />}

          <div>
            <label className="label">Application domain</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOMAINS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => pickDomain(d.key)}
                  className={`card p-4 text-left transition ${
                    domain === d.key ? "border-brand-500 ring-1 ring-brand-500" : "hover:border-brand-300"
                  }`}
                >
                  <div className="text-2xl">{d.emoji}</div>
                  <div className="mt-1 font-semibold text-slate-900">{d.label}</div>
                  <div className="text-xs text-slate-500">{d.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Project name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-5">
            <label className="label">Target property profile</label>
            {PROPERTIES.map((p) => (
              <div key={p.key} className="card p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-medium text-slate-800">{p.label}</span>
                    <span className="ml-2 text-xs text-slate-400">{p.hint}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-700">{values[p.key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={values[p.key]}
                  onChange={(e) => setValues({ ...values, [p.key]: Number(e.target.value) })}
                  className="mt-3 w-full accent-brand-600"
                />
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>Importance</span>
                  {[0.5, 1, 2, 3].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeights({ ...weights, [p.key]: w })}
                      className={`rounded px-2 py-0.5 ${
                        weights[p.key] === w ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {w === 0.5 ? "low" : w === 1 ? "normal" : w === 2 ? "high" : "critical"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary w-full py-3 text-base" disabled={busy}>
            {busy ? "Starting generation…" : "Generate candidate materials"}
          </button>
        </form>
      </main>
    </>
  );
}
