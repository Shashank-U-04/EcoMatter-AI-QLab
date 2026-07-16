"use client";

// "Continue with Google" button + divider, shown only when Firebase is on.
export default function GoogleButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-edge" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint">or</span>
        <span className="h-px flex-1 bg-edge" />
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="btn-ghost mt-5 flex w-full items-center justify-center gap-2.5 py-3"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5l-3.9 3c2 3.9 6 6.6 10.7 6.6z"
          />
          <path
            fill="#FBBC05"
            d="M5.2 14.4c-.3-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4l-3.9-3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l3.9-3z"
          />
          <path
            fill="#EA4335"
            d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l3.9 3c.9-2.9 3.6-5 6.8-5z"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
