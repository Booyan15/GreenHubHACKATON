import { useEffect, useRef, useState } from "react";
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
 * Premium Apple-style field selector dropdown.
 * Lives in the control bar above the map — no Leaflet dependency.
 * Zoom behaviour is handled by ZoomToField inside MapContainer.
 */
export default function FieldsDropdown({ fields, selectedFieldId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex min-w-[210px] items-center gap-2.5 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin className="h-5 w-5 shrink-0 text-blue-500" />
        <span className="flex-1 truncate text-left">
          {selectedField ? selectedField.name : "Select field…"}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 dark:text-muted-foreground ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ── Dropdown list ────────────────────────────────────────────────── */}
      {open && (
        <div
          role="listbox"
          aria-label="Select a field"
          className="absolute right-0 z-50 mt-2 min-w-[240px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-border dark:bg-card"
        >
          {fields.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400 dark:text-muted-foreground">
              No fields saved yet.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1.5">
              {fields.map((field) => {
                const active = field.id === selectedFieldId;
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onSelect(field);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors focus-visible:outline-none ${
                        active
                          ? "bg-blue-50 text-blue-700 dark:bg-primary/10 dark:text-primary"
                          : "text-gray-700 hover:bg-gray-50 dark:text-foreground dark:hover:bg-accent/50"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          active ? "bg-blue-500 dark:bg-primary" : "bg-gray-200 dark:bg-border"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{field.name}</span>
                        {field.crop && (
                          <span className="block truncate text-xs text-gray-400 dark:text-muted-foreground">
                            {field.crop}
                          </span>
                        )}
                      </span>
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
