"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/nav";
import { BackLink, Badge, Disclaimer, ErrorNote, ScoreBar, Spinner } from "@/components/ui";
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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <BackLink href="/dashboard">Back to projects</BackLink>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project?.name || "Project"}</h1>
            {project && <Badge>{project.domain}</Badge>}
          </div>
          {run?.status === "completed" && (
            <div className="flex gap-2">
              <button onClick={() => downloadReport(projectId, "pdf")} className="btn-ghost">PDF</button>
              <button onClick={() => downloadReport(projectId, "csv")} className="btn-ghost">CSV</button>
              <button onClick={() => downloadReport(projectId, "json")} className="btn-ghost">JSON</button>
              <button onClick={regenerate} className="btn-primary">Re-run</button>
            </div>
          )}
        </div>

        {project && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.property_targets.map((t) => (
              <span key={t.property_name} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
                {PROPERTY_LABEL[t.property_name] || t.property_name}: <b>{t.target_value}</b>
                {t.weight !== 1 && <span className="text-brand-600"> ×{t.weight}</span>}
              </span>
            ))}
          </div>
        )}

        {error && <div className="mt-6"><ErrorNote message={error} /></div>}

        {running && (
          <div className="card mt-8 flex flex-col items-center gap-3 p-12">
            <Spinner label="Evolving candidate molecules — genetic search + property screening…" />
            <p className="text-xs text-slate-400">This usually takes 30–90 seconds.</p>
          </div>
        )}

        {run?.status === "completed" && candidates.length > 0 && (
          <>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Structure (SMILES)</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Novelty</th>
                    <th className="py-2 pr-3 w-48">Top property</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const top = [...c.predictions].sort((a, b) => b.predicted_value - a.predicted_value)[0];
                    return (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-brand-50/40">
                        <td className="py-3 pr-3 font-semibold text-brand-700">{c.rank}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-slate-600">{c.smiles}</td>
                        <td className="py-3 pr-3 font-semibold">{c.composite_score.toFixed(1)}</td>
                        <td className="py-3 pr-3 text-slate-500">{(c.novelty_score * 100).toFixed(0)}%</td>
                        <td className="py-3 pr-3">
                          {top && <ScoreBar value={top.predicted_value} label={PROPERTY_LABEL[top.property_name]} />}
                        </td>
                        <td className="py-3 text-right">
                          <Link href={`/candidates/${c.id}`} className="text-brand-600 hover:underline">
                            Open →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4"><Disclaimer /></div>
          </>
        )}

        {run?.status === "completed" && candidates.length === 0 && (
          <div className="card mt-8 p-10 text-center text-slate-600">
            No candidates matched this profile well. Try relaxing a constraint or
            lowering a weight, then re-run.
            <div className="mt-4">
              <button onClick={regenerate} className="btn-primary">Re-run</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
