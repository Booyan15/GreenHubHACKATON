import { useMemo } from "react";
import { Brain, Droplets, Megaphone, RadioTower, Route, Satellite, ShieldCheck, TrendingUp, Waves, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  getFloodWorkspace,
  highRiskZones,
  isGovernmentWorkspace,
  peopleTotal,
  riskBadgeClass,
} from "@/lib/government/flood";
import { readLatestSatelliteAnalysis } from "@/lib/satellite-analysis";

export default function Advisor() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentFloodAdvisor email={user?.email} />
  ) : (
    <AgronomyAdvisor />
  );
}

function AgronomyAdvisor() {
  const latestAnalysis = useMemo(() => readLatestSatelliteAnalysis(), []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Brain className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agronomy AI Advisor</h1>
          <p className="text-muted-foreground">
            Recommendations appear only after a real selected-area satellite analysis is available.
          </p>
        </div>
      </div>

      {!latestAnalysis ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div>
            <p className="text-sm text-muted-foreground">No real analysis loaded</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">Run Copernicus analysis first</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              The previous generated irrigation, disease, harvest, and ROI recommendations have been removed. Select a field on the Live map and analyze NDVI, water, or vegetation risk to create advice from real data.
            </p>
          </div>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/dashboard/map">Open Live map</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{latestAnalysis.fieldName ?? "Selected field"}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{layerName(latestAnalysis.layer)}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{formatDate(latestAnalysis.acquisitionDate)}</p>
                <p>{latestAnalysis.source}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <RealAdviceCard
              icon={Satellite}
              title="Satellite interpretation"
              body={latestAnalysis.interpretation}
            />
            {typeof latestAnalysis.stats?.averageNdvi === "number" && (
              <RealAdviceCard
                icon={TrendingUp}
                title="NDVI-based field check"
                body={`Average NDVI is ${latestAnalysis.stats.averageNdvi.toFixed(2)}. Use this value to prioritize field scouting where the map shows darker or red/brown stress colors.`}
              />
            )}
            {typeof latestAnalysis.stats?.waterPercentage === "number" && (
              <RealAdviceCard
                icon={Droplets}
                title="Water detection field check"
                body={`${latestAnalysis.stats.waterPercentage.toFixed(1)}% of valid selected-area pixels were classified as water by NDWI. Inspect blue areas before treating them as standing water.`}
              />
            )}
            <RealAdviceCard
              icon={ShieldCheck}
              title="Accuracy note"
              body="Clouds, shadows, snow, haze, and recent field operations can affect optical Sentinel-2 results. Use the acquisition date and map colors before making operational decisions."
            />
          </div>
        </>
      )}
    </div>
  );
}

function RealAdviceCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
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
