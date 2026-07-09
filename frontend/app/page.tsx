import Link from "next/link";
import Nav from "@/components/nav";
import { DOMAINS } from "@/lib/properties";

const STEPS = [
  ["01", "Define", "Set target properties with sliders and pick a domain."],
  ["02", "Generate", "A genetic algorithm evolves valid candidate molecules."],
  ["03", "Screen & rank", "AI predictors score each on a multi-objective profile."],
  ["04", "Explain & make", "See why it ranked, similar molecules, and a synthesis route."],
];

export default function Landing() {
  return (
    <>
      {/* Emerald ribbon atmosphere (quantum-branding reference) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -right-40 -top-64 h-[42rem] w-[42rem] animate-drift rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "conic-gradient(from 120deg, transparent 10%, #0f7a3d 30%, #3ee06e 48%, #b7f65c 55%, transparent 75%)",
          }}
        />
        <div
          className="absolute -bottom-72 -left-52 h-[46rem] w-[46rem] animate-drift rounded-full opacity-15 blur-3xl"
          style={{
            animationDelay: "-11s",
            background:
              "conic-gradient(from 300deg, transparent 15%, #0b3b24 35%, #3ee06e 52%, transparent 78%)",
          }}
        />
      </div>

      <Nav />
      <main className="relative mx-auto max-w-6xl px-4">
        <section className="pb-20 pt-24 text-center sm:pt-32">
          <p className="overline reveal">
            Samsung Solve for Tomorrow 2026 · AI Living for India
          </p>
          <h1
            className="reveal mx-auto mt-6 max-w-4xl font-display text-5xl leading-[1.05] text-ink sm:text-7xl"
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            Describe the material.
            <br />
            <em className="bg-gradient-to-r from-ember-200 via-ember-400 to-ember-700 bg-clip-text text-transparent">
              Let AI invent the molecule.
            </em>
          </h1>
          <p
            className="reveal mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-dim"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            EcoMatter AI-QLab turns a list of target properties — biodegradable,
            lightweight, heat-resistant, low-cost — into a ranked shortlist of novel,
            makeable material candidates, each with a plausible synthesis route.
          </p>
          <div
            className="reveal mt-10 flex justify-center gap-3"
            style={{ "--d": "360ms" } as React.CSSProperties}
          >
            <Link href="/signup" className="btn-primary px-8 py-3 text-base">
              Try the demo
            </Link>
            <Link href="/login" className="btn-ghost px-8 py-3 text-base">
              Log in
            </Link>
          </div>
          <p
            className="reveal mt-6 font-mono text-[11px] tracking-wide text-faint"
            style={{ "--d": "480ms" } as React.CSSProperties}
          >
            property targets → ranked molecules in under 2 minutes
          </p>
        </section>

        <section className="grid gap-5 pb-16 sm:grid-cols-2">
          {DOMAINS.map((d, i) => (
            <div
              key={d.key}
              className="card card-hover reveal p-7"
              style={{ "--d": `${520 + i * 120}ms` } as React.CSSProperties}
            >
              <div className="mb-3 text-3xl">{d.emoji}</div>
              <h3 className="font-display text-2xl text-ink">{d.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{d.blurb}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-edge py-16">
          <div className="overline mb-8">How it works</div>
          <div className="grid gap-8 sm:grid-cols-4">
            {STEPS.map(([num, title, body], i) => (
              <div
                key={num}
                className="reveal"
                style={{ "--d": `${i * 100}ms` } as React.CSSProperties}
              >
                <div className="font-pixel text-2xl font-black text-ember-400">{num}</div>
                <h4 className="mt-2 font-display text-xl text-ink">{title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-dim">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-edge py-10 text-center">
          <p className="tagline mx-auto max-w-2xl text-sm">
            Honest AI: molecule generation and property screening are original ML;
            retrosynthesis orchestrates an existing chemistry engine. No lab-grade
            claims — this is a discovery accelerator.
          </p>
        </footer>
      </main>
    </>
  );
}
