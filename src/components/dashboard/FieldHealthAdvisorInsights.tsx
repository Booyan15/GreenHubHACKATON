import { Brain, Loader2, Sparkles } from "lucide-react";
import { formatBoundaryArea } from "@/lib/field-boundary";
import type { FieldBoundary } from "@/lib/field-boundary";
import type { SatelliteAnalysisResult } from "@/lib/satellite-analysis";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tone = "neutral" | "warning" | "success";

type InsightItem = {
  emoji: string;
  title: string;
  body: string;
};

type AdvisorState = {
  heading: string;
  tone: Tone;
  message: string;
  bullets: InsightItem[];
};

// ─── Static bullet sets ───────────────────────────────────────────────────────

const NDVI_BULLETS: InsightItem[] = [
  {
    emoji: "📉",
    title: "Spot Problems Early",
    body: "The orange and red zones help you find underwatered, diseased, or low-nitrogen spots weeks before they become visible to the naked eye.",
  },
  {
    emoji: "💰",
    title: "Save on Fertilizer",
    body: "Target only the yellow/orange zones instead of treating the whole field — cut input costs without sacrificing yield.",
  },
  {
    emoji: "🌾",
    title: "Yield Prediction",
    body: "Tracking how fast the field turns from grey/yellow to solid green helps estimate your harvest potential.",
  },
];

const WATER_BULLETS: InsightItem[] = [
  {
    emoji: "💧",
    title: "Check Irrigation Coverage",
    body: "Yellow/brown patches indicate dry areas that may be missing irrigation — inspect channels or drip lines serving those zones.",
  },
  {
    emoji: "🌊",
    title: "Monitor Flood Risk",
    body: "Deep-blue areas are flagged as high-moisture. For rice or paddy fields this is intentional; for others it may indicate poor drainage.",
  },
  {
    emoji: "📊",
    title: "Moisture Map Comparison",
    body: "Run Water Detection weekly and compare maps over time to spot trends — drying corners or expanding wet zones — before they affect yield.",
  },
];

const GENERIC_BULLETS: InsightItem[] = [
  {
    emoji: "🛰️",
    title: "Select NDVI or Water Detection",
    body: "Switch to the NDVI or Water Detection layer and click Analyze to unlock field-specific AI recommendations.",
  },
  {
    emoji: "📍",
    title: "Click a Field First",
    body: "Select any field boundary on the map to start receiving satellite-based insights tailored to that polygon.",
  },
  {
    emoji: "🔄",
    title: "Refresh Regularly",
    body: "Sentinel-2 revisits every 5 days. Re-analyze after rain, irrigation, or a major growth phase for the latest picture.",
  },
];

// ─── Advisor state builders ───────────────────────────────────────────────────

function buildNdviState(ndvi: number | undefined, loading: boolean, fieldLabel: string): AdvisorState {
  if (loading) {
    return {
      heading: "Analyzing field…",
      tone: "neutral",
      message: `Fetching Copernicus Sentinel-2 data for ${fieldLabel}. NDVI recommendations will appear here once the image loads.`,
      bullets: NDVI_BULLETS,
    };
  }

  if (typeof ndvi !== "number" || !Number.isFinite(ndvi)) {
    return {
      heading: "Field Health Analysis & Recommendations",
      tone: "neutral",
      message: `Click ${fieldLabel} on the map to run NDVI analysis. The advisor will show crop-specific guidance once a value is available.`,
      bullets: NDVI_BULLETS,
    };
  }

  const formatted = ndvi.toFixed(2);

  if (ndvi < 0.15) {
    return {
      heading: "AI Advisor: Early Growth Phase Detected",
      tone: "warning",
      message: `Your field average is very low (${formatted}), which is expected if your fields are currently flooded or just seeded. No heavy vegetation is detected yet. Keep monitoring for early green patches over the next week!`,
      bullets: NDVI_BULLETS,
    };
  }

  if (ndvi <= 0.55) {
    return {
      heading: "AI Advisor: Active Growth / Moderate Stress",
      tone: "warning",
      message: `Crops are emerging, but growth is uneven (avg NDVI ${formatted}). Focus on the yellow and red-orange zones on your map — these areas are lagging behind and might need targeted nitrogen/fertilizer or have pest issues.`,
      bullets: NDVI_BULLETS,
    };
  }

  return {
    heading: "AI Advisor: Excellent Crop Health",
    tone: "success",
    message: `Great job! The field shows a dense, healthy green canopy (avg NDVI ${formatted}). No major intervention is needed. Keep an eye out for any sudden yellow spots that could indicate localized disease.`,
    bullets: NDVI_BULLETS,
  };
}

