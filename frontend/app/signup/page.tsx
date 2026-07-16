"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GoogleButton from "@/components/google-button";
import Nav from "@/components/nav";
import { ErrorNote } from "@/components/ui";
import { firebaseLogin, saveSession, signup } from "@/lib/api";
import {
  firebaseEmailSignup,
  firebaseGoogleLogin,
  friendlyAuthError,
  isFirebaseEnabled,
} from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isFirebaseEnabled()) {
        const idToken = await firebaseEmailSignup(name, email, password);
        const res = await firebaseLogin(idToken, name, org);
        saveSession(res.access_token, res.name, email);
      } else {
        const res = await signup(name, email, password, org);
        saveSession(res.access_token, res.name, email);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignup() {
    setError("");
    setBusy(true);
    try {
      const { idToken, name: googleName } = await firebaseGoogleLogin();
      const res = await firebaseLogin(idToken, googleName, org);
      saveSession(res.access_token, res.name);
      router.push("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="card reveal p-8">
          <div className="overline">Enrolment</div>
          <h1 className="mt-2 font-display text-3xl text-ink">Create your lab</h1>
          <p className="tagline mt-1 text-sm">Start designing materials in minutes.</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            {error && <ErrorNote message={error} />}
            <div>
              <label className="label">Name</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">
                Organization <span className="normal-case text-faint">(optional)</span>
              </label>
              <input className="input" value={org} onChange={(e) => setOrg(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">
                Password <span className="normal-case text-faint">(min 8 chars)</span>
              </label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          {isFirebaseEnabled() && <GoogleButton onClick={googleSignup} busy={busy} />}
          <p className="mt-5 text-center text-sm text-dim">
            Already have an account?{" "}
            <Link href="/login" className="text-ember-300 transition-colors hover:text-ember-200">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
