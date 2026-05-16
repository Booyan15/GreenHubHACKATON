import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polygon, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

type LiveField = {
  id: string;
  name: string;
  crop: string | null;
  lat: number;
  lon: number;
  risk: string;
  color: string;
  boundary: FieldBoundary;
  ownerName: string;
  ownerEmail: string;
};

type FieldOwner = {
  ownerName: string;
  ownerEmail: string;
};

const sampleFields: LiveField[] = [
  {
    id: "tikves-vineyard",
    name: "Tikveš vineyard block",
    crop: "Vranec grapes",
    lat: 41.4304,
    lon: 22.0086,
    risk: "medium",
    color: "#ff9500",
    boundary: makeFieldBoundaryAroundPoint([41.4304, 22.0086], 340),
    ownerName: "SATELLES Demo Farm",
    ownerEmail: "farmer@demo.satelles.mk",
  },
  {
    id: "pelagonija-wheat",
    name: "Pelagonija wheat field",
    crop: "Wheat",
    lat: 41.0316,
    lon: 21.3433,
    risk: "low",
    color: "#34c759",
    boundary: makeFieldBoundaryAroundPoint([41.0316, 21.3433], 420),
    ownerName: "SATELLES Demo Farm",
    ownerEmail: "farmer@demo.satelles.mk",
  },
  {
    id: "strumica-greenhouse",
    name: "Strumica greenhouse parcel",
    crop: "Vegetables",
    lat: 41.4378,
    lon: 22.6433,
    risk: "high",
    color: "#ff3b30",
    boundary: makeFieldBoundaryAroundPoint([41.4378, 22.6433], 240),
    ownerName: "SATELLES Demo Farm",
    ownerEmail: "farmer@demo.satelles.mk",
  },
  {
    id: "kocani-rice",
    name: "Kočani rice field",
    crop: "Rice",
    lat: 41.9165,
    lon: 22.4128,
    risk: "medium",
    color: "#ff9500",
    boundary: makeFieldBoundaryAroundPoint([41.9165, 22.4128], 380),
    ownerName: "SATELLES Demo Farm",
    ownerEmail: "farmer@demo.satelles.mk",
  },
];

function farmToLiveField(farm: StoredFarm, index: number, owner: FieldOwner): LiveField {
  const boundary = isFieldBoundary(farm.boundary)
    ? farm.boundary
    : makeFieldBoundaryAroundPoint([farm.lat, farm.lon], 260);
  const [lat, lon] = getBoundaryCenter(boundary, [farm.lat, farm.lon]);
  const palette = ["#34c759", "#007aff", "#ff9500", "#ff3b30"];

  return {
    id: farm.id,
    name: farm.name,
    crop: farm.crop,
    lat,
    lon,
    risk: "monitored",
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
  const [savedFields, setSavedFields] = useState<LiveField[]>([]);
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

  const fields = useMemo(
    () => (savedFields.length > 0 ? savedFields : sampleFields),
    [savedFields],
  );

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
          Field boundaries on satellite imagery · risk overlays from Sentinel-2 & climate models.
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
            {fields.map((z) => (
              <Polygon
                key={z.id}
                positions={z.boundary}
                pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.24, weight: 3 }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="min-w-44">
                    <div className="font-medium">{z.name}</div>
                    <div className="mt-1 text-xs">Owner: {z.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{z.ownerEmail}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatBoundaryArea(z.boundary)}
                      {z.crop ? ` · ${z.crop}` : ""}
                    </div>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="font-medium">{z.name}</div>
                  <div className="text-xs text-muted-foreground">Owner: {z.ownerName}</div>
                  {z.crop && <div className="text-xs text-muted-foreground">{z.crop}</div>}
                  <div className="text-xs" style={{ color: z.color }}>
                    {formatBoundaryArea(z.boundary)} · {z.risk}
                  </div>
                </Popup>
              </Polygon>
            ))}
            {fields.map((z) => (
              <Marker key={`m-${z.id}`} position={[z.lat, z.lon]} icon={placemarkIcon}>
                <Popup>{z.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {fields.map((z) => (
          <div key={z.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="text-sm font-medium">{z.name}</div>
            <div className="mt-1 text-xs uppercase tracking-wider" style={{ color: z.color }}>
              {z.risk} risk
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatBoundaryArea(z.boundary)} · {z.boundary.length} boundary points
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
