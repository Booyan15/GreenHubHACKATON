import { Droplets } from "lucide-react";
import Eli5InfoTip from "@/components/dashboard/Eli5InfoTip";

/** Matches NDWI ramp in supabase/functions/_shared/copernicus.ts */
const NDWI_GRADIENT =
  "linear-gradient(to top, #6b5434 0%, #a88952 18%, #5ec8e8 38%, #2a8fc4 58%, #0c3d6e 82%, #041e3d 100%)";

const LEGEND_STOPS = [
  { color: "#0c3d6e", label: "High Moisture / Standing Water" },
  { color: "#5ec8e8", label: "Optimal Moisture" },
  { color: "#a88952", label: "Dry Soil / No Water" },
] as const;

const WATER_ELI5 =
  "💧 Water Detection shows you how wet or dry your field is. It helps you see if your crops are thirsty or if water has flooded your field evenly, even before you can see it with your own eyes!";

type Props = {
  fieldName?: string;
  waterPercentage?: number;
  acquisitionDate?: string;
};

export default function WaterMapLegend({ fieldName, waterPercentage, acquisitionDate }: Props) {
  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 z-[1000] max-w-[240px]"
      aria-label="Water detection color legend"
    >
      <div className="pointer-events-auto rounded-2xl border border-border/80 bg-card/95 p-4 shadow-elegant backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
            <Droplets className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold leading-tight tracking-tight">Water Detection</p>
              <Eli5InfoTip text={WATER_ELI5} label="Explain Water Detection" />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{fieldName ? fieldName : "NDWI moisture"}</p>
          </div>
        </div>

        <div className="mt-3">
          <div
            className="h-2.5 w-full rounded-full border border-border/60 shadow-inner"
            style={{ background: NDWI_GRADIENT }}
            role="img"
            aria-hidden
          />
          <div className="mt-3 space-y-2.5">
            {LEGEND_STOPS.map((stop) => (
              <div key={stop.label} className="flex items-center gap-2.5">
                <span
                  className="h-3 w-8 shrink-0 rounded-sm border border-white/20 shadow-sm"
                  style={{ backgroundColor: stop.color }}
                />
                <p className="text-[11px] leading-snug text-foreground">{stop.label}</p>
              </div>
            ))}
          </div>
        </div>

        {typeof waterPercentage === "number" && Number.isFinite(waterPercentage) && (
          <div className="mt-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">High-moisture area</p>
            <p className="text-lg font-semibold tabular-nums tracking-tight">{waterPercentage.toFixed(1)}%</p>
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

function formatLegendDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export { WATER_ELI5 };
