export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BoundaryPoint = [number, number];
type BBox = [number, number, number, number];
type LayerType = "rgb" | "ndvi" | "water" | "risk";

type AnalysisPayload = {
  boundary?: unknown;
  geometry?: unknown;
  bbox?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  maxCloudCoverage?: unknown;
};

type StatsValue = {
  min: number;
  max: number;
  mean: number;
  stDev?: number;
  sampleCount: number;
  noDataCount: number;
};

type StatsInterval = {
  interval: {
    from: string;
    to: string;
  };
  outputs?: Record<
    string,
    {
      bands?: Record<string, { stats?: StatsValue }>;
    }
  >;
};

type StatsResponse = {
  data?: StatsInterval[];
  status?: string;
  error?: {
    message?: string;
  };
};

type NormalizedArea = {
  bounds: {
    geometry?: {
      type: "Polygon";
      coordinates: number[][][];
    };
    bbox?: BBox;
    properties: {
      crs: "http://www.opengis.net/def/crs/EPSG/0/4326";
    };
  };
  leafletBounds: [[number, number], [number, number]];
  bbox: BBox;
};

type TimeRange = {
  from: string;
  to: string;
};

type ChosenStats = {
  interval: TimeRange;
  stats: StatsValue;
};

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1";
const STATISTICS_URL = "https://sh.dataspace.copernicus.eu/statistics/v1";
const SOURCE = "Sentinel-2 L2A via Copernicus Data Space / Sentinel Hub";
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

let cachedToken: TokenCache | null = null;

const rgbEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  return [2.8 * sample.B04, 2.8 * sample.B03, 2.8 * sample.B02, sample.dataMask];
}`;

const ndviImageEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}

function isCloudOrShadow(scl) {
  return scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0 || isCloudOrShadow(sample.SCL)) return [0, 0, 0, 0];
  const denominator = sample.B08 + sample.B04;
  if (denominator === 0) return [0, 0, 0, 0];

  // NDVI = (near infrared - red) / (near infrared + red)
  const ndvi = (sample.B08 - sample.B04) / denominator;

  if (ndvi < 0.15) return [0.36, 0.12, 0.07, 0.86];
  if (ndvi < 0.35) return [0.74, 0.18, 0.13, 0.86];
  if (ndvi < 0.55) return [0.93, 0.72, 0.17, 0.86];
  if (ndvi < 0.72) return [0.40, 0.74, 0.22, 0.86];
  return [0.75, 0.93, 0.38, 0.86];
}`;

const riskImageEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}

function isCloudOrShadow(scl) {
  return scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0 || isCloudOrShadow(sample.SCL)) return [0, 0, 0, 0];
  const denominator = sample.B08 + sample.B04;
  if (denominator === 0) return [0, 0, 0, 0];

  // Risk is derived from real NDVI: lower NDVI means higher vegetation stress.
  const ndvi = (sample.B08 - sample.B04) / denominator;

  if (ndvi < 0.15) return [0.22, 0.05, 0.03, 0.88];
  if (ndvi < 0.35) return [0.70, 0.10, 0.08, 0.88];
  if (ndvi < 0.55) return [0.94, 0.58, 0.16, 0.84];
  if (ndvi < 0.72) return [0.51, 0.77, 0.25, 0.78];
  return [0.72, 0.92, 0.43, 0.76];
}`;

const waterImageEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}

function isCloudOrShadow(scl) {
  return scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0 || isCloudOrShadow(sample.SCL)) return [0, 0, 0, 0];
  const denominator = sample.B03 + sample.B08;
  if (denominator === 0) return [0, 0, 0, 0];

  // NDWI = (green - near infrared) / (green + near infrared)
  const ndwi = (sample.B03 - sample.B08) / denominator;

  if (ndwi > 0.2) return [0.05, 0.43, 0.90, 0.86];
  if (ndwi > 0.05) return [0.35, 0.78, 1.00, 0.72];
  return [0.16, 0.18, 0.20, 0.56];
}`;

const ndviStatsEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "data", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function isCloudOrShadow(scl) {
  return scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  const denominator = sample.B08 + sample.B04;
  const valid = sample.dataMask === 1 && denominator !== 0 && !isCloudOrShadow(sample.SCL);

  // NDVI = (near infrared - red) / (near infrared + red)
  const ndvi = valid ? (sample.B08 - sample.B04) / denominator : 0;

  return {
    data: [ndvi],
    dataMask: [valid ? 1 : 0]
  };
}`;

const waterStatsEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "data", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function isCloudOrShadow(scl) {
  return scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  const denominator = sample.B03 + sample.B08;
  const valid = sample.dataMask === 1 && denominator !== 0 && !isCloudOrShadow(sample.SCL);

  // NDWI = (green - near infrared) / (green + near infrared)
  const ndwi = valid ? (sample.B03 - sample.B08) / denominator : 0;
  const waterMask = valid && ndwi > 0.2 ? 1 : 0;

  return {
    data: [waterMask],
    dataMask: [valid ? 1 : 0]
  };
}`;

const validDataStatsEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "SCL", "dataMask"] }],
    output: [
      { id: "data", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function isCloudOrShadow(scl) {
  return scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  const valid = sample.dataMask === 1 && !isCloudOrShadow(sample.SCL);
  return {
    data: [valid ? 1 : 0],
    dataMask: [valid ? 1 : 0]
  };
}`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleTokenStatusRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await getAccessToken();
    return jsonResponse({
      configured: true,
      tokenCachedUntil: cachedToken ? new Date(cachedToken.expiresAtMs).toISOString() : null,
      source: "Copernicus Data Space OAuth",
    });
  } catch (error) {
    return jsonResponse(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Copernicus token check failed.",
      },
      error instanceof HttpError ? error.status : 500,
    );
  }
}

export async function handleSatelliteRequest(req: Request, layer: LayerType) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST with the selected area and analysis controls." }, 405);
  }

  try {
    const payload = (await req.json()) as AnalysisPayload;
    const area = normalizeArea(payload);
    const timeRange = normalizeTimeRange(payload);
    const maxCloudCoverage = normalizeCloudCoverage(payload.maxCloudCoverage);

    if (layer === "rgb") {
      const chosen = await getLatestValidStats(area, timeRange, maxCloudCoverage, validDataStatsEvalscript);
      const imageDataUrl = await requestProcessImage(area, chosen.interval, maxCloudCoverage, rgbEvalscript);

      return jsonResponse({
        layer,
        imageDataUrl,
        bounds: area.leafletBounds,
        generatedAt: new Date().toISOString(),
        acquisitionDate: chosen.interval.from,
        acquisitionEnd: chosen.interval.to,
        timeRange,
        source: SOURCE,
        interpretation: "True color Sentinel-2 image using B04 red, B03 green, and B02 blue bands.",
        warnings: buildWarnings(maxCloudCoverage),
      });
    }

    if (layer === "water") {
      const chosen = await getLatestValidStats(area, timeRange, maxCloudCoverage, waterStatsEvalscript);
      const imageDataUrl = await requestProcessImage(area, chosen.interval, maxCloudCoverage, waterImageEvalscript);
      const waterPercentage = clamp(chosen.stats.mean * 100, 0, 100);

      return jsonResponse({
        layer,
        imageDataUrl,
        bounds: area.leafletBounds,
        generatedAt: new Date().toISOString(),
        acquisitionDate: chosen.interval.from,
        acquisitionEnd: chosen.interval.to,
        timeRange,
        source: SOURCE,
        stats: {
          waterPercentage,
          averageMaskValue: chosen.stats.mean,
          min: chosen.stats.min,
          max: chosen.stats.max,
          sampleCount: chosen.stats.sampleCount,
          noDataCount: chosen.stats.noDataCount,
        },
        interpretation: interpretWater(waterPercentage),
        warnings: buildWarnings(maxCloudCoverage),
      });
    }

    const chosen = await getLatestValidStats(area, timeRange, maxCloudCoverage, ndviStatsEvalscript);
    const imageDataUrl = await requestProcessImage(
      area,
      chosen.interval,
      maxCloudCoverage,
      layer === "risk" ? riskImageEvalscript : ndviImageEvalscript,
    );
    const averageNdvi = clamp(chosen.stats.mean, -1, 1);

    return jsonResponse({
      layer,
      imageDataUrl,
      bounds: area.leafletBounds,
      generatedAt: new Date().toISOString(),
      acquisitionDate: chosen.interval.from,
      acquisitionEnd: chosen.interval.to,
      timeRange,
      source: SOURCE,
      stats: {
        averageNdvi,
        minNdvi: clamp(chosen.stats.min, -1, 1),
        maxNdvi: clamp(chosen.stats.max, -1, 1),
        sampleCount: chosen.stats.sampleCount,
        noDataCount: chosen.stats.noDataCount,
      },
      interpretation: layer === "risk" ? interpretRisk(averageNdvi) : interpretNdvi(averageNdvi),
      warnings: buildWarnings(maxCloudCoverage),
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown satellite analysis error.",
      },
      status,
    );
  }
}

function normalizeArea(payload: AnalysisPayload): NormalizedArea {
  if (isBoundary(payload.boundary)) {
    const geometry = polygonFromBoundary(payload.boundary);
    const bbox = bboxFromCoordinates(geometry.coordinates[0]);

    return {
      bounds: {
        geometry,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      bbox,
      leafletBounds: leafletBoundsFromBbox(bbox),
    };
  }

  if (isGeoJsonPolygon(payload.geometry)) {
    const geometry = payload.geometry;
    const bbox = bboxFromCoordinates(geometry.coordinates[0]);

    return {
      bounds: {
        geometry,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      bbox,
      leafletBounds: leafletBoundsFromBbox(bbox),
    };
  }

  if (isBBox(payload.bbox)) {
    const [west, south, east, north] = payload.bbox;
    return {
      bounds: {
        bbox: [west, south, east, north],
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      bbox: [west, south, east, north],
      leafletBounds: [
        [south, west],
        [north, east],
      ],
    };
  }

  throw new HttpError("Select a valid polygon or bounding box before running satellite analysis.", 400);
}

function normalizeTimeRange(payload: AnalysisPayload): TimeRange {
  const to = parseDate(payload.endDate, "end date") ?? new Date();
  const defaultFrom = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = parseDate(payload.startDate, "start date") ?? defaultFrom;

  if (from.getTime() > to.getTime()) {
    throw new HttpError("Start date must be before end date.", 400);
  }

  return {
    from: startOfDayIso(from),
    to: endOfDayIso(to),
  };
}

function parseDate(value: unknown, label: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new HttpError(`Invalid ${label}.`, 400);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(`Invalid ${label}.`, 400);
  return date;
}

function normalizeCloudCoverage(value: unknown) {
  if (value == null || value === "") return 35;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw new HttpError("Max cloud coverage must be between 0 and 100.", 400);
  }
  return Math.round(numeric);
}

async function getLatestValidStats(
  area: NormalizedArea,
  timeRange: TimeRange,
  maxCloudCoverage: number,
  evalscript: string,
): Promise<ChosenStats> {
  const statsResponse = await requestStatistics(area, timeRange, maxCloudCoverage, evalscript);
  const intervals = statsResponse.data ?? [];

  for (let index = intervals.length - 1; index >= 0; index -= 1) {
    const stats = getOutputStats(intervals[index]);
    if (isUsableStats(stats)) {
      return {
        interval: intervals[index].interval,
        stats,
      };
    }
  }

  throw new HttpError(
    "No valid satellite data available for this date/area. Try increasing the date range or max cloud coverage.",
    404,
  );
}

async function requestStatistics(
  area: NormalizedArea,
  timeRange: TimeRange,
  maxCloudCoverage: number,
  evalscript: string,
) {
  const body = {
    input: {
      bounds: area.bounds,
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            mosaickingOrder: "leastCC",
            maxCloudCoverage,
          },
        },
      ],
    },
    aggregation: {
      timeRange,
      aggregationInterval: {
        of: "P1D",
      },
      evalscript,
      resx: 10,
      resy: 10,
    },
  };

  const response = await fetchCopernicus(STATISTICS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as StatsResponse;

  if (!response.ok || data.status === "FAILED") {
    throw new HttpError(
      data.error?.message ?? `Sentinel Hub Statistical API failed with status ${response.status}.`,
      response.ok ? 502 : response.status,
    );
  }

  return data;
}

async function requestProcessImage(
  area: NormalizedArea,
  timeRange: TimeRange,
  maxCloudCoverage: number,
  evalscript: string,
) {
  const size = imageSizeForBbox(area.bbox);
  const body = {
    input: {
      bounds: area.bounds,
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange,
            mosaickingOrder: "leastCC",
            maxCloudCoverage,
          },
        },
      ],
    },
    output: {
      width: size.width,
      height: size.height,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript,
  };

  const response = await fetchCopernicus(PROCESS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(`Sentinel Hub Process API failed [${response.status}]: ${text}`, response.status);
  }

  return `data:image/png;base64,${arrayBufferToBase64(await response.arrayBuffer())}`;
}

async function fetchCopernicus(url: string, init: RequestInit) {
  const response = await fetchWithFreshToken(url, init);
  if (response.status !== 401) return response;

  cachedToken = null;
  return fetchWithFreshToken(url, init);
}

async function fetchWithFreshToken(url: string, init: RequestInit) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers,
  });
}

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs - TOKEN_EXPIRY_MARGIN_MS) {
    return cachedToken.accessToken;
  }

  const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
  const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new HttpError("Copernicus credentials are not configured on the server.", 500);
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    throw new HttpError(
      data?.error_description ?? data?.error ?? "Copernicus authentication failed.",
      response.status,
    );
  }

  cachedToken = {
    accessToken: String(data.access_token),
    expiresAtMs: Date.now() + Number(data.expires_in ?? 300) * 1000,
  };

  return cachedToken.accessToken;
}

function isBoundary(value: unknown): value is BoundaryPoint[] {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        isLat(point[0]) &&
        isLon(point[1]),
    )
  );
}

function isGeoJsonPolygon(value: unknown): value is NormalizedArea["bounds"]["geometry"] {
  const polygon = value as NormalizedArea["bounds"]["geometry"];
  return Boolean(
    polygon?.type === "Polygon" &&
      Array.isArray(polygon.coordinates) &&
      Array.isArray(polygon.coordinates[0]) &&
      polygon.coordinates[0].length >= 4 &&
      polygon.coordinates[0].every(
        (point) => Array.isArray(point) && point.length === 2 && isLon(point[0]) && isLat(point[1]),
      ),
  );
}

function isBBox(value: unknown): value is BBox {
  if (!Array.isArray(value) || value.length !== 4) return false;
  const [west, south, east, north] = value;
  return isLon(west) && isLat(south) && isLon(east) && isLat(north) && west < east && south < north;
}

function isLat(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isLon(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function polygonFromBoundary(boundary: BoundaryPoint[]) {
  const coordinates = boundary.map(([lat, lon]) => [lon, lat]);
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push([...first]);
  }

  return {
    type: "Polygon" as const,
    coordinates: [coordinates],
  };
}

function bboxFromCoordinates(coordinates: number[][]): BBox {
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

function leafletBoundsFromBbox([west, south, east, north]: BBox): [[number, number], [number, number]] {
  return [
    [south, west],
    [north, east],
  ];
}

function imageSizeForBbox([west, south, east, north]: BBox) {
  const meanLat = (south + north) / 2;
  const widthMeters = Math.max(1, (east - west) * 111_320 * Math.cos((meanLat * Math.PI) / 180));
  const heightMeters = Math.max(1, (north - south) * 110_540);
  const aspect = widthMeters / heightMeters;
  const max = 768;
  const min = 256;

  if (aspect >= 1) {
    return { width: max, height: Math.max(min, Math.round(max / aspect)) };
  }

  return { width: Math.max(min, Math.round(max * aspect)), height: max };
}

function getOutputStats(interval: StatsInterval) {
  const output = interval.outputs?.data;
  const bands = output?.bands ?? {};
  const firstBand = bands.B0 ?? Object.values(bands)[0];
  return firstBand?.stats ?? null;
}

function isUsableStats(stats: StatsValue | null): stats is StatsValue {
  return Boolean(
    stats &&
      Number.isFinite(stats.mean) &&
      Number.isFinite(stats.min) &&
      Number.isFinite(stats.max) &&
      stats.sampleCount > stats.noDataCount,
  );
}

function interpretNdvi(value: number) {
  if (value < 0.15) return "Very low NDVI. The selected area has little active vegetation or severe crop stress.";
  if (value < 0.35) return "Low NDVI. Vegetation is weak or stressed and should be checked in the field.";
  if (value < 0.55) return "Moderate NDVI. Vegetation is present but may be uneven or developing.";
  if (value < 0.72) return "Good NDVI. Vegetation is generally healthy across the selected area.";
  return "High NDVI. Dense, active vegetation is detected in the selected area.";
}

function interpretRisk(ndvi: number) {
  if (ndvi < 0.15) return "High risk: very low NDVI indicates poor vegetation condition or bare/stressed ground.";
  if (ndvi < 0.35) return "High to moderate risk: low NDVI indicates vegetation stress that needs attention.";
  if (ndvi < 0.55) return "Moderate condition: vegetation is present but not strongly healthy across the area.";
  return "Low vegetation risk: NDVI indicates healthier vegetation conditions.";
}

function interpretWater(percentage: number) {
  if (percentage < 1) return "No meaningful water signal detected in the selected area.";
  if (percentage < 10) return "Small water presence detected. Check the blue pixels for possible wet spots or irrigation water.";
  if (percentage < 35) return "Moderate water presence detected within the selected area.";
  return "Large part of the selected area is detected as water or possible water.";
}

function buildWarnings(maxCloudCoverage: number) {
  const warnings = [
    "Cloud masking uses Sentinel-2 scene classification. Clouds, shadows, snow, or haze can reduce accuracy.",
  ];

  if (maxCloudCoverage > 50) {
    warnings.push("The selected max cloud coverage is high, so results may be less reliable.");
  }

  return warnings;
}

function startOfDayIso(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString();
}

function endOfDayIso(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy.toISOString();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}
