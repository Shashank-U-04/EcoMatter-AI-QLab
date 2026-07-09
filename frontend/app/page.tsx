import Link from "next/link";
import Nav from "@/components/nav";
import { DOMAINS } from "@/lib/properties";

export default function Landing() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4">
        <section className="py-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">
            Samsung Solve for Tomorrow 2026 · AI Living for India
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Describe the material you need. Let AI invent the molecule.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            EcoMatter AI-QLab turns a list of target properties — biodegradable,
            lightweight, heat-resistant, low-cost — into a ranked shortlist of
            novel, makeable material candidates, each with a plausible synthesis
            route. Months of lab trial-and-error, compressed into a same-day search.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Try the demo
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              Log in
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-12 sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <div key={d.key} className="card p-6">
              <div className="mb-2 text-3xl">{d.emoji}</div>
              <h3 className="text-lg font-semibold text-slate-900">{d.label}</h3>
              <p className="mt-1 text-sm text-slate-600">{d.blurb}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 border-t border-slate-200 py-12 sm:grid-cols-4">
          {[
            ["1. Define", "Set target properties with sliders and pick a domain."],
            ["2. Generate", "A genetic algorithm evolves valid candidate molecules."],
            ["3. Screen & rank", "AI predictors score each on a multi-objective profile."],
            ["4. Explain & make", "See why it ranked, similar molecules, and a synthesis route."],
          ].map(([title, body]) => (
            <div key={title}>
              <h4 className="font-semibold text-brand-700">{title}</h4>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
          Honest AI: molecule generation and property screening are original ML;
          retrosynthesis orchestrates an existing chemistry engine. No lab-grade
          claims — this is a discovery accelerator.
        </footer>
      </main>
    </>
  );
}
