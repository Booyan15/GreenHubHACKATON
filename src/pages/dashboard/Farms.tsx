import { FormEvent, useEffect, useState } from "react";
import { Eraser, Loader2, Plus, Sprout, Trash2, Undo2 } from "lucide-react";
import { MapContainer, Marker, Polygon, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_ID,
  getCountryById,
  getCountryByName,
} from "@/lib/countries";
import { isGovernmentWorkspace } from "@/lib/government/flood";
import type { CountryLocation } from "@/lib/countries";
import { penDrawIcon } from "@/lib/map/placemark";
import SatelliteTileLayer from "@/components/dashboard/SatelliteTileLayer";
import {
  type FieldBoundary,
  formatBoundaryArea,
  getBoundaryCenter,
  isFieldBoundary,
  MIN_FIELD_BOUNDARY_POINTS,
} from "@/lib/field-boundary";
import { addLocalFarm, listLocalFarms, removeLocalFarm, type StoredFarm } from "@/lib/local-farms";

type Farm = StoredFarm;

const LOCATION_STORAGE_KEY = "satelles.location";

function defaultCountry() {
  return getCountryById(DEFAULT_COUNTRY_ID) ?? COUNTRIES[0];
}

function getInitialCountry() {
  if (typeof window === "undefined") return defaultCountry();

  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as { name?: string }) : null;
    return getCountryByName(parsed?.name) ?? defaultCountry();
  } catch {
    return defaultCountry();
  }
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

