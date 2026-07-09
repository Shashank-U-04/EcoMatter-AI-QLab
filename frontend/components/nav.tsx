"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getToken, getUserName } from "@/lib/api";

export default function Nav() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(getUserName());
  }, []);

  const authed = typeof window !== "undefined" && !!getToken();

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={authed ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-brand-700">
          <span className="text-xl">🧪</span> EcoMatter <span className="font-normal text-slate-400">AI-QLab</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {authed ? (
            <>
              <Link href="/dashboard" className="text-slate-600 hover:text-brand-700">Dashboard</Link>
              <Link href="/projects/new" className="text-slate-600 hover:text-brand-700">New project</Link>
              <Link href="/settings" className="text-slate-600 hover:text-brand-700">
                {name || "Settings"}
              </Link>
              <button onClick={logout} className="text-slate-400 hover:text-red-600">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-brand-700">Log in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
