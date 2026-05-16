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
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export async function analyzeSatelliteArea(request: SatelliteAnalysisRequest) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase backend is not configured. Add the backend URL/key and Copernicus secrets before running analysis.");
  }

  const { data, error } = await supabase.functions.invoke(functionByLayer[request.layer], {
    body: {
      boundary: request.boundary,
      startDate: request.startDate,
      endDate: request.endDate,
      maxCloudCoverage: request.maxCloudCoverage,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const body = await context.clone().json().catch(() => null);
      if (typeof body?.error === "string") throw new Error(body.error);
    }

    throw new Error(error.message);
  }
  if (!isSatelliteAnalysisResult(data)) {
    const message = typeof data?.error === "string" ? data.error : "Satellite analysis returned an unexpected response.";
    throw new Error(message);
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