export default function Farms() {
  const { user } = useAuth();
  const isGovernment = isGovernmentWorkspace(user?.email);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const ownerName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email ||
    "Current owner";
  const ownerEmail = user?.email ?? "Local account";
  const [form, setForm] = useState(() => {
    const country = getInitialCountry();
    return {
      name: "",
      crop: "",
      countryId: country.id,
      lat: formatCoordinate(country.lat),
      lon: formatCoordinate(country.lon),
      boundary: [] as FieldBoundary,
    };
  });

  const selectedCountry = getCountryById(form.countryId) ?? defaultCountry();
  const selectedPoint = getBoundaryCenter(form.boundary, [
    selectedCountry.lat,
    selectedCountry.lon,
  ]);

  useEffect(() => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      setFarms(listLocalFarms(user.id));
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast({ title: "Couldn't load farms", description: error.message, variant: "destructive" });
      else setFarms(data as Farm[]);
      setLoading(false);
    })();
  }, [user]);

  async function addFarm(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (form.boundary.length < MIN_FIELD_BOUNDARY_POINTS) {
      toast({
        title: "Boundary incomplete",
        description: "Draw at least 3 points for this field boundary.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      crop: form.crop.trim() || null,
      lat: selectedPoint[0],
      lon: selectedPoint[1],
      boundary: form.boundary,
    };

    if (!isSupabaseConfigured) {
      const data = addLocalFarm(payload);
      setFarms([data, ...farms]);
      setForm({
        name: "",
        crop: "",
        countryId: selectedCountry.id,
        lat: formatCoordinate(selectedCountry.lat),
        lon: formatCoordinate(selectedCountry.lon),
        boundary: [],
      });
      setBusy(false);
      toast({ title: isGovernment ? "Zone added" : "Field added", description: `${data.name} is now monitored.` });
      return;
    }

    const { data, error } = await supabase.from("farms").insert(payload).select().single();
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't add farm", description: error.message, variant: "destructive" });
      return;
    }
    setFarms([data as Farm, ...farms]);
    setForm({
      name: "",
      crop: "",
      countryId: selectedCountry.id,
      lat: formatCoordinate(selectedCountry.lat),
      lon: formatCoordinate(selectedCountry.lon),
      boundary: [],
    });
    toast({ title: isGovernment ? "Zone added" : "Field added", description: `${data.name} is now monitored.` });
  }

  function handleCountryChange(countryId: string) {
    const country = getCountryById(countryId) ?? defaultCountry();
    setForm((current) => ({
      ...current,
      countryId: country.id,
      lat: formatCoordinate(country.lat),
      lon: formatCoordinate(country.lon),
      boundary: [],
    }));
  }

  function handleBoundaryChange(boundary: FieldBoundary) {
    const center = getBoundaryCenter(boundary, [selectedCountry.lat, selectedCountry.lon]);
    setForm((current) => ({
      ...current,
      boundary,
      lat: formatCoordinate(center[0]),
      lon: formatCoordinate(center[1]),
    }));
  }

  async function removeFarm(id: string) {
    if (!user) return;

    if (!isSupabaseConfigured) {
      removeLocalFarm(user.id, id);
      setFarms(farms.filter((f) => f.id !== id));
      return;
    }

    const { error } = await supabase.from("farms").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't remove zone", description: error.message, variant: "destructive" });
      return;
    }
    setFarms(farms.filter((f) => f.id !== id));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isGovernment ? "Flood zones" : "Farms & zones"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isGovernment
            ? "Manage monitored flood-risk areas for city operations."
            : "Add the land you want SATELLES to monitor 24/7."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form
          onSubmit={addFarm}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-3"
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isGovernment ? "Add evaluation zone" : "Add a new field"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGovernment
                ? "Boundary-based coverage for rainfall, river-level and flood exposure monitoring."
                : "Boundary-based coverage for satellite, weather and risk monitoring."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">{isGovernment ? "Zone name" : "Name"}</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={isGovernment ? "Riverside residential corridor" : "North vineyard"}
                className="mt-1 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="crop">{isGovernment ? "Zone type (optional)" : "Crop (optional)"}</Label>
              <Input
                id="crop"
                value={form.crop}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
                placeholder={isGovernment ? "Residential / hospital / transport" : "Vranec grapes"}
                className="mt-1 h-11 rounded-xl"
              />
            </div>
          </div>

          <div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={form.countryId} onValueChange={handleCountryChange}>
                <SelectTrigger id="country" className="mt-1 h-11 rounded-xl">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{country.name}</span>
                        <span className="text-xs text-muted-foreground">{country.region}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label>{isGovernment ? "Zone boundary" : "Field boundary"}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedCountry.name} · {form.boundary.length} points
                  {form.boundary.length >= MIN_FIELD_BOUNDARY_POINTS ? ` · ${formatBoundaryArea(form.boundary)}` : ""}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3"
                  disabled={form.boundary.length === 0}
                  onClick={() => handleBoundaryChange(form.boundary.slice(0, -1))}
                >
                  <Undo2 className="mr-1 h-3.5 w-3.5" />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-muted-foreground"
                  disabled={form.boundary.length === 0}
                  onClick={() => handleBoundaryChange([])}
                >
                  <Eraser className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
              <ZoneMapPicker
                country={selectedCountry}
                boundary={form.boundary}
                fieldName={form.name}
                crop={form.crop}
                ownerName={ownerName}
                ownerEmail={ownerEmail}
                onBoundaryChange={handleBoundaryChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="lat">Center latitude</Label>
              <Input id="lat" readOnly value={form.lat} className="mt-1 h-11 rounded-xl bg-muted/60" />
            </div>
            <div>
              <Label htmlFor="lon">Center longitude</Label>
              <Input id="lon" readOnly value={form.lon} className="mt-1 h-11 rounded-xl bg-muted/60" />
            </div>
            <Button type="submit" className="h-11 rounded-full px-6" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  {isGovernment ? "Add evaluation zone" : "Add field"}
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="space-y-3 lg:col-span-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : farms.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
              <Sprout className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {isGovernment
                  ? "No flood zones yet. Add the first evaluation zone to start monitoring exposure."
                  : "No zones yet. Add your first one to start monitoring."}
              </p>
            </div>
          ) : (
            farms.map((f) => {
              const boundary = isFieldBoundary(f.boundary) ? f.boundary : null;

              return (
                <div key={f.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.name}</span>
                      {f.crop && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{f.crop}</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {boundary
                        ? `${formatBoundaryArea(boundary)} boundary · ${boundary.length} points`
                        : `${f.lat.toFixed(4)}°, ${f.lon.toFixed(4)}° · legacy center`}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeFarm(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ZoneMapPicker({
  country,
  boundary,
  fieldName,
  crop,
  ownerName,
  ownerEmail,
  onBoundaryChange,
}: {
  country: CountryLocation;
  boundary: FieldBoundary;
  fieldName: string;
  crop: string;
  ownerName: string;
  ownerEmail: string;
  onBoundaryChange: (boundary: FieldBoundary) => void;
}) {
  function updatePoint(index: number, nextPoint: [number, number]) {
    onBoundaryChange(
      boundary.map((point, pointIndex) => (pointIndex === index ? nextPoint : point)),
    );
  }

  return (
    <div className="h-[320px] w-full sm:h-[380px]">
      <MapContainer
        center={[country.lat, country.lon]}
        zoom={7}
        maxBounds={country.bounds}
        maxBoundsViscosity={0.7}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <CountryViewport country={country} />
        <DrawBoundaryOnMap
          onAddPoint={(point) => onBoundaryChange([...boundary, point])}
        />
        <SatelliteTileLayer />
        {boundary.length >= MIN_FIELD_BOUNDARY_POINTS && (
          <Polygon
            positions={boundary}
            pathOptions={{
              color: "#007aff",
              fillColor: "#007aff",
              fillOpacity: 0.18,
              weight: 3,
            }}
          >
            <Tooltip sticky direction="top" opacity={0.95}>
              <div className="min-w-44">
                <div className="font-medium">{fieldName.trim() || "New field boundary"}</div>
                <div className="mt-1 text-xs">Owner: {ownerName}</div>
                <div className="text-xs text-muted-foreground">{ownerEmail}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatBoundaryArea(boundary)}
                  {crop.trim() ? ` · ${crop.trim()}` : ""}
                </div>
              </div>
            </Tooltip>
          </Polygon>
        )}
        {boundary.length >= 2 && (
          <Polyline
            positions={boundary}
            pathOptions={{ color: "#007aff", dashArray: "6 6", weight: 3 }}
          />
        )}
        {boundary.map((point, index) => (
          <Marker
            key={`${index}-${point[0]}-${point[1]}`}
            position={point}
            icon={penDrawIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const markerTarget = event.target as L.Marker;
                const next = markerTarget.getLatLng();
                updatePoint(index, [next.lat, next.lng]);
              },
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function CountryViewport({ country }: { country: CountryLocation }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(country.bounds, { animate: true, padding: [28, 28] });
    map.setMaxBounds(country.bounds);
    setTimeout(() => map.invalidateSize(), 100);
  }, [country, map]);

  return null;
}

function DrawBoundaryOnMap({ onAddPoint }: { onAddPoint: (point: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}
