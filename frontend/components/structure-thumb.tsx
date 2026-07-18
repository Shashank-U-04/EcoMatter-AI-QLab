"use client";

import { useEffect, useRef, useState } from "react";
import { fetchImageObjectUrl } from "@/lib/api";

// Small, lazily-loaded 2D structure image for a candidate row. The image is only
// fetched once the row scrolls near the viewport (IntersectionObserver), so a long
// candidate list never fires all its image requests at once. The object URL is
// revoked on unmount. If the render fails, nothing is shown — the row's SMILES text
// (rendered by the parent) remains the fallback.
export default function StructureThumb({
  candidateId,
  smiles,
}: {
  candidateId: number;
  smiles: string;
}) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let objectUrl = "";
    let cancelled = false;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        fetchImageObjectUrl(candidateId)
          .then((u) => {
            if (cancelled) {
              URL.revokeObjectURL(u);
              return;
            }
            objectUrl = u;
            setUrl(u);
          })
          .catch(() => setFailed(true));
      },
      { rootMargin: "150px" }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateId]);

  return (
    <div
      ref={ref}
      className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f4f4ef]"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`2D structure of ${smiles}`} className="max-h-11 w-auto" />
      ) : failed ? (
        <span className="font-mono text-[9px] text-neutral-400">n/a</span>
      ) : (
        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-neutral-300" aria-hidden />
      )}
    </div>
  );
}
