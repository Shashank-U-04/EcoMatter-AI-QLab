"use client";

import {
  CandidateDetail,
  CandidateSummary,
  Domain,
  Project,
  PropertyTarget,
  RunStatus,
  SynthesisRoute,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "ecomatter_token";
const NAME_KEY = "ecomatter_name";

export function saveSession(token: string, name: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Auth ----
export function signup(name: string, email: string, password: string, org = "") {
  return request<{ access_token: string; name: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, org }),
  });
}

export function login(email: string, password: string) {
  return request<{ access_token: string; name: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ---- Projects ----
export function createProject(
  name: string,
  domain: Domain,
  property_targets: PropertyTarget[]
) {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, domain, property_targets }),
  });
}

export function listProjects() {
  return request<Project[]>("/projects");
}

export function getProject(id: number) {
  return request<Project>(`/projects/${id}`);
}

export function startGeneration(id: number) {
  return request<RunStatus>(`/projects/${id}/generate`, { method: "POST" });
}

export function latestRun(id: number) {
  return request<RunStatus>(`/projects/${id}/runs/latest`);
}

export function listCandidates(id: number) {
  return request<CandidateSummary[]>(`/projects/${id}/candidates`);
}

// ---- Candidates ----
export function getCandidate(id: number) {
  return request<CandidateDetail>(`/candidates/${id}`);
}

export function getSynthesis(id: number) {
  return request<SynthesisRoute>(`/candidates/${id}/synthesis`);
}

export function candidateImageUrl(id: number) {
  return `${API_URL}/candidates/${id}/image`;
}

export function reportUrl(projectId: number, format: "pdf" | "csv" | "json") {
  return `${API_URL}/projects/${projectId}/report?format=${format}`;
}

// Reports require the auth header, so fetch as a blob and trigger a download.
export async function downloadReport(projectId: number, format: "pdf" | "csv" | "json") {
  const token = getToken();
  const res = await fetch(reportUrl(projectId, format), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Report export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ecomatter_${projectId}_report.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Candidate images also need the auth header — fetch as an object URL.
export async function fetchImageObjectUrl(candidateId: number): Promise<string> {
  const token = getToken();
  const res = await fetch(candidateImageUrl(candidateId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Image render failed");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
