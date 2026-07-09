"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { Badge, ErrorNote, Spinner } from "@/components/ui";
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Your projects</h1>
          <Link href="/projects/new" className="btn-primary">+ New project</Link>
        </div>

        {error && <ErrorNote message={error} />}
        {!projects && !error && <Spinner label="Loading projects…" />}

        {projects && projects.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-slate-600">No projects yet.</p>
            <Link href="/projects/new" className="btn-primary mt-4">
              Design your first material
            </Link>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card p-5 transition hover:border-brand-400 hover:shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <Badge>{DOMAIN_LABEL[p.domain] || p.domain}</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(p.created_at).toLocaleDateString()} · {p.property_targets.length} targets
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
