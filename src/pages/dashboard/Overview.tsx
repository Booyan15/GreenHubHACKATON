import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CloudRain, Droplets, Leaf, RadioTower, ShieldAlert, Users, Waves } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { alertsFor, farmHealth, riskBg } from "@/lib/mock/data";
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

export default function Overview() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentOverview email={user?.email} />
  ) : (
    <AgronomyOverview seed={user?.id ?? "demo"} />
  );
}

function AgronomyOverview({ seed }: { seed: string }) {
  const { ndvi, soil, risk, series } = useMemo(() => farmHealth(seed), [seed]);
  const alerts = useMemo(() => alertsFor(seed), [seed]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Real-time intelligence across your monitored zones.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="NDVI vegetation"
          value={ndvi.toFixed(2)}
          hint="Sentinel-2 · 7-day avg"
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
          label="Soil moisture"
          value={`${soil.toFixed(0)}%`}
          hint="Volumetric · root zone"
          icon={<Droplets className="h-4 w-4 text-primary" />}
          info={
            <p>
              Soil moisture estimates how much water is available around the crop roots. Low values can mean irrigation is needed; very high values can mean waterlogging or disease pressure.
            </p>
          }
        />
        <StatCard
          label="Active risk"
          value={<span className="capitalize">{risk}</span>}
          hint="Composite index"
          icon={<ShieldAlert className="h-4 w-4 text-warning" />}
          info={
            <p>
              Active risk combines vegetation health, recent rainfall, soil moisture, and weather signals into one warning level for the monitored fields.
            </p>
          }
        />
        <StatCard
          label="Open alerts"
          value={alerts.length}
          hint="Across all zones"
          icon={<Activity className="h-4 w-4 text-destructive" />}
          info={
            <p>
              Open alerts are current items that may need attention, such as crop stress, unusual moisture, heavy rain, heat, or other changes detected in your fields.
            </p>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Vegetation health (NDVI)</h2>
              <p className="text-sm text-muted-foreground">Last 30 days · all zones</p>
            </div>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="ndviFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="ndvi" stroke="hsl(var(--success))" fill="url(#ndviFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold tracking-tight">Rainfall (mm)</h2>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="rain" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Smart advisory feed</h2>
          <span className="text-xs text-muted-foreground">Generated by SATELLES Agronomy AI</span>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-4 py-4">
              <span className={`mt-0.5 inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBg[a.level]}`}>
                {a.level}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GovernmentOverview({ email }: { email?: string | null }) {
  const workspace = getFloodWorkspace(email);
  const weather = useFloodWeather(workspace);
  const [selectedZoneId, setSelectedZoneId] = useState(workspace.zones[0]?.id);
  const selectedZone = workspace.zones.find((zone) => zone.id === selectedZoneId) ?? workspace.zones[0];
  const exposed = peopleTotal(workspace.zones);
  const urgentZones = highRiskZones(workspace.zones);
  const rain24h = weather.rain24hMm || workspace.expectedRain24hMm;
  const rain72h = weather.rain72hMm || workspace.expectedRain72hMm;

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
            Sentinel-1 · Sentinel-2 · CEMS · {weather.source === "open-meteo" ? "Open-Meteo live" : "demo rain fallback"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Expected rain"
          value={`${rain24h} mm`}
          hint={`72h total ${rain72h} mm`}
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
