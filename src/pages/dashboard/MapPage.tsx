import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOverlay, MapContainer, Marker, Polygon, Popup, Tooltip, useMap } from "react-leaflet";
import InvalidateMapOnAnalysis from "@/components/dashboard/InvalidateMapOnAnalysis";
import Eli5InfoTip from "@/components/dashboard/Eli5InfoTip";
import FieldsDropdown from "@/components/dashboard/FieldsDropdown";
import NdviMapLegend, { NDVI_ELI5 } from "@/components/dashboard/NdviMapLegend";
import WaterMapLegend, { WATER_ELI5 } from "@/components/dashboard/WaterMapLegend";
import "leaflet/dist/leaflet.css";
import { Droplets, Leaf, Loader2, type LucideIcon } from "lucide-react";
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
import {
  analyzeSatelliteArea,
  canRunSatelliteAnalysis,
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
  eli5?: string;
}> = [
  {
    id: "ndvi",
    label: "NDVI",
    description: "Vegetation health from B08 and B04",
    icon: Leaf,
    eli5: NDVI_ELI5,
  },
  {
    id: "water",
    label: "Water Detection",
    description: "NDWI moisture index from B03 and B08",
    icon: Droplets,
    eli5: WATER_ELI5,
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

function ZoomToField({ fieldId, boundary }: { fieldId: string | null; boundary: FieldBoundary | null }) {
  const map = useMap();

  useEffect(() => {
    if (!fieldId || !boundary || boundary.length < 3) return;
    map.fitBounds(boundary, { padding: [56, 56], maxZoom: 16, animate: true });
    const t = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(t);
  }, [fieldId, boundary, map]);

  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const defaultDates = useMemo(() => defaultSatelliteDateRange(), []);
  const analysisCache = useRef(new Map<string, SatelliteAnalysisResult>());
  const [savedFields, setSavedFields] = useState<LiveField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [analysisLayer, setAnalysisLayer] = useState<AnalysisLayer>("ndvi");
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [maxCloudCoverage, setMaxCloudCoverage] = useState(60);
  const [analysis, setAnalysis] = useState<SatelliteAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analyzingFieldId, setAnalyzingFieldId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const isGovernment = isGovernmentWorkspace(user?.email);
  const owner = useMemo<FieldOwner>(() => {
    const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
    return {
      ownerName: fullName || user?.email || "Current owner",
      ownerEmail: user?.email ?? "Local account",
    };
  }, [user?.email, user?.user_metadata?.full_name]);

  const reloadFields = useCallback(async () => {
    if (!user || isGovernment) return;

    if (!isSupabaseConfigured) {
      setSavedFields(listLocalFarms(user.id).map((farm, index) => farmToLiveField(farm, index, owner)));
      return;
    }

    const { data } = await supabase.from("farms").select("*").order("created_at", { ascending: false });
    setSavedFields(((data ?? []) as StoredFarm[]).map((farm, index) => farmToLiveField(farm, index, owner)));
  }, [user, isGovernment, owner]);

  useEffect(() => {
    void reloadFields();
  }, [reloadFields]);

  useEffect(() => {
    const onFocus = () => void reloadFields();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reloadFields]);

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

  const runAnalysis = useCallback(
    async (field: LiveField, layer: AnalysisLayer) => {
      if (!canRunSatelliteAnalysis()) {
        setAnalysisError("Run npm run dev with COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET in .env.");
        return;
      }

      const cacheKey = `v5:${field.id}:${layer}:${startDate}:${endDate}:${maxCloudCoverage}`;
      const cached = analysisCache.current.get(cacheKey);
      if (cached && layer !== "ndvi" && layer !== "water") {
        setAnalysis(cached);
        setAnalysisError(null);
        return;
      }

      setAnalysisLoading(true);
      setAnalyzingFieldId(field.id);
      setAnalysisError(null);
      setAnalysis(null);

      try {
        const result = await analyzeSatelliteArea({
          layer,
          boundary: field.boundary,
          startDate,
          endDate,
          maxCloudCoverage,
        });
        const resultWithField = { ...result, fieldName: field.name, fieldId: field.id };
        analysisCache.current.set(cacheKey, resultWithField);
        setAnalysis(resultWithField);
        saveLatestSatelliteAnalysis(resultWithField);
      } catch (error) {
        setAnalysisError(error instanceof Error ? error.message : "Satellite analysis failed.");
      } finally {
        setAnalysisLoading(false);
        setAnalyzingFieldId(null);
      }
    },
    [endDate, maxCloudCoverage, startDate],
  );

  const handleFieldSelect = useCallback(
    (field: LiveField) => {
      setSelectedFieldId(field.id);
      setAnalysisLayer("ndvi");
      void runAnalysis(field, "ndvi");
    },
    [runAnalysis],
  );

  const overlayBoundary = selectedField?.boundary ?? null;

  function changeLayer(layer: AnalysisLayer) {
    setAnalysisLayer(layer);
    if (selectedField) void runAnalysis(selectedField, layer);
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
          Click a field to load NDVI inside its shape. No rectangular box — only your polygon outline and colors.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="relative h-[560px] w-full">
          <MapContainer
            center={[41.6086, 21.7453]}
            zoom={8}
            scrollWheelZoom
            className="z-0 h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >
            <ResizeFix />
            <ZoomToField fieldId={selectedFieldId} boundary={overlayBoundary} />
            <InvalidateMapOnAnalysis token={analysis ? `${analysis.generatedAt}-${analysis.layer}` : null} />
            <FieldsDropdown
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelect={handleFieldSelect}
            />
            <SatelliteTileLayer />
            {analysis && selectedField && (
              <ImageOverlay
                key={`${selectedField.id}-${analysis.generatedAt}-${analysis.layer}`}
                url={analysis.imageDataUrl}
                bounds={analysis.bounds}
                opacity={0.9}
                className="satelles-field-overlay"
                zIndex={450}
              />
            )}
            {fields.map((field) => {
              const isSelected = selectedFieldId === field.id;
              const isLoading = analyzingFieldId === field.id;
              return (
              <Polygon
                key={field.id}
                positions={field.boundary}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    handleFieldSelect(field);
                  },
                }}
                pathOptions={{
                  color: isSelected ? "#00ff88" : field.color,
                  fillColor: field.color,
                  fillOpacity: isSelected ? 0 : 0.12,
                  weight: isSelected ? 3 : 2,
                  dashArray: isLoading ? "6 4" : undefined,
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
            );
            })}
            {fields.map((field) => (
              <Marker key={`m-${field.id}`} position={[field.lat, field.lon]} icon={placemarkIcon}>
                <Popup>{field.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
          {analysis?.layer === "ndvi" && selectedField && analysis.imageDataUrl && !analysisLoading && (
            <NdviMapLegend
              fieldName={selectedField.name}
              averageNdvi={analysis.stats?.averageNdvi}
              acquisitionDate={analysis.acquisitionDate}
            />
          )}
          {analysis?.layer === "water" && selectedField && analysis.imageDataUrl && !analysisLoading && (
            <WaterMapLegend
              fieldName={selectedField.name}
              waterPercentage={analysis.stats?.waterPercentage}
              acquisitionDate={analysis.acquisitionDate}
            />
          )}
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
          {layerOptions.map(({ id, label, description, icon: Icon, eli5 }) => (
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
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{label}</span>
                  {eli5 && <Eli5InfoTip text={eli5} label={`Explain ${label}`} />}
                </span>
                <span className="mt-1 block text-xs leading-5">{description}</span>
              </span>
            </button>
          ))}
        </div>


      </div>

      <FieldScoreCard
        selectedField={selectedField}
        analysis={analysis}
        loading={analysisLoading}
        layer={analysisLayer}
      />

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

function FieldScoreCard({
  selectedField,
  analysis,
  loading,
  layer,
}: {
  selectedField: { name: string; boundary: FieldBoundary } | null;
  analysis: SatelliteAnalysisResult | null;
  loading: boolean;
  layer: AnalysisLayer;
}) {
  const areaLabel = selectedField ? formatBoundaryArea(selectedField.boundary) : null;

  const scoreLabel = layer === "water" ? "High-moisture area" : "Average NDVI";
  const scoreValue = loading
    ? "…"
    : layer === "water"
      ? analysis?.stats?.waterPercentage !== undefined
        ? `${analysis.stats.waterPercentage.toFixed(1)}%`
        : "--"
      : analysis?.stats?.averageNdvi !== undefined
        ? analysis.stats.averageNdvi.toFixed(2)
        : "--";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      {/* Field identity */}
      <div className="min-w-0">
        {selectedField ? (
          <>
            <h2 className="truncate text-3xl font-bold tracking-tight">{selectedField.name}</h2>
            <p className="mt-1 text-base font-medium text-muted-foreground">{areaLabel}</p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold tracking-tight text-muted-foreground">No field selected</h2>
            <p className="mt-1 text-base text-muted-foreground">Click a field polygon on the map</p>
          </>
        )}
      </div>

      {/* Score */}
      <div className="flex shrink-0 flex-col items-start rounded-2xl border border-border bg-background px-8 py-5 sm:items-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {scoreLabel}
        </p>
        {loading ? (
          <div className="mt-2 flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-2xl font-bold text-muted-foreground">…</span>
          </div>
        ) : (
          <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight">{scoreValue}</p>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">Sentinel-2 · Copernicus</p>
      </div>
    </div>
  );
}

function formatMetric(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "--";
}
