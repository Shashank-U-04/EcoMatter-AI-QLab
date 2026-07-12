"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getToken, getUserName } from "@/lib/api";
import ThemeToggle from "@/components/theme-toggle";

const AUTHED_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects/new", label: "New project" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setName(getUserName());
    setAuthed(!!getToken());
  }, [pathname]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link
          href={authed ? "/dashboard" : "/"}
          className="group flex items-baseline gap-2"
        >
          <span className="font-mono text-lg font-bold uppercase tracking-[0.18em] text-ink transition-colors group-hover:text-ember-300">
            ecomatter
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-400">
            AI·QLab
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {authed ? (
            <>
              {AUTHED_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-full px-3.5 py-1.5 transition-all duration-300 ${
                    pathname === l.href
                      ? "bg-ember-400/10 text-ember-300"
                      : "text-dim hover:bg-raise/5 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <span className="mx-2 hidden font-mono text-[11px] text-faint sm:inline">
                {name}
              </span>
              <button
                onClick={logout}
                className="rounded-full px-3.5 py-1.5 text-faint transition-colors hover:bg-raise/5 hover:text-red-400"
              >
                Sign out
              </button>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3.5 py-1.5 text-dim transition-colors hover:text-ink"
              >
                Log in
              </Link>
              <Link href="/signup" className="btn-primary px-5 py-1.5">
                Get started
              </Link>
              <ThemeToggle />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
