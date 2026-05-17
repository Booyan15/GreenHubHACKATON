import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOverlay, MapContainer, Marker, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
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

// Red Google-Maps-style pin icon
const redPinIcon = L.divIcon({
  className: "",
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#e53935"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
});


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
  const [lastNdviAverage, setLastNdviAverage] = useState<number | undefined>(undefined);
  const [scoutPin, setScoutPin] = useState<{ lat: number; lon: number } | null>(null);
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
        if (layer === "ndvi" && resultWithField.stats?.averageNdvi !== undefined) {
          setLastNdviAverage(resultWithField.stats.averageNdvi);
        }
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
      setLastNdviAverage(undefined);
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
    <div className="mx-auto max-w-7xl space-y-4">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Live map</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Click a field to load satellite data, then tap a spot to scout it.
        </p>
      </div>

      {/* ── Unified control bar: layer pills LEFT · field selector RIGHT ───── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Layer segmented control */}
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1 shadow-sm">
          {layerOptions.map(({ id, label, icon: Icon, eli5 }) => {
            const active = analysisLayer === id;
            return (
              <div key={id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => changeLayer(id)}
                  className={`flex items-center gap-2.5 rounded-full px-8 py-3.5 text-base font-semibold transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </button>
                {eli5 && (
                  <span className="px-1">
                    <Eli5InfoTip text={eli5} label={`Explain ${label}`} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Field selector */}
        <FieldsDropdown
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelect={handleFieldSelect}
        />
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
                    // Only load NDVI when switching to a different field.
                    // If this field is already active, skip the analysis refresh
                    // entirely — just move the scout pin.
                    if (field.id !== selectedFieldId) {
                      handleFieldSelect(field);
                    }
                    setScoutPin({ lat: e.latlng.lat, lon: e.latlng.lng });
                  },
                }}
                pathOptions={{
                  color: isSelected ? "#00ff88" : field.color,
                  fillColor: field.color,
                  fillOpacity: isSelected ? 0 : 0.12,
                  weight: isSelected ? 3 : 2,
                  dashArray: isLoading ? "6 4" : undefined,
                }}
              />

            );
            })}
            {scoutPin && (
              <Marker position={[scoutPin.lat, scoutPin.lon]} icon={redPinIcon} zIndexOffset={1000} />
            )}
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

      <FieldScoreCard
        selectedField={selectedField}
        analysis={analysis}
        loading={analysisLoading}
        layer={analysisLayer}
        lastNdviAverage={lastNdviAverage}
      />

    </div>
  );
}


// ─── Status badge helpers ─────────────────────────────────────────────────────

function getNdviBadge(ndvi: number | undefined): { text: string; className: string } | null {
  if (ndvi === undefined) return null;
  if (ndvi >= 0.5) return { text: "🟢 High (Optimal Vegetation)", className: "text-green-600 dark:text-green-400" };
  if (ndvi < 0.2) return { text: "🔴 Low (Severe Crop Stress)", className: "text-red-500 dark:text-red-400" };
  return null;
}

function getMoistureBadge(value: string): { text: string; className: string } | null {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return null;
  if (num >= 40 && num <= 60) return { text: "🟢 Middle (Optimal Moisture)", className: "text-green-600 dark:text-green-400" };
  if (num > 75) return { text: "🚨 Too High (Risk of Flooding / Root Rot)", className: "text-red-500 dark:text-red-400" };
  if (num < 30) return { text: "🟡 Too Low (Drought Stress / Needs Water)", className: "text-amber-500 dark:text-amber-400" };
  return null;
}

// ─── Main card ────────────────────────────────────────────────────────────────

function getMockSoilMoisture(
  ndvi: number | undefined,
  waterPct: number | undefined,
): { value: string; sublabel: string } {
  if (ndvi === undefined) return { value: "--", sublabel: "Select a field to analyse" };
  // Real NDWI flooding signal takes priority
  if (waterPct !== undefined && waterPct > 40)
    return { value: "82.5%", sublabel: "Water Logging / Flooding" };
  // Healthy vegetation → optimal soil moisture
  if (ndvi >= 0.35) return { value: "48.3%", sublabel: "Optimal Moisture" };
  // Low / negative NDVI → bare soil or drought stress
  return { value: "14.2%", sublabel: "Dry Soil Stress" };
}

function FieldScoreCard({
  selectedField,
  analysis,
  loading,
  layer,
  lastNdviAverage,
}: {
  selectedField: { name: string; boundary: FieldBoundary } | null;
  analysis: SatelliteAnalysisResult | null;
  loading: boolean;
  layer: AnalysisLayer;
  lastNdviAverage: number | undefined;
}) {
  const areaLabel = selectedField ? formatBoundaryArea(selectedField.boundary) : null;

  const isWater = layer === "water";
  const moisture = getMockSoilMoisture(lastNdviAverage, analysis?.stats?.waterPercentage);

  const scoreLabel = isWater ? "Average Soil Moisture" : "Average NDVI";
  const scoreValue = loading
    ? "…"
    : isWater
      ? moisture.value
      : analysis?.stats?.averageNdvi !== undefined
        ? analysis.stats.averageNdvi.toFixed(2)
        : "--";
  const legendNote = isWater ? "Sentinel-2 NDWI / Copernicus" : "Sentinel-2 · Copernicus";

  const statusBadge = loading
    ? null
    : isWater
      ? getMoistureBadge(moisture.value)
      : getNdviBadge(analysis?.stats?.averageNdvi);

  return (
    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      {/* ── Left: Field identity ─────────────────────────────────────────── */}
      <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-8 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Selected field
        </p>
        {selectedField ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">{selectedField.name}</h2>
            <span className="rounded-full border border-border bg-background px-3.5 py-1 text-base font-bold text-muted-foreground">
              {areaLabel}
            </span>
          </div>
        ) : (
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-muted-foreground">
            Click a field on the map
          </h2>
        )}
      </div>

      {/* ── Right: Score ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {scoreLabel}
        </p>
        {loading ? (
          <div className="mt-4 flex items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            <span className="text-4xl font-extrabold text-muted-foreground">…</span>
          </div>
        ) : (
          <p className="mt-3 text-6xl font-extrabold tabular-nums tracking-tight">{scoreValue}</p>
        )}
        {statusBadge && (
          <p className={`mt-2 text-center text-xs font-bold ${statusBadge.className}`}>
            {statusBadge.text}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{legendNote}</p>
      </div>

    </div>
  );
}

