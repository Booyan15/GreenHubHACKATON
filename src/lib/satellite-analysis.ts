import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { FieldBoundary } from "@/lib/field-boundary";

export type AnalysisLayer = "rgb" | "ndvi" | "water" | "risk";

export type SatelliteAnalysisResult = {
  layer: AnalysisLayer;
  imageDataUrl: string;
  bounds: [[number, number], [number, number]];
  generatedAt: string;
  acquisitionDate: string;
  acquisitionEnd?: string;
  timeRange: {
    from: string;
    to: string;
  };
  source: string;
  interpretation: string;
  warnings?: string[];
  stats?: {
    averageNdvi?: number;
    minNdvi?: number;
    maxNdvi?: number;
    waterPercentage?: number;
    sampleCount?: number;
    noDataCount?: number;
  };
  fieldName?: string;
  fieldId?: string;
};

export type SatelliteAnalysisRequest = {
  layer: AnalysisLayer;
  boundary: FieldBoundary;
  startDate: string;
  endDate: string;
  maxCloudCoverage: number;
};

const LATEST_ANALYSIS_KEY = "satelles.latestSatelliteAnalysis";

const functionByLayer: Record<AnalysisLayer, string> = {
  rgb: "satellite-rgb",
  ndvi: "satellite-ndvi",
  water: "satellite-water",
  risk: "satellite-risk",
};

export function defaultSatelliteDateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 21 * 24 * 60 * 60 * 1000);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export function canRunSatelliteAnalysis() {
  return isSupabaseConfigured || import.meta.env.DEV;
}

export async function analyzeSatelliteArea(request: SatelliteAnalysisRequest) {
  const body = {
    boundary: request.boundary,
    startDate: request.startDate,
    endDate: request.endDate,
    maxCloudCoverage: request.maxCloudCoverage,
  };

  if (!isSupabaseConfigured) {
    if (!import.meta.env.DEV) {
      throw new Error(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or run with npm run dev.",
      );
    }
    return analyzeViaLocalDevApi(request.layer, body);
  }

  const { data, error } = await supabase.functions.invoke(functionByLayer[request.layer], { body });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const responseBody = await context.clone().json().catch(() => null);
      if (typeof responseBody?.error === "string") throw new Error(responseBody.error);
    }
    throw new Error(error.message);
  }
  if (!isSatelliteAnalysisResult(data)) {
    const message = typeof data?.error === "string" ? data.error : "Satellite analysis returned an unexpected response.";
    throw new Error(message);
  }

  return data;
}

async function analyzeViaLocalDevApi(
  layer: AnalysisLayer,
  body: {
    boundary: FieldBoundary;
    startDate: string;
    endDate: string;
    maxCloudCoverage: number;
  },
) {
  const response = await fetch(`/api/satellite/${layer}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `Satellite API failed (${response.status})`);
  }
  if (!isSatelliteAnalysisResult(data)) {
    throw new Error("Satellite analysis returned an unexpected response.");
  }

  return data;
}

export function saveLatestSatelliteAnalysis(result: SatelliteAnalysisResult) {
  localStorage.setItem(LATEST_ANALYSIS_KEY, JSON.stringify(result));
}

export function readLatestSatelliteAnalysis() {
  const raw = localStorage.getItem(LATEST_ANALYSIS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isSatelliteAnalysisResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isSatelliteAnalysisResult(value: unknown): value is SatelliteAnalysisResult {
  const result = value as SatelliteAnalysisResult;
  return Boolean(
    result &&
      typeof result.layer === "string" &&
      typeof result.imageDataUrl === "string" &&
      Array.isArray(result.bounds) &&
      result.bounds.length === 2 &&
      typeof result.generatedAt === "string" &&
      typeof result.acquisitionDate === "string" &&
      typeof result.source === "string" &&
      typeof result.interpretation === "string",
  );
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
