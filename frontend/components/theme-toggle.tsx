"use client";

import { useEffect, useRef, useState } from "react";

type Theme = "dark" | "light";

// The View Transitions API isn't in every TS DOM lib version yet; describe just
// the slice we use so we can feature-detect without `any`.
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.dataset.theme = "light";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

/**
 * Sun/moon toggle. Dark is the default; the choice persists in localStorage
 * and is re-applied before paint by the inline script in app/layout.tsx.
 */
export default function ThemeToggle() {
  // Render a fixed default on the server, read the real theme after mount.
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  // Anchor the circular reveal at the toggle's centre and size its radius to
  // reach the farthest screen corner, so the new palette always fills the view.
  function setRevealOrigin() {
    const root = document.documentElement;
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${radius}px`);
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const commit = () => {
      setTheme(next);
      applyTheme(next);
    };
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable (private mode) — theme still applies for the session */
    }

    const doc = document as DocumentWithViewTransition;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Paint-spreading reveal where supported; instant swap otherwise.
    if (!doc.startViewTransition || prefersReducedMotion) {
      commit();
      return;
    }
    setRevealOrigin();
    doc.startViewTransition(commit);
  }

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="rounded-full p-2 text-dim transition-colors hover:bg-raise/5 hover:text-ink"
    >
      {!mounted || theme === "dark" ? (
        /* sun — offered action is "go light" */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        /* moon — offered action is "go dark" */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
