"use client";

import { useEffect, useRef, useState } from "react";
import { fetchStructure3d } from "@/lib/api";
import { Spinner } from "@/components/ui";

/**
 * Interactive 3D structure viewer. Fetches an RDKit-generated MMFF-optimised
 * conformer (MOL block) from the backend and renders it with 3Dmol.js. 3Dmol
 * touches `window`, so it is imported dynamically inside the effect.
 */
export default function Molecule3D({ candidateId }: { candidateId: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let viewer: { clear: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const [$3Dmol, molblock] = await Promise.all([
          import("3dmol/build/3Dmol.js"),
          fetchStructure3d(candidateId),
        ]);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = "";
        // Match the panel surface of the active theme (canvas can't use CSS vars)
        const isLight = document.documentElement.dataset.theme === "light";
        const v = $3Dmol.createViewer(hostRef.current, {
          backgroundColor: isLight ? "0xfcfcfa" : "0x0e0e11",
        });
        v.addModel(molblock, "sdf");
        v.setStyle({}, {
          stick: { radius: 0.14, colorscheme: "greenCarbon" },
          sphere: { scale: 0.28 },
        });
        v.zoomTo();
        v.zoom(1.15);
        v.spin("y", 0.6);
        v.render();
        viewer = v;
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("3D conformer unavailable for this structure.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewer?.clear();
      } catch {
        /* viewer already gone */
      }
    };
  }, [candidateId]);

  return (
    <div className="relative min-h-56 w-full overflow-hidden rounded-xl bg-panel">
      <div ref={hostRef} className="h-64 w-full" style={{ position: "relative" }} />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner label="Embedding 3D conformer…" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-faint">
          {error}
        </div>
      )}
    </div>
  );
}
