import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ImageOverlay, MapContainer, Marker, Polygon, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Droplets, Leaf, Loader2, RefreshCw, Satellite, ShieldAlert, type LucideIcon } from "lucide-react";
import FloodRiskMap from "@/components/dashboard/FloodRiskMap";
import SatelliteTileLayer from "@/components/dashboard/SatelliteTileLayer";
import { useAuth } from "@/contexts/AuthContext";
import { getFloodWorkspace, highRiskZones, isGovernmentWorkspace, peopleTotal, riskBadgeClass } from "@/lib/government/flood";
import {
  formatBoundaryArea,
  getBoundaryCenter,
  isFieldBoundary,
  makeFieldBoundaryAroundPoint,
  type FieldBoundary,
} from "@/lib/field-boundary";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { listLocalFarms, type StoredFarm } from "@/lib/local-farms";
import { placemarkIcon } from "@/lib/map/placemark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analyzeSatelliteArea,
  defaultSatelliteDateRange,
  saveLatestSatelliteAnalysis,
  type AnalysisLayer,
  type SatelliteAnalysisResult,
} from "@/lib/satellite-analysis";

type LiveField = {
  id: string;
  name: string;
  crop: string | null;
  lat: number;
  lon: number;
  color: string;
  boundary: FieldBoundary;
  ownerName: string;
  ownerEmail: string;
};

type FieldOwner = {
  ownerName: string;
  ownerEmail: string;
};

const layerOptions: Array<{
  id: AnalysisLayer;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "rgb",
    label: "RGB View",
    description: "True color from B04, B03, B02",
    icon: Satellite,
  },
  {
    id: "ndvi",
    label: "NDVI",
    description: "Vegetation health from B08 and B04",
    icon: Leaf,
  },
  {
    id: "water",
    label: "Water Detection",
    description: "NDWI water mask from B03 and B08",
    icon: Droplets,
  },
  {
    id: "risk",
    label: "Vegetation Risk",
    description: "Stress risk derived from real NDVI",
    icon: ShieldAlert,
  },
];

const sampleFields: LiveField[] = [
  {
    id: "tikves-vineyard",
    name: "Tikveš vineyard block",
    crop: "Vranec grapes",
    lat: 41.4304,
    lon: 22.0086,
    color: "#2f80ed",
    boundary: makeFieldBoundaryAroundPoint([41.4304, 22.0086], 340),
    ownerName: "SATELLES sample field",
    ownerEmail: "farmer@demo.satelles.mk",
  },
  {
    id: "pelagonija-wheat",
    name: "Pelagonija wheat field",
    crop: "Wheat",
    lat: 41.0316,
    lon: 21.3433,
    color: "#2f80ed",
    boundary: makeFieldBoundaryAroundPoint([41.0316, 21.3433], 420),
    ownerName: "SATELLES sample field",
    ownerEmail: "farmer@demo.satelles.mk",
  },
  {
    id: "strumica-greenhouse",
    name: "Strumica greenhouse parcel",
    crop: "Vegetables",
    lat: 41.4378,
    lon: 22.6433,
    color: "#2f80ed",
    boundary: makeFieldBoundaryAroundPoint([41.4378, 22.6433], 240),
    ownerName: "SATELLES sample field",
    ownerEmail: "farmer@demo.satelles.mk",
  },
  {
    id: "kocani-rice",
    name: "Kočani rice field",
    crop: "Rice",
    lat: 41.9165,
    lon: 22.4128,
    color: "#2f80ed",
    boundary: makeFieldBoundaryAroundPoint([41.9165, 22.4128], 380),
    ownerName: "SATELLES sample field",
    ownerEmail: "farmer@demo.satelles.mk",
  },
];

