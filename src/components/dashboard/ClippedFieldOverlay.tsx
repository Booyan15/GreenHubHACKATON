import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FieldBoundary } from "@/lib/field-boundary";

type Props = {
  url: string;
  bounds: [[number, number], [number, number]];
  boundary: FieldBoundary;
  opacity?: number;
};

/**
 * NDVI/image layer masked to the field polygon.
 * Clip points are relative to the overlay image (layer coords), not the map container.
 */
export default function ClippedFieldOverlay({ url, bounds, boundary, opacity = 0.9 }: Props) {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    const leafletBounds = L.latLngBounds(bounds);
    const overlay = L.imageOverlay(url, leafletBounds, {
      opacity,
      interactive: false,
      className: "satelles-field-overlay",
    });
    overlay.addTo(map);
    overlayRef.current = overlay;

    const applyClip = () => {
      const img = overlay.getElement() as HTMLImageElement | undefined;
      if (!img || boundary.length < 3) return;

      const nw = map.latLngToLayerPoint(leafletBounds.getNorthWest());
      const clipPoints = boundary.map(([lat, lon]) => {
        const p = map.latLngToLayerPoint(L.latLng(lat, lon));
        return `${p.x - nw.x}px ${p.y - nw.y}px`;
      });

      const clip = `polygon(${clipPoints.join(", ")})`;
      img.style.clipPath = clip;
      img.style.webkitClipPath = clip;
    };

    const scheduleClip = () => {
      applyClip();
      requestAnimationFrame(applyClip);
    };

    map.on("zoom zoomend zoomanim move moveend viewreset resize", scheduleClip);

    const img = overlay.getElement() as HTMLImageElement | undefined;
    if (img) {
      if (img.complete) scheduleClip();
      else img.addEventListener("load", scheduleClip);
    }

    scheduleClip();
    const t1 = window.setTimeout(scheduleClip, 80);
    const t2 = window.setTimeout(scheduleClip, 250);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.off("zoom zoomend zoomanim move moveend viewreset resize", scheduleClip);
      if (img) img.removeEventListener("load", scheduleClip);
      overlay.remove();
      overlayRef.current = null;
    };
  }, [map, url, bounds, boundary, opacity]);

  return null;
}
