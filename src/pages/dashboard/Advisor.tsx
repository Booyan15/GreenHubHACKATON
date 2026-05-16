import { useMemo } from "react";
import { Brain, Droplets, Megaphone, RadioTower, Route, ShieldCheck, TrendingUp, Waves } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { farmHealth } from "@/lib/mock/data";
import {
  getFloodWorkspace,
  highRiskZones,
  isGovernmentWorkspace,
  peopleTotal,
  riskBadgeClass,
} from "@/lib/government/flood";

export default function Advisor() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentFloodAdvisor email={user?.email} />
  ) : (
    <AgronomyAdvisor seed={user?.id ?? "demo"} />
  );
}

function AgronomyAdvisor({ seed }: { seed: string }) {
  const { ndvi, soil, risk } = useMemo(() => farmHealth(seed), [seed]);

  const recs = [
    {
      icon: Droplets,
      title: "Irrigation plan — next 7 days",
      body: `Soil at ${soil.toFixed(0)}% moisture. Schedule 18mm across 3 cycles, focus rows 4–9.`,
      roi: "+€420 saved on water",
    },
    {
      icon: ShieldCheck,
      title: "Disease prevention",
      body: "High humidity window in 48h — apply preventive fungicide on most-vulnerable parcels.",
      roi: "Avoids ~12% yield loss",
    },
    {
      icon: TrendingUp,
      title: "Harvest timing",
      body: `NDVI trending ${ndvi > 0.6 ? "stable" : "downward"}. Optimal harvest window in 9–14 days.`,
      roi: "+€1,150 quality premium",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Brain className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agronomy AI Advisor</h1>
          <p className="text-muted-foreground">
            Personalized recommendations from satellite + weather + your farm history.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Composite risk score</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight capitalize">{risk}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Projected ROI uplift</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-success">+€1,570</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {recs.map((r) => (
          <div key={r.title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <r.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{r.title}</p>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">{r.roi}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GovernmentFloodAdvisor({ email }: { email?: string | null }) {
  const workspace = getFloodWorkspace(email);
  const urgent = highRiskZones(workspace.zones);
  const topZone = urgent[0] ?? workspace.zones[0];
  const recs = [
    {
      icon: Waves,
      title: `${topZone.name}: flood containment`,
      body: topZone.response,
      tag: `${topZone.probability}% probability`,
    },
    {
      icon: Route,
      title: "Evacuation routing",
      body: `Keep primary routes clear around ${urgent.map((zone) => zone.cityPart).join(", ")} and reserve buses for ${peopleTotal(urgent).toLocaleString()} exposed residents.`,
      tag: "Priority 1",
    },
    {
      icon: Megaphone,
      title: "Resident announcement",
      body: topZone.announcement,
      tag: `${topZone.affectedPeople.toLocaleString()} recipients`,
    },
    {
      icon: RadioTower,
      title: "Source confidence",
      body: "Cross-check SAR water extent with optical land-cover exposure, rain forecast, local gauges and citizen reports before escalation.",
      tag: "Multi-source",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Brain className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Flood AI Advisor</h1>
          <p className="text-muted-foreground">
            {workspace.authority} · {workspace.nearestWaterway}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Command priority</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{urgent.length} zones</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">People in affected zones</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{peopleTotal(urgent).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Barrier teams</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">6 ready</p>
        </div>
      </div>

      <div className="space-y-4">
        {recs.map((r) => (
          <div key={r.title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <r.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{r.title}</p>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{r.tag}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold tracking-tight">Escalation matrix</h2>
        <div className="mt-4 space-y-3">
          {workspace.zones.map((zone) => (
            <div key={zone.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
              <div>
                <p className="font-medium">{zone.name}</p>
                <p className="text-sm text-muted-foreground">{zone.affectedPeople.toLocaleString()} residents · {zone.expectedRainMm} mm rain</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(zone.risk)}`}>
                {zone.risk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
