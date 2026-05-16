import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudRain, Droplets, Leaf, RadioTower, Satellite, ShieldAlert, Users, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "@/components/dashboard/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import FloodRiskMap from "@/components/dashboard/FloodRiskMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  getFloodWorkspace,
  highRiskZones,
  isGovernmentWorkspace,
  peopleTotal,
  riskBadgeClass,
  type FloodZone,
} from "@/lib/government/flood";
import { useFloodWeather } from "@/hooks/use-flood-weather";
import { readLatestSatelliteAnalysis } from "@/lib/satellite-analysis";

export default function Overview() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentOverview email={user?.email} />
  ) : (
    <AgronomyOverview />
  );
}

function AgronomyOverview() {
  const latestAnalysis = useMemo(() => readLatestSatelliteAnalysis(), []);
  const ndvi = latestAnalysis?.stats?.averageNdvi;
  const water = latestAnalysis?.stats?.waterPercentage;
  const hasRealAnalysis = Boolean(latestAnalysis);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Real satellite intelligence appears here after you analyze a selected field on the Live map.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="NDVI vegetation"
          value={typeof ndvi === "number" ? ndvi.toFixed(2) : "No data"}
          hint={typeof ndvi === "number" ? "Latest selected field" : "Run NDVI on Live map"}
          icon={<Leaf className="h-4 w-4 text-success" />}
          info={
            <>
              <p>
                NDVI is a plant-health score from satellite images. It compares how much red and near-infrared light your crop reflects.
              </p>
              <p>
                Higher values usually mean denser, healthier green growth. A falling value can point to drought stress, disease, nutrient problems, or harvest-ready vegetation.
              </p>
            </>
          }
        />
        <StatCard
          label="Detected water"
          value={typeof water === "number" ? `${water.toFixed(1)}%` : "No data"}
          hint={typeof water === "number" ? "NDWI mask" : "Run Water Detection"}
          icon={<Droplets className="h-4 w-4 text-primary" />}
          info={
            <p>
              Water detection uses NDWI from Sentinel-2 green and near-infrared bands. Blue pixels can indicate surface water, wet soil, or irrigation water.
            </p>
          }
        />
        <StatCard
          label="Vegetation risk"
          value={latestAnalysis?.layer === "risk" || typeof ndvi === "number" ? riskFromNdvi(ndvi) : "No data"}
          hint="Derived only from real NDVI"
          icon={<ShieldAlert className="h-4 w-4 text-warning" />}
          info={
            <p>
              Vegetation risk is derived from NDVI. Very low NDVI means poor vegetation or stress; higher NDVI usually means healthier crop growth.
            </p>
          }
        />
        <StatCard
          label="Data status"
          value={hasRealAnalysis ? "Real" : "Waiting"}
          hint={hasRealAnalysis ? latestAnalysis?.source : "No fake values shown"}
          icon={<Satellite className="h-4 w-4 text-primary" />}
          info={
            <p>
              This dashboard does not show generated environmental numbers. Select a polygon on the map and run an analysis to populate these cards with Copernicus data.
            </p>
          }
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Latest satellite analysis</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {latestAnalysis
                ? `${latestAnalysis.fieldName ?? "Selected field"} · Acquisition ${formatDate(latestAnalysis.acquisitionDate)}`
                : "No selected-area Copernicus analysis has been run in this browser yet."}
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/dashboard/map">Open Live map</Link>
          </Button>
        </div>

        {latestAnalysis ? (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <MiniStat label="Layer" value={layerName(latestAnalysis.layer)} />
            <MiniStat label="Average NDVI" value={typeof ndvi === "number" ? ndvi.toFixed(2) : "Not calculated"} />
            <MiniStat label="Water detected" value={typeof water === "number" ? `${water.toFixed(1)}%` : "Not calculated"} />
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
            The previous mock NDVI, rainfall, soil moisture, and generated alerts have been removed. This page waits for real selected-area results from the Live map.
          </div>
        )}
      </div>
    </div>
  );
}

function riskFromNdvi(ndvi: number | undefined) {
  if (typeof ndvi !== "number") return "No data";
  if (ndvi < 0.15) return "High";
  if (ndvi < 0.35) return "Elevated";
  if (ndvi < 0.55) return "Moderate";
  return "Low";
}

