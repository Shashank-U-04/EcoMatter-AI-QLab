"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { Badge, ErrorNote, SectionLabel, Spinner } from "@/components/ui";
import { getToken, listProjects } from "@/lib/api";
import { DOMAINS } from "@/lib/properties";
import { Project } from "@/lib/types";

const DOMAIN_LABEL = Object.fromEntries(DOMAINS.map((d) => [d.key, d.label]));

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Laboratory</SectionLabel>
            <h1 className="font-display text-4xl text-ink">Your projects</h1>
          </div>
          <Link href="/projects/new" className="btn-primary">
            + New project
          </Link>
        </div>

        {error && <ErrorNote message={error} />}
        {!projects && !error && <Spinner label="Loading projects…" />}

        {projects && projects.length === 0 && (
          <div className="card reveal p-14 text-center">
            <p className="tagline text-lg">The bench is empty.</p>
            <p className="mt-2 text-sm text-dim">
              Define a property profile and let the engine search.
            </p>
            <Link href="/projects/new" className="btn-primary mt-6 inline-flex">
              Design your first material
            </Link>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card card-hover reveal p-6"
                style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl leading-snug text-ink">{p.name}</h3>
                  <Badge>{DOMAIN_LABEL[p.domain] || p.domain}</Badge>
                </div>
                <p className="font-mono text-[11px] tracking-wide text-faint">
                  {new Date(p.created_at).toLocaleDateString()} · {p.property_targets.length}{" "}
                  targets
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
