import { Leaf } from "lucide-react";
import Eli5InfoTip from "@/components/dashboard/Eli5InfoTip";

const NDVI_ELI5 = `🌾 NDVI shows you how green and healthy your crops are—think of it as a health scan for your field!

🟢 Deeper green means healthier, thicker plants (the greener, the better).

🟡/🔴 Yellow and red mean your plants are stressed, thin, or starving (the yellower, the worse).

It lets you spot trouble zones weeks before you can see them with your own eyes!`;

/** Matches Sentinel Hub NDVI ramp in supabase/functions/_shared/copernicus.ts */
const NDVI_GRADIENT =
  "linear-gradient(to top, #b8b8b8 0%, #e64738 10%, #fae659 26%, #fa941f 40%, #b8d652 54%, #389e38 72%, #0d6b1f 100%)";

const LEGEND_STOPS = [
  { ndvi: "0.7 – 1.0", label: "Dense healthy vegetation", color: "#0d6b1f" },
  { ndvi: "0.5 – 0.7", label: "Healthy vegetation", color: "#389e38" },
  { ndvi: "0.25 – 0.5", label: "Fair / mixed cover", color: "#fa941f" },
  { ndvi: "0.1 – 0.25", label: "Sparse vegetation", color: "#fae659" },
  { ndvi: "−0.2 – 0.1", label: "Bare soil / roads", color: "#b8b8b8" },
] as const;

type Props = {
  fieldName?: string;
  averageNdvi?: number;
  acquisitionDate?: string;
};

export default function NdviMapLegend({ fieldName, averageNdvi, acquisitionDate }: Props) {
  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 z-[1000] max-w-[220px]"
      aria-label="NDVI color legend"
    >
      <div className="pointer-events-auto rounded-2xl border border-border/80 bg-card/95 p-4 shadow-elegant backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold leading-tight tracking-tight">NDVI index</p>
              <Eli5InfoTip text={NDVI_ELI5} label="Explain NDVI" />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {fieldName ? fieldName : "Vegetation health"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <div
            className="h-[168px] w-3 shrink-0 rounded-full border border-border/60 shadow-inner"
            style={{ background: NDVI_GRADIENT }}
            role="img"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            {LEGEND_STOPS.map((stop) => (
              <div key={stop.ndvi} className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: stop.color }}
                />
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-medium tabular-nums text-muted-foreground">{stop.ndvi}</p>
                  <p className="text-[11px] text-foreground">{stop.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {typeof averageNdvi === "number" && Number.isFinite(averageNdvi) && (
          <div className="mt-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Field average</p>
            <p className="text-lg font-semibold tabular-nums tracking-tight">{averageNdvi.toFixed(2)}</p>
          </div>
        )}

        {acquisitionDate && (
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Scene: {formatLegendDate(acquisitionDate)}
          </p>
        )}
      </div>
    </div>
  );
}

export { NDVI_ELI5 };

function formatLegendDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
