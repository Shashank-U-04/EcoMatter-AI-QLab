"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GoogleButton from "@/components/google-button";
import Nav from "@/components/nav";
import { ErrorNote } from "@/components/ui";
import { firebaseLogin, login, saveSession } from "@/lib/api";
import {
  firebaseEmailLogin,
  firebaseGoogleLogin,
  firebaseResetPassword,
  friendlyAuthError,
  isFirebaseEnabled,
} from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (isFirebaseEnabled()) {
        const idToken = await firebaseEmailLogin(email, password);
        const res = await firebaseLogin(idToken);
        saveSession(res.access_token, res.name, email);
      } else {
        const res = await login(email, password);
        saveSession(res.access_token, res.name, email);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { idToken, name } = await firebaseGoogleLogin();
      const res = await firebaseLogin(idToken, name);
      saveSession(res.access_token, res.name);
      router.push("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    setError("");
    setNotice("");
    if (!email) {
      setError("Type your email above first, then click “Forgot password?” again.");
      return;
    }
    try {
      await firebaseResetPassword(email);
      setNotice(`Password reset email sent to ${email} — check your inbox.`);
    } catch (err) {
      setError(friendlyAuthError(err));
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
            {notice && (
              <p className="rounded-xl border border-ember-400/25 bg-ember-400/10 px-4 py-2.5 text-sm text-ember-300">
                {notice}
              </p>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="label">Password</label>
                {isFirebaseEnabled() && (
                  <button
                    type="button"
                    onClick={forgotPassword}
                    className="text-xs text-dim transition-colors hover:text-ember-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
          {isFirebaseEnabled() && <GoogleButton onClick={googleLogin} busy={busy} />}
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
