"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/nav";
import { ErrorNote, SectionLabel, Spinner } from "@/components/ui";
import { getReferenceLibrary } from "@/lib/api";
import { ReferenceMolecule } from "@/lib/types";

export default function ReferenceLibrary() {
  const [molecules, setMolecules] = useState<ReferenceMolecule[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getReferenceLibrary()
      .then((res) => setMolecules(res.molecules))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load library"));
  }, []);

  const shown = useMemo(() => {
    if (!molecules) return [];
    const q = query.trim().toLowerCase();
    if (!q) return molecules;
    return molecules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q) ||
        m.formula.toLowerCase().includes(q)
    );
  }, [molecules, query]);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="reveal">
          <SectionLabel>Reference library</SectionLabel>
          <h1 className="font-display text-3xl text-ink">Seed monomers</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
            The {molecules?.length ?? 30} building blocks the genetic search evolves from —
            monomers of proven bioplastics and sustainable materials. Descriptors are computed
            with RDKit from each structure.
          </p>
        </div>

        <div className="reveal mt-6 max-w-sm" style={{ "--d": "80ms" } as React.CSSProperties}>
          <input
            className="input w-full"
            placeholder="Search by name, role, or formula…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <div className="mt-6"><ErrorNote message={error} /></div>}
        {!molecules && !error && (
          <div className="mt-12 flex justify-center">
            <Spinner label="Loading library…" />
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m, i) => (
            <article
              key={m.smiles}
              className="card reveal flex flex-col overflow-hidden"
              style={{ "--d": `${Math.min(i * 40, 400)}ms` } as React.CSSProperties}
            >
              <div className="flex h-44 items-center justify-center bg-[#f4f4ef]">
                {m.svg ? (
                  <div
                    className="[&_svg]:h-40 [&_svg]:w-auto [&_svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: m.svg }}
                  />
                ) : (
                  <span className="font-mono text-xs text-neutral-500">{m.smiles}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg text-ink">{m.name}</h2>
                  <span className="font-mono text-[11px] text-ember-300">{m.formula}</span>
                </div>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-dim">{m.note}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-edge pt-3 font-mono text-[10px] uppercase tracking-wider">
                  <div>
                    <dt className="text-faint">MW</dt>
                    <dd className="mt-0.5 text-xs normal-case text-ink">{m.mol_weight}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">logP</dt>
                    <dd className="mt-0.5 text-xs normal-case text-ink">{m.logp}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">TPSA</dt>
                    <dd className="mt-0.5 text-xs normal-case text-ink">{m.tpsa}</dd>
                  </div>
                </dl>
                <p className="mt-3 break-all font-mono text-[10px] text-faint">{m.smiles}</p>
              </div>
            </article>
          ))}
        </div>

        {molecules && shown.length === 0 && (
          <p className="mt-10 text-center text-sm text-dim">
            No monomers match “{query}”.
          </p>
        )}
      </main>
    </>
  );
}
