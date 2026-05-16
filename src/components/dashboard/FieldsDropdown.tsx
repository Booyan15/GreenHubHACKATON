import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { ChevronDown, MapPin } from "lucide-react";
import type { FieldBoundary } from "@/lib/field-boundary";

type Field = {
  id: string;
  name: string;
  crop: string | null;
  boundary: FieldBoundary;
};

type Props = {
  fields: Field[];
  selectedFieldId: string | null;
  onSelect: (field: Field) => void;
};

/**
 * Floating "My Fields" dropdown rendered inside the Leaflet map container.
 * Uses `useMap()` to fly to the selected field's bounds and fires the parent
 * onSelect handler to trigger analysis — identical to clicking the polygon.
 */
export default function FieldsDropdown({ fields, selectedFieldId, onSelect }: Props) {
  const map = useMap();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Stop Leaflet from swallowing pointer events on the overlay div
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // @ts-expect-error — Leaflet DomEvent is available globally via leaflet css import
    const L = (window as typeof window & { L?: typeof import("leaflet") }).L;
    if (L?.DomEvent) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  function handleSelect(field: Field) {
    setOpen(false);
    // Fly to the field's bounding box
    map.fitBounds(field.boundary, { padding: [56, 56], maxZoom: 16, animate: true });
    // Trigger analysis exactly like a polygon click
    onSelect(field);
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div
      ref={ref}
      className="absolute right-3 top-3 z-[1000]"
      // Prevent map drag / scroll from triggering inside the dropdown
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 px-3.5 py-2.5 text-sm font-medium shadow-elegant backdrop-blur-md transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="max-w-[160px] truncate text-foreground">
          {selectedField ? selectedField.name : "My Fields"}
        </span>
        <ChevronDown
          className={`ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          role="listbox"
          aria-label="Select a field"
          className="absolute right-0 mt-1.5 min-w-[220px] overflow-hidden rounded-xl border border-border/80 bg-card/98 shadow-elegant backdrop-blur-md"
        >
          {fields.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No fields saved yet.</div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {fields.map((field) => {
                const isActive = field.id === selectedFieldId;
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(field)}
                      className={`flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isActive ? "bg-primary/10" : ""}`}
                    >
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-primary" : "bg-border"}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium leading-snug ${isActive ? "text-primary" : "text-foreground"}`}>
                          {field.name}
                        </p>
                        {field.crop && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{field.crop}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
