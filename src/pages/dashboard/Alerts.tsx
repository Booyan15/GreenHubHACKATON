import { useMemo } from "react";
import { BellRing, CloudRain, Users, Waves } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { alertsFor, riskBg } from "@/lib/mock/data";
import { getFloodWorkspace, isGovernmentWorkspace, riskBadgeClass } from "@/lib/government/flood";

export default function Alerts() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentAlerts email={user?.email} />
  ) : (
    <AgronomyAlerts seed={user?.id ?? "demo"} />
  );
}

function AgronomyAlerts({ seed }: { seed: string }) {
  const alerts = useMemo(() => alertsFor(seed), [seed]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <BellRing className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Real-time risk notifications across your zones.</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBg[a.level]}`}>
                    {a.level}
                  </span>
                  <p className="font-medium">{a.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
