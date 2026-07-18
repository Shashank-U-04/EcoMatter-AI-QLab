"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/nav";
import { Badge, ErrorNote, RunStatusBadge, SectionLabel, Spinner } from "@/components/ui";
import { getToken, listProjects } from "@/lib/api";
import { DOMAINS } from "@/lib/properties";
import { Project } from "@/lib/types";

const DOMAIN_LABEL = Object.fromEntries(DOMAINS.map((d) => [d.key, d.label]));

type StatusFilter = "all" | "completed" | "running" | "draft";
type SortKey = "recent" | "name" | "score";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Ready" },
  { key: "running", label: "Running" },
  { key: "draft", label: "Not run" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "score", label: "Best score" },
];

function matchesStatus(p: Project, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  const s = p.latest_run_status;
  if (filter === "completed") return s === "completed";
  if (filter === "running") return s === "running" || s === "pending";
  return !s || s === "failed"; // "draft" = never successfully run
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err.message));
  }, [router]);

  const shown = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    const filtered = projects.filter(
      (p) => matchesStatus(p, status) && (!q || p.name.toLowerCase().includes(q))
    );
    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "score")
      sorted.sort((a, b) => (b.top_score ?? -1) - (a.top_score ?? -1));
    else
      sorted.sort(
        (a, b) =>
          new Date(b.last_activity ?? b.created_at).getTime() -
          new Date(a.last_activity ?? a.created_at).getTime()
      );
    return sorted;
  }, [projects, query, status, sort]);

  const hasProjects = !!projects && projects.length > 0;

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

        {hasProjects && (
          <>
            {/* Triage controls */}
            <div
              className="reveal mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ "--d": "40ms" } as React.CSSProperties}
            >
              <input
                className="input w-full sm:max-w-xs"
                placeholder="Search projects by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search projects"
              />
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                    Show
                  </span>
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatus(f.key)}
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                        status === f.key
                          ? "bg-ember-400/10 text-ember-300"
                          : "bg-raise/5 text-faint hover:text-dim"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                    Sort
                  </span>
                  {SORTS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSort(s.key)}
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                        sort === s.key
                          ? "bg-ember-400/10 text-ember-300"
                          : "bg-raise/5 text-faint hover:text-dim"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="card card-hover reveal flex flex-col p-6"
                  style={{ "--d": `${Math.min(i * 60, 400)}ms` } as React.CSSProperties}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl leading-snug text-ink">{p.name}</h3>
                    <Badge>{DOMAIN_LABEL[p.domain] || p.domain}</Badge>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <RunStatusBadge status={p.latest_run_status} />
                    {p.latest_run_status === "completed" &&
                      p.candidate_count != null && (
                        <span className="font-mono text-[11px] text-dim">
                          {p.candidate_count} candidate{p.candidate_count === 1 ? "" : "s"}
                          {p.top_score != null && (
                            <>
                              {" · best "}
                              <b className="text-ink">{p.top_score.toFixed(1)}</b>
                            </>
                          )}
                        </span>
                      )}
                  </div>
                  <p className="mt-auto font-mono text-[11px] tracking-wide text-faint">
                    {new Date(p.last_activity ?? p.created_at).toLocaleDateString()} ·{" "}
                    {p.property_targets.length} targets
                  </p>
                </Link>
              ))}
            </div>

            {shown.length === 0 && (
              <p className="card reveal p-10 text-center text-sm text-dim">
                No projects match your search or filter.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
