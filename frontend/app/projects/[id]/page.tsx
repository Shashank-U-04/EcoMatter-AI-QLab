"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/nav";
import { BackLink, Badge, Disclaimer, ErrorNote, ScoreBar, SectionLabel } from "@/components/ui";
import {
  deleteProject,
  downloadReport,
  getProject,
  getToken,
  latestRun,
  listCandidates,
  renameProject,
  startGeneration,
  toggleStar,
} from "@/lib/api";
import { PROPERTY_LABEL } from "@/lib/properties";
import { CandidateSummary, Project, RunStatus } from "@/lib/types";

type SortKey = "rank" | "novelty" | "starred";

export default function ProjectResults() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [run, setRun] = useState<RunStatus | null>(null);
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [starredOnly, setStarredOnly] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCandidates = useCallback(async () => {
    const list = await listCandidates(projectId);
    setCandidates(list);
  }, [projectId]);

  const poll = useCallback(async () => {
    try {
      const status = await latestRun(projectId);
      setRun(status);
      if (status.status === "completed") {
        if (pollRef.current) clearInterval(pollRef.current);
        await loadCandidates();
      } else if (status.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setError(status.error || "Generation failed.");
      }
    } catch {
      /* no run yet */
    }
  }, [projectId, loadCandidates]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    getProject(projectId).then(setProject).catch((e) => setError(e.message));
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [projectId, poll, router]);

  async function regenerate() {
    setError("");
    setCandidates([]);
    await startGeneration(projectId);
    poll();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, 2000);
  }

  async function saveRename() {
    const name = nameDraft.trim();
    setEditingName(false);
    if (!project || !name || name === project.name) return;
    try {
      setProject(await renameProject(projectId, name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    }
  }

  async function removeProject() {
    try {
      await deleteProject(projectId);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setConfirmDelete(false);
    }
  }

  async function star(c: CandidateSummary) {
    // Optimistic toggle; revert on failure.
    setCandidates((cs) =>
      cs.map((x) => (x.id === c.id ? { ...x, starred: !x.starred } : x))
    );
    try {
      await toggleStar(c.id);
    } catch {
      setCandidates((cs) =>
        cs.map((x) => (x.id === c.id ? { ...x, starred: c.starred } : x))
      );
    }
  }

  const shown = useMemo(() => {
    let list = starredOnly ? candidates.filter((c) => c.starred) : [...candidates];
    if (sortKey === "novelty") list.sort((a, b) => b.novelty_score - a.novelty_score);
    else if (sortKey === "starred")
      list.sort((a, b) => Number(b.starred) - Number(a.starred) || a.rank - b.rank);
    else list.sort((a, b) => a.rank - b.rank);
    return list;
  }, [candidates, sortKey, starredOnly]);

  const running = run && (run.status === "pending" || run.status === "running");
  const progressPct =
    run && run.progress_total > 0
      ? Math.round((run.progress_generation / run.progress_total) * 100)
      : 0;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <BackLink href="/dashboard">Back to projects</BackLink>

        <div className="reveal mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <SectionLabel>Experiment</SectionLabel>
            <div className="flex flex-wrap items-center gap-3">
              {editingName ? (
                <input
                  className="input max-w-md font-display text-2xl"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
              ) : (
                <h1
                  className="cursor-pointer font-display text-3xl text-ink transition-colors hover:text-ember-200"
                  title="Click to rename"
                  onClick={() => {
                    setNameDraft(project?.name || "");
                    setEditingName(true);
                  }}
                >
                  {project?.name || "Project"}
                </h1>
              )}
              {project && <Badge tone="accent">{project.domain}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {run?.status === "completed" && (
              <>
                <button onClick={() => downloadReport(projectId, "pdf")} className="btn-ghost px-4 py-2">
                  PDF
                </button>
                <button onClick={() => downloadReport(projectId, "csv")} className="btn-ghost px-4 py-2">
                  CSV
                </button>
                <button onClick={() => downloadReport(projectId, "json")} className="btn-ghost px-4 py-2">
                  JSON
                </button>
                <button onClick={regenerate} className="btn-primary">
                  Re-run
                </button>
              </>
            )}
            {confirmDelete ? (
              <span className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
                Delete project and all results?
                <button onClick={removeProject} className="font-bold underline underline-offset-2">
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-dim hover:text-ink">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost px-4 py-2 text-red-400/70 hover:text-red-300"
                title="Delete project"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {project && (
          <div className="reveal mt-5 flex flex-wrap gap-2" style={{ "--d": "100ms" } as React.CSSProperties}>
            {project.property_targets.map((t) => (
              <span
                key={t.property_name}
                className="rounded-full border border-edge bg-panel px-3.5 py-1.5 font-mono text-[11px] text-dim"
              >
                {PROPERTY_LABEL[t.property_name] || t.property_name}:{" "}
                <b className="text-ink">{t.target_value}</b>
                {t.weight !== 1 && <span className="text-ember-300"> ×{t.weight}</span>}
              </span>
            ))}
          </div>
        )}

        {error && <div className="mt-6"><ErrorNote message={error} /></div>}

        {running && (
          <div className="card reveal mt-9 flex flex-col items-center gap-5 p-12">
            <div className="overline animate-pulseGlow">
              {run.progress_total > 0
                ? `Generation ${run.progress_generation} of ${run.progress_total}`
                : "Preparing genetic search"}
            </div>
            <p className="tagline text-center text-lg">
              Evolving candidate molecules — recombining fragments, screening properties…
            </p>
            <div className="w-full max-w-md">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                {run.progress_total > 0 ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ember-700 to-ember-500 transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(progressPct, 3)}%` }}
                  />
                ) : (
                  <div className="shimmer-bar h-full w-full rounded-full" />
                )}
              </div>
              <div className="mt-2.5 flex justify-between font-mono text-[11px] tracking-wide text-faint">
                <span>
                  {run.progress_valid_count > 0 && `${run.progress_valid_count} valid molecules in pool`}
                </span>
                <span>
                  {run.progress_best_fitness > 0 &&
                    `best fitness ${(run.progress_best_fitness * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>
        )}

        {run?.status === "completed" && candidates.length > 0 && (
          <>
            <div
              className="reveal mt-8 flex flex-wrap items-center justify-between gap-3"
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Sort</span>
                {(["rank", "novelty", "starred"] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSortKey(k)}
                    className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
                      sortKey === k ? "bg-ember-400/10 text-ember-300" : "bg-white/5 text-faint hover:text-dim"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-dim">
                <input
                  type="checkbox"
                  checked={starredOnly}
                  onChange={(e) => setStarredOnly(e.target.checked)}
                  className="accent-ember-500"
                />
                shortlist only ({candidates.filter((c) => c.starred).length})
              </label>
            </div>

            <div className="card reveal mt-4 overflow-hidden" style={{ "--d": "180ms" } as React.CSSProperties}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-edge text-left font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
                      <th className="px-4 py-3.5" />
                      <th className="px-2 py-3.5">#</th>
                      <th className="px-3 py-3.5">Structure (SMILES)</th>
                      <th className="px-3 py-3.5">Score</th>
                      <th className="px-3 py-3.5">Novelty</th>
                      <th className="w-52 px-3 py-3.5">Top property</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => {
                      const top = [...c.predictions].sort(
                        (a, b) => b.predicted_value - a.predicted_value
                      )[0];
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-edge/50 transition-colors duration-300 hover:bg-ember-400/5"
                        >
                          <td className="px-4 py-4">
                            <button
                              onClick={() => star(c)}
                              className={`text-base transition-all duration-300 ${
                                c.starred ? "text-ember-300" : "text-edge2 hover:text-dim"
                              }`}
                              title={c.starred ? "Remove from shortlist" : "Add to shortlist"}
                            >
                              {c.starred ? "★" : "☆"}
                            </button>
                          </td>
                          <td
                            className={`px-2 py-4 font-mono text-base font-bold ${
                              c.rank === 1 ? "text-ember-400" : "text-dim"
                            }`}
                          >
                            {c.rank}
                          </td>
                          <td className="max-w-xs truncate px-3 py-4 font-mono text-xs text-dim">
                            {c.smiles}
                          </td>
                          <td className="px-3 py-4 font-mono font-bold text-ink">
                            {c.composite_score.toFixed(1)}
                          </td>
                          <td className="px-3 py-4 font-mono text-xs text-dim">
                            {(c.novelty_score * 100).toFixed(0)}%
                          </td>
                          <td className="px-3 py-4">
                            {top && (
                              <ScoreBar
                                value={top.predicted_value}
                                label={PROPERTY_LABEL[top.property_name]}
                              />
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/candidates/${c.id}`}
                              className="group inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ember-300 transition-colors hover:text-ember-200"
                            >
                              Open
                              <span className="transition-transform duration-300 group-hover:translate-x-1">
                                →
                              </span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {shown.length === 0 && (
                <p className="p-8 text-center text-sm text-dim">
                  Nothing on the shortlist yet — star candidates to collect them here.
                </p>
              )}
            </div>
            <div className="mt-5"><Disclaimer /></div>
          </>
        )}

        {run?.status === "completed" && candidates.length === 0 && (
          <div className="card reveal mt-9 p-12 text-center">
            <p className="tagline text-lg">No candidates matched this profile well.</p>
            <p className="mt-2 text-sm text-dim">
              Try relaxing a constraint or lowering a weight, then re-run.
            </p>
            <button onClick={regenerate} className="btn-primary mt-6">
              Re-run
            </button>
          </div>
        )}
      </main>
    </>
  );
}