function layerName(layer: string) {
  if (layer === "rgb") return "RGB View";
  if (layer === "water") return "Water Detection";
  if (layer === "risk") return "Vegetation Risk";
  return "NDVI";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatMm(value: number | null) {
  return typeof value === "number" ? `${value} mm` : "No data";
}

function GovernmentOverview({ email }: { email?: string | null }) {
  const workspace = getFloodWorkspace(email);
  const weather = useFloodWeather(workspace);
  const [selectedZoneId, setSelectedZoneId] = useState(workspace.zones[0]?.id);
  const selectedZone = workspace.zones.find((zone) => zone.id === selectedZoneId) ?? workspace.zones[0];
  const exposed = peopleTotal(workspace.zones);
  const urgentZones = highRiskZones(workspace.zones);
  const rain24h = weather.rain24hMm;
  const rain72h = weather.rain72hMm;

  function selectZone(zone: FloodZone) {
    setSelectedZoneId(zone.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Flood command overview</h1>
          <p className="mt-1 text-muted-foreground">
            {workspace.authority} · {workspace.nearestWaterway}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft">
          <p className="font-medium">Source fusion</p>
          <p className="text-xs text-muted-foreground">
            Sentinel-1 · Sentinel-2 · CEMS · {weather.source === "open-meteo" ? "Open-Meteo live" : "Weather API unavailable"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Expected rain"
          value={formatMm(rain24h)}
          hint={rain72h == null ? "Weather API is not configured yet." : `72h total ${rain72h} mm`}
          icon={<CloudRain className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label={workspace.waterMetricLabel}
          value={`${workspace.waterLevelM.toFixed(2)} m`}
          hint={`Warning ${workspace.warningLevelM.toFixed(2)} m`}
          icon={<Waves className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="Residents exposed"
          value={exposed.toLocaleString()}
          hint={`${urgentZones.length} high-priority zones`}
          icon={<Users className="h-4 w-4 text-warning" />}
        />
        <StatCard
          label="Announcement reach"
          value="91%"
          hint="SMS · push · siren relay"
          icon={<RadioTower className="h-4 w-4 text-destructive" />}
        />
      </div>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          <TabsTrigger value="map">Risk map</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation zones</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FloodRiskMap workspace={workspace} selectedZoneId={selectedZone.id} onSelectZone={selectZone} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{selectedZone.cityPart}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{selectedZone.name}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(selectedZone.risk)}`}>
                  {selectedZone.risk}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Flood probability" value={`${selectedZone.probability}%`} />
                <MiniStat label="Flood depth" value={`${selectedZone.floodDepthM.toFixed(2)} m`} />
                <MiniStat label="Expected rain" value={`${selectedZone.expectedRainMm} mm`} />
                <MiniStat label="People affected" value={selectedZone.affectedPeople.toLocaleString()} />
              </div>

              <div className="mt-5 rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Immediate action</p>
                <p className="mt-2 text-sm leading-relaxed">{selectedZone.response}</p>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium">Vulnerable sites</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {selectedZone.vulnerableSites.map((site) => (
                    <li key={site} className="rounded-lg bg-muted px-3 py-2">
                      {site}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
              <h2 className="text-lg font-semibold tracking-tight">Rain and water level forecast</h2>
              <p className="mt-1 text-sm text-muted-foreground">72-hour operational window · {weather.updatedAt}</p>
              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={workspace.rainfallSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis yAxisId="rain" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis yAxisId="river" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                      }}
                    />
                    <Line yAxisId="rain" type="monotone" dataKey="rain" stroke="hsl(var(--primary))" strokeWidth={2} name="Rain mm" />
                    <Line yAxisId="river" type="monotone" dataKey="river" stroke="hsl(var(--destructive))" strokeWidth={2} name="Water m" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg font-semibold tracking-tight">Data feeds</h2>
              <div className="mt-4 space-y-3">
                {workspace.sourceStatus.map((source) => (
                  <SourceRow key={source.name} name={source.name} signal={source.signal} status={source.status} />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evaluation">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_1fr] gap-3 border-b border-border bg-muted/50 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Zone</span>
              <span>Risk</span>
              <span>Rain</span>
              <span>People</span>
              <span>Primary response</span>
            </div>
            {workspace.zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setSelectedZoneId(zone.id)}
                className="grid w-full grid-cols-1 gap-2 border-b border-border px-5 py-4 text-left transition last:border-b-0 hover:bg-muted/50 sm:grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_1fr] sm:items-center sm:gap-3"
              >
                <span>
                  <span className="block font-medium">{zone.name}</span>
                  <span className="text-xs text-muted-foreground">{zone.nearestWaterway}</span>
                </span>
                <span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(zone.risk)}`}>
                    {zone.risk}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">{zone.expectedRainMm} mm</span>
                <span className="text-sm font-medium">{zone.affectedPeople.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">{zone.response}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button className="rounded-full">Export impact brief</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SourceRow({
  name,
  signal,
  status,
}: {
  name: string;
  signal: string;
  status: "live-ready" | "demo" | "partner";
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{signal}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {status}
        </span>
      </div>
    </div>
  );
}
