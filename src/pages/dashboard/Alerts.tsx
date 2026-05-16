import { useMemo } from "react";
import { BellRing, CloudRain, Leaf, Users, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import SmartAlerts from "@/components/dashboard/SmartAlerts";
import { getFloodWorkspace, isGovernmentWorkspace, riskBadgeClass } from "@/lib/government/flood";
import { readLatestSatelliteAnalysis } from "@/lib/satellite-analysis";

export default function Alerts() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentAlerts email={user?.email} />
  ) : (
    <AgronomyAlerts />
  );
}

function AgronomyAlerts() {
  const latestAnalysis = useMemo(() => readLatestSatelliteAnalysis(), []);
  const ndvi = latestAnalysis?.stats?.averageNdvi;
  const satelliteAlert =
    typeof ndvi === "number" && ndvi < 0.35
      ? {
          level: ndvi < 0.15 ? "high" : "medium",
          title: "Vegetation stress detected",
          body: `Average NDVI for ${latestAnalysis?.fieldName ?? "the selected field"} is ${ndvi.toFixed(2)} from ${formatDate(latestAnalysis?.acquisitionDate ?? "")}. Inspect the red/orange areas on the Live map before taking action.`,
        }
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <BellRing className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Real satellite alerts and smart mobile dispatch — powered by Sentinel-2.
          </p>
        </div>
      </div>

      {/* Smart Alerts dispatch panel */}
      <SmartAlerts />

      {/* Live satellite alert (NDVI-driven) */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Live satellite alerts
        </p>
        {satelliteAlert ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(satelliteAlert.level)}`}
                  >
                    {satelliteAlert.level}
                  </span>
                  <p className="font-medium">{satelliteAlert.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{satelliteAlert.body}</p>
              </div>
              <Leaf className="h-4 w-4 shrink-0 text-warning" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-lg font-semibold tracking-tight">No active satellite alerts</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Run NDVI analysis on a selected field to generate real Copernicus alerts here.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/dashboard/map">Open Live Map</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function GovernmentAlerts({ email }: { email?: string | null }) {
  const workspace = getFloodWorkspace(email);
  const alerts = workspace.zones.map((zone) => ({
    id: zone.id,
    level: zone.risk,
    title: `${zone.cityPart}: flood exposure rising`,
    body: `${zone.expectedRainMm} mm expected rain, ${zone.floodDepthM.toFixed(2)} m estimated flood depth and ${zone.affectedPeople.toLocaleString()} residents in the affected zone.`,
    action: zone.response,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <BellRing className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Flood alerts</h1>
          <p className="text-muted-foreground">{workspace.city} · {workspace.nearestWaterway}</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(a.level)}`}>
                    {a.level}
                  </span>
                  <p className="font-medium">{a.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
                <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                    <CloudRain className="h-3.5 w-3.5" /> rainfall threshold
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                    <Waves className="h-3.5 w-3.5" /> water level watch
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                    <Users className="h-3.5 w-3.5" /> resident impact
                  </span>
                </div>
                <p className="mt-3 text-sm">{a.action}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">now</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