function buildWaterState(waterPct: number | undefined, loading: boolean, fieldLabel: string): AdvisorState {
  if (loading) {
    return {
      heading: "Analyzing moisture…",
      tone: "neutral",
      message: `Fetching NDWI moisture data for ${fieldLabel}. Water Detection recommendations will appear once the analysis completes.`,
      bullets: WATER_BULLETS,
    };
  }

  if (typeof waterPct !== "number" || !Number.isFinite(waterPct)) {
    return {
      heading: "Water Detection Insights",
      tone: "neutral",
      message: `Click ${fieldLabel} and run Water Detection to see how wet or dry each zone of your field is right now.`,
      bullets: WATER_BULLETS,
    };
  }

  // waterPercentage is 0–100 (% of pixels with NDWI > 0.22 = high moisture)
  if (waterPct < 20) {
    return {
      heading: "AI Advisor: Low Moisture / Dry Soil Alert",
      tone: "warning",
      message: `The field is showing significant dry patches — only ${waterPct.toFixed(1)}% of the area is classified as high-moisture (yellow/brown zones dominant). If this is a growth phase that requires water, consider checking your irrigation channels immediately to prevent drought stress.`,
      bullets: WATER_BULLETS,
    };
  }

  return {
    heading: "AI Advisor: Optimal / Flooded Conditions",
    tone: "success",
    message: `High moisture levels detected across ${waterPct.toFixed(1)}% of the area (blue zones). This is perfect for rice field flooding. Ensure the water level is stable and check that the few lighter spots aren't high-ground areas missing out on water.`,
    bullets: WATER_BULLETS,
  };
}

function buildGenericState(layer: string, loading: boolean, fieldLabel: string): AdvisorState {
  if (loading) {
    return {
      heading: "Analyzing…",
      tone: "neutral",
      message: `Loading ${layer.toUpperCase()} data for ${fieldLabel}. Switch to NDVI or Water Detection for AI-powered field recommendations.`,
      bullets: GENERIC_BULLETS,
    };
  }
  return {
    heading: "Field Health Analysis & Recommendations",
    tone: "neutral",
    message: `Switch to the NDVI or Water Detection layer and click Analyze on ${fieldLabel} to receive tailored AI recommendations for your crops.`,
    bullets: GENERIC_BULLETS,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  fieldName?: string;
  boundary?: FieldBoundary;
  analysis: SatelliteAnalysisResult | null;
  loading?: boolean;
  layer: string;
};

export default function FieldHealthAdvisorInsights({ fieldName, boundary, analysis, loading = false, layer }: Props) {
  const areaLabel = boundary ? formatBoundaryArea(boundary) : "your";
  const fieldLabel = fieldName ?? "this field";

  const ndvi = analysis?.stats?.averageNdvi;
  const waterPct = analysis?.stats?.waterPercentage;

  let state: AdvisorState;
  if (layer === "ndvi" || layer === "risk") {
    state = buildNdviState(layer === "ndvi" ? ndvi : undefined, loading, fieldLabel);
  } else if (layer === "water") {
    state = buildWaterState(waterPct, loading, fieldLabel);
  } else {
    state = buildGenericState(layer, loading, fieldLabel);
  }

  const { heading, tone, message, bullets } = state;

  const alertBorder =
    tone === "warning" ? "border-warning/40 bg-warning/10" :
    tone === "success" ? "border-success/30 bg-success/10" :
    "border-primary/30 bg-primary/5";

  const sparkleColor =
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" :
    "text-primary";

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-background/40 px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Brain className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            AI Advisor Insights
          </p>
          <h3 className="truncate text-base font-semibold tracking-tight">{heading}</h3>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Bullet insights */}
        <ul className="space-y-3">
          {bullets.map(({ emoji, title, body }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/80 text-lg leading-none"
                aria-hidden
              >
                {emoji}
              </span>
              <div>
                <p className="text-sm font-medium leading-snug">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {typeof body === "function" ? (body as (s: string) => string)(areaLabel) : body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Dynamic advisory alert */}
        <div className={`flex gap-3 rounded-xl border p-4 ${alertBorder}`}>
          {loading ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${sparkleColor}`} />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {loading ? "Analyzing" : "Advisor note"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
