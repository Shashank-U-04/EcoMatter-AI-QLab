"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
import { SectionLabel } from "@/components/ui";
import { clearSession, getToken, getUserName } from "@/lib/api";

export default function Settings() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setName(getUserName());
  }, [router]);

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
