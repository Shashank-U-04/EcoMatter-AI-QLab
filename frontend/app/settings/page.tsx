"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { ErrorNote, SectionLabel } from "@/components/ui";
import { changePassword, clearSession, getToken, getUserName } from "@/lib/api";

const MIN_PASSWORD_LENGTH = 8;

export default function Settings() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setName(getUserName());
  }, [router]);

  async function submitPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="reveal">
          <SectionLabel>Profile</SectionLabel>
          <h1 className="font-display text-4xl text-ink">Settings</h1>
        </div>
        <div className="card reveal mt-7 p-7" style={{ "--d": "120ms" } as React.CSSProperties}>
          <div className="overline">Signed in as</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ember-400/10 font-mono text-lg font-bold text-ember-300">
              {(name || "?").charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="font-display text-xl text-ink">{name || "—"}</div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ember-400">
                <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-ember-400" />
                Online
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
            className="btn-ghost mt-7 w-full"
          >
            Sign out
          </button>
        </div>

        <form
          onSubmit={submitPasswordChange}
          className="card reveal mt-5 p-7"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          <div className="overline">Change password</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="password"
              className="input"
              placeholder="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <input
              type="password"
              className="input"
              placeholder={`New password (min ${MIN_PASSWORD_LENGTH} characters)`}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordError && <div className="mt-3"><ErrorNote message={passwordError} /></div>}
          {passwordSaved && (
            <p className="mt-3 rounded-xl border border-ember-400/25 bg-ember-400/10 px-4 py-2.5 text-sm text-ember-300">
              Password updated. Use it the next time you sign in.
            </p>
          )}
          <button type="submit" className="btn-primary mt-5 w-full" disabled={saving}>
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
        <p
          className="tagline reveal mt-5 text-xs"
          style={{ "--d": "240ms" } as React.CSSProperties}
        >
          MVP profile screen. Org accounts, collaboration, and enterprise security are on
          the roadmap.
        </p>
      </main>
    </>
  );
}
