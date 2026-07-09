"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";
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
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <div className="card mt-6 p-6">
          <div className="text-sm text-slate-500">Signed in as</div>
          <div className="text-lg font-semibold text-slate-900">{name || "—"}</div>
          <button
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
            className="btn-ghost mt-6 w-full"
          >
            Sign out
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          MVP profile screen. Org accounts, collaboration, and enterprise security
          are on the roadmap (PRD §19).
        </p>
      </main>
    </>
  );
}
