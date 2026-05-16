import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Refreshes map size/position after satellite overlay mounts so clip aligns immediately. */
export default function InvalidateMapOnAnalysis({ token }: { token: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!token) return;
    const run = () => map.invalidateSize({ pan: false });
    run();
    requestAnimationFrame(run);
    const t = window.setTimeout(run, 120);
    return () => window.clearTimeout(t);
  }, [map, token]);

  return null;
}
