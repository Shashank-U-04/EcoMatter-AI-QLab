"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/nav";
import { BackLink, Badge, Disclaimer, ErrorNote, ScoreBar, SectionLabel } from "@/components/ui";
import {
  downloadReport,
  getProject,
  getToken,
  latestRun,
  listCandidates,
  startGeneration,
} from "@/lib/api";
import { PROPERTY_LABEL } from "@/lib/properties";
import { CandidateSummary, Project, RunStatus } from "@/lib/types";

export default function ProjectResults() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [run, setRun] = useState<RunStatus | null>(null);
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [error, setError] = useState("");
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
    pollRef.current = setInterval(poll, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [projectId, poll, router]);

  async function regenerate() {
    setError("");
    setCandidates([]);
    await startGeneration(projectId);
    setRun({ id: 0, status: "running", error: "", started_at: null, finished_at: null });
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, 2500);
  }

  const running = run && (run.status === "pending" || run.status === "running");

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <BackLink href="/dashboard">Back to projects</BackLink>

        <div className="reveal mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Experiment</SectionLabel>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl text-ink">{project?.name || "Project"}</h1>
              {project && <Badge>{project.domain}</Badge>}
            </div>
          </div>
          {run?.status === "completed" && (
            <div className="flex gap-2">
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
            </div>
          )}
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
          <div className="card reveal mt-9 flex flex-col items-center gap-5 p-14">
            <div className="overline animate-pulseGlow">Genetic search in progress</div>
            <p className="tagline text-center text-lg">
              Evolving candidate molecules — recombining fragments, screening properties…
            </p>
            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/5">
              <div className="shimmer-bar h-full w-full rounded-full" />
            </div>
            <p className="font-mono text-[11px] tracking-wide text-faint">
              usually 30–90 seconds
            </p>
          </div>
        )}

        {run?.status === "completed" && candidates.length > 0 && (
          <>
            <div className="card reveal mt-9 overflow-hidden" style={{ "--d": "150ms" } as React.CSSProperties}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-edge text-left font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
                      <th className="px-5 py-3.5">#</th>
                      <th className="px-3 py-3.5">Structure (SMILES)</th>
                      <th className="px-3 py-3.5">Score</th>
                      <th className="px-3 py-3.5">Novelty</th>
                      <th className="w-52 px-3 py-3.5">Top property</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, i) => {
                      const top = [...c.predictions].sort(
                        (a, b) => b.predicted_value - a.predicted_value
                      )[0];
                      return (
                        <tr
                          key={c.id}
                          className="reveal border-b border-edge/50 transition-colors duration-300 hover:bg-ember-400/5"
                          style={{ "--d": `${Math.min(i, 12) * 50}ms` } as React.CSSProperties}
                        >
                          <td className={`px-5 py-4 font-mono text-base font-bold ${c.rank === 1 ? "text-ember-400" : "text-dim"}`}>
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
            </div>
            <div className="mt-5"><Disclaimer /></div>
          </>
        )}

        {run?.status === "completed" && candidates.length === 0 && (
          <div className="card reveal mt-9 p-12 text-center">
            <p className="tagline text-lg">
              No candidates matched this profile well.
            </p>
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