function farmToLiveField(farm: StoredFarm, index: number, owner: FieldOwner): LiveField {
  const boundary = isFieldBoundary(farm.boundary)
    ? farm.boundary
    : makeFieldBoundaryAroundPoint([farm.lat, farm.lon], 260);
  const [lat, lon] = getBoundaryCenter(boundary, [farm.lat, farm.lon]);
  const palette = ["#2f80ed", "#00a884", "#7b61ff", "#c44536"];

  return {
    id: farm.id,
    name: farm.name,
    crop: farm.crop,
    lat,
    lon,
    color: palette[index % palette.length],
    boundary,
    ownerName: owner.ownerName,
    ownerEmail: owner.ownerEmail,
  };
}

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const defaultDates = useMemo(() => defaultSatelliteDateRange(), []);
  const [savedFields, setSavedFields] = useState<LiveField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [analysisLayer, setAnalysisLayer] = useState<AnalysisLayer>("ndvi");
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [maxCloudCoverage, setMaxCloudCoverage] = useState(35);
  const [analysis, setAnalysis] = useState<SatelliteAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const isGovernment = isGovernmentWorkspace(user?.email);
  const owner = useMemo<FieldOwner>(() => {
    const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
    return {
      ownerName: fullName || user?.email || "Current owner",
      ownerEmail: user?.email ?? "Local account",
    };
  }, [user?.email, user?.user_metadata?.full_name]);

  useEffect(() => {
    if (!user || isGovernment) return;

    if (!isSupabaseConfigured) {
      setSavedFields(listLocalFarms(user.id).map((farm, index) => farmToLiveField(farm, index, owner)));
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("farms")
        .select("*")
        .order("created_at", { ascending: false });

      setSavedFields(((data ?? []) as StoredFarm[]).map((farm, index) => farmToLiveField(farm, index, owner)));
    })();
  }, [user, isGovernment, owner]);

  const fields = useMemo(() => (savedFields.length > 0 ? savedFields : sampleFields), [savedFields]);
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;

  useEffect(() => {
    if (isGovernment || !selectedFieldId) return;
    if (!fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(null);
      setAnalysis(null);
      setAnalysisError(null);
    }
  }, [fields, isGovernment, selectedFieldId]);

  function selectField(id: string) {
    setSelectedFieldId(id);
    setAnalysis(null);
    setAnalysisError(null);
  }

  function changeLayer(layer: AnalysisLayer) {
    setAnalysisLayer(layer);
    setAnalysis(null);
    setAnalysisError(null);
  }

  async function analyzeSelectedArea() {
    if (!selectedField) {
      setAnalysisError("Select a field polygon on the map before running satellite analysis.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysis(null);

    try {
      const result = await analyzeSatelliteArea({
        layer: analysisLayer,
        boundary: selectedField.boundary,
        startDate,
        endDate,
        maxCloudCoverage,
      });
      const resultWithField = { ...result, fieldName: selectedField.name };
      setAnalysis(resultWithField);
      saveLatestSatelliteAnalysis(resultWithField);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Satellite analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  if (isGovernment) {
    const workspace = getFloodWorkspace(user?.email);
    const urgentZones = highRiskZones(workspace.zones);

    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Flood risk map</h1>
            <p className="mt-1 text-muted-foreground">
              {workspace.city} · {workspace.nearestWaterway} · Sentinel-1 flood extent and rainfall exposure.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft">
            <p className="font-medium">{peopleTotal(workspace.zones).toLocaleString()} residents exposed</p>
            <p className="text-xs text-muted-foreground">{urgentZones.length} high-priority zones</p>
          </div>
        </div>

        <FloodRiskMap workspace={workspace} heightClassName="h-[640px]" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workspace.zones.map((zone) => (
            <div key={zone.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{zone.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{zone.nearestWaterway}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${riskBadgeClass(zone.risk)}`}>
                  {zone.risk}
                </span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {zone.expectedRainMm} mm rain · {zone.affectedPeople.toLocaleString()} residents · {zone.floodDepthM.toFixed(2)} m depth
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Live map</h1>
        <p className="mt-1 text-muted-foreground">
          Draw or select field boundaries. Every analysis request uses the selected polygon only.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="h-[560px] w-full">
          <MapContainer
            center={[41.6086, 21.7453]}
            zoom={8}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <ResizeFix />
            <SatelliteTileLayer />
            {analysis && selectedField && (
              <ImageOverlay
                url={analysis.imageDataUrl}
                bounds={analysis.bounds}
                opacity={analysis.layer === "rgb" ? 0.92 : 0.86}
                zIndex={450}
              />
            )}
            {fields.map((field) => (
              <Polygon
                key={field.id}
                positions={field.boundary}
                eventHandlers={{ click: () => selectField(field.id) }}
                pathOptions={{
                  color: selectedFieldId === field.id ? "#00ff88" : field.color,
                  fillColor: field.color,
                  fillOpacity: selectedFieldId === field.id && analysis ? 0.04 : 0.18,
                  weight: selectedFieldId === field.id ? 5 : 3,
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="min-w-44">
                    <div className="font-medium">{field.name}</div>
                    <div className="mt-1 text-xs">Owner: {field.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{field.ownerEmail}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatBoundaryArea(field.boundary)}
                      {field.crop ? ` · ${field.crop}` : ""}
                    </div>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="font-medium">{field.name}</div>
                  <div className="text-xs text-muted-foreground">Owner: {field.ownerName}</div>
                  {field.crop && <div className="text-xs text-muted-foreground">{field.crop}</div>}
                  <div className="text-xs text-muted-foreground">
                    {formatBoundaryArea(field.boundary)} · {field.boundary.length} polygon points
                  </div>
                </Popup>
              </Polygon>
            ))}
            {fields.map((field) => (
              <Marker key={`m-${field.id}`} position={[field.lat, field.lon]} icon={placemarkIcon}>
                <Popup>{field.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Satellite analysis</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Source: Sentinel-2 L2A via Copernicus Data Space / Sentinel Hub.
            </p>
          </div>
          {selectedField && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {selectedField.name}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-4">
          {layerOptions.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeLayer(id)}
              className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                analysisLayer === id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5">{description}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <div>
            <label htmlFor="analysis-start" className="text-xs font-medium text-muted-foreground">
              Start date
            </label>
            <Input
              id="analysis-start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="analysis-end" className="text-xs font-medium text-muted-foreground">
              End date
            </label>
            <Input
              id="analysis-end"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="cloud-coverage" className="text-xs font-medium text-muted-foreground">
              Max cloud %
            </label>
            <Input
              id="cloud-coverage"
              type="number"
              min={0}
              max={100}
              value={maxCloudCoverage}
              onChange={(event) => setMaxCloudCoverage(Number(event.target.value))}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
          <Button
            type="button"
            onClick={analyzeSelectedArea}
            disabled={analysisLoading || !selectedField}
            className="h-11 rounded-xl"
          >
            {analysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Analyze Area
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium">Selected area</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedField
                ? `${formatBoundaryArea(selectedField.boundary)} · ${selectedField.boundary.length} polygon points`
                : "Click a field boundary on the map."}
            </p>
            {!isSupabaseConfigured && (
              <p className="mt-3 text-sm text-destructive">
                Supabase backend is not configured, so Copernicus analysis cannot run from this browser.
              </p>
            )}
            {analysisError && (
              <div className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium">Layer legend</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">{renderLegend(analysisLayer)}</div>
            <p className="mt-3 text-xs text-muted-foreground">
              {analysisLayer === "risk"
                ? "Dark areas indicate higher vegetation stress/risk. Green/light areas indicate healthier vegetation."
                : "Transparent pixels mean no valid satellite data after no-data and cloud masking."}
            </p>
          </div>
        </div>
      </div>

      <AnalysisResultCard analysis={analysis} loading={analysisLoading} layer={analysisLayer} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {fields.map((field) => (
          <div key={field.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="text-sm font-medium">{field.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {field.crop || "Monitored field"} · Owner: {field.ownerName}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatBoundaryArea(field.boundary)} · {field.boundary.length} boundary points
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisResultCard({
  analysis,
  loading,
  layer,
}: {
  analysis: SatelliteAnalysisResult | null;
  loading: boolean;
  layer: AnalysisLayer;
}) {
  if (loading) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-2xl border border-border bg-card p-6 shadow-soft">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Fetching real Sentinel-2 data for the selected polygon...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold tracking-tight">Analysis results</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a field, choose a layer, then run analysis. No fake NDVI, water, weather, or risk values are shown here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{layerLabel(analysis.layer)} results</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {analysis.fieldName ? `${analysis.fieldName} · ` : ""}
            Acquisition: {formatDateTime(analysis.acquisitionDate)}
          </p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Real Copernicus data
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {analysis.layer === "ndvi" || analysis.layer === "risk" ? (
          <>
            <Metric label="Average NDVI" value={formatMetric(analysis.stats?.averageNdvi)} />
            <Metric label="Minimum NDVI" value={formatMetric(analysis.stats?.minNdvi)} />
            <Metric label="Maximum NDVI" value={formatMetric(analysis.stats?.maxNdvi)} />
          </>
        ) : analysis.layer === "water" ? (
          <>
            <Metric label="Detected water" value={`${formatMetric(analysis.stats?.waterPercentage)}%`} />
            <Metric label="Valid samples" value={formatCount(analysis.stats?.sampleCount)} />
            <Metric label="Masked samples" value={formatCount(analysis.stats?.noDataCount)} />
          </>
        ) : (
          <>
            <Metric label="RGB bands" value="B04 · B03 · B02" />
            <Metric label="Cloud filter" value="SCL mask" />
            <Metric label="Pixel source" value="Sentinel-2 L2A" />
          </>
        )}
      </div>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">{analysis.interpretation}</p>
      <p className="mt-3 text-xs text-muted-foreground">Source: {analysis.source}</p>
      {analysis.warnings && analysis.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {analysis.warnings.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function renderLegend(layer: AnalysisLayer) {
  if (layer === "rgb") {
    return (
      <>
        <LegendSwatch color="#d34b39" label="B04 red" />
        <LegendSwatch color="#49a35b" label="B03 green" />
        <LegendSwatch color="#3d7dd8" label="B02 blue" />
      </>
    );
  }

  if (layer === "water") {
    return (
      <>
        <LegendSwatch color="#0d6fe5" label="Water" />
        <LegendSwatch color="#59c7ff" label="Possible water" />
        <LegendSwatch color="#292e33" label="Non-water" />
      </>
    );
  }

  if (layer === "risk") {
    return (
      <>
        <LegendSwatch color="#380d08" label="High risk" />
        <LegendSwatch color="#b31a14" label="Stress" />
        <LegendSwatch color="#ef9429" label="Moderate" />
        <LegendSwatch color="#82c440" label="Healthy" />
      </>
    );
  }

  return (
    <>
      <LegendSwatch color="#5c1f12" label="Very low" />
      <LegendSwatch color="#bd2e21" label="Low" />
      <LegendSwatch color="#edb82b" label="Medium" />
      <LegendSwatch color="#66bd38" label="Healthy" />
      <LegendSwatch color="#bfed61" label="Very healthy" />
    </>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function layerLabel(layer: AnalysisLayer) {
  if (layer === "rgb") return "RGB View";
  if (layer === "water") return "Water Detection";
  if (layer === "risk") return "Vegetation Risk";
  return "NDVI";
}

function formatMetric(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "--";
}

function formatCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "--";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
