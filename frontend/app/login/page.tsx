"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Nav from "@/components/nav";
import { ErrorNote } from "@/components/ui";
import { login, saveSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await login(email, password);
      saveSession(res.access_token, res.name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-4 py-20">
        <div className="card reveal p-8">
          <div className="overline">Access</div>
          <h1 className="mt-2 font-display text-3xl text-ink">Welcome back</h1>
          <p className="tagline mt-1 text-sm">Log in to your laboratory.</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            {error && <ErrorNote message={error} />}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-dim">
            No account?{" "}
            <Link href="/signup" className="text-ember-300 transition-colors hover:text-ember-200">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
