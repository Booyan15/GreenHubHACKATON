import { useMemo } from "react";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { farmHealth, alertsFor } from "@/lib/mock/data";
import { getFloodWorkspace, highRiskZones, isGovernmentWorkspace, peopleTotal, riskBadgeClass } from "@/lib/government/flood";

export default function Report() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentReport email={user?.email} />
  ) : (
    <AgronomyReport seed={user?.id ?? "demo"} />
  );
}

function AgronomyReport({ seed }: { seed: string }) {
  const { ndvi, soil, risk } = useMemo(() => farmHealth(seed), [seed]);
  const alerts = useMemo(() => alertsFor(seed), [seed]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Executive report</h1>
            <p className="text-muted-foreground">Crisis & operations summary · {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <Button className="rounded-full" onClick={() => window.print()}>
          <Download className="mr-1.5 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant print:shadow-none">
        <h2 className="text-2xl font-semibold tracking-tight">Situation overview</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Across monitored zones in North Macedonia, satellite signals report a composite{" "}
          <span className="font-semibold text-foreground capitalize">{risk}</span> risk. Mean NDVI is{" "}
          <span className="font-semibold text-foreground">{ndvi.toFixed(2)}</span>, with average root-zone
          soil moisture at <span className="font-semibold text-foreground">{soil.toFixed(0)}%</span>.
          Climate forecasts indicate continued exposure for the next 14 days.
        </p>

        <h3 className="mt-8 text-lg font-semibold tracking-tight">Recommended actions</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Activate water reserves in the Strumica plain within 48 hours.</li>
          <li>Notify Tikveš and Pelagonija cooperatives of frost-risk advisory.</li>
          <li>Pre-position EVN crews near critical wildfire-adjacent grid sections.</li>
          <li>Coordinate Crisis Management Center on aerial smoke plume monitoring.</li>
        </ol>

        <h3 className="mt-8 text-lg font-semibold tracking-tight">Active incidents ({alerts.length})</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{a.title}</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{a.level}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{a.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GovernmentReport({ email }: { email?: string | null }) {
  const workspace = getFloodWorkspace(email);
  const urgent = highRiskZones(workspace.zones);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Flood impact report</h1>
            <p className="text-muted-foreground">Civil protection summary · {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <Button className="rounded-full" onClick={() => window.print()}>
          <Download className="mr-1.5 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant print:shadow-none">
        <h2 className="text-2xl font-semibold tracking-tight">{workspace.city} situation overview</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {workspace.authority} is monitoring {workspace.zones.length} evaluation zones around{" "}
          {workspace.nearestWaterway}. Forecast rainfall is {workspace.expectedRain24hMm} mm in 24 hours and{" "}
          {workspace.expectedRain72hMm} mm in 72 hours. Current {workspace.waterMetricLabel.toLowerCase()} is{" "}
          {workspace.waterLevelM.toFixed(2)} m against a {workspace.warningLevelM.toFixed(2)} m warning threshold.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ReportStat label="Residents exposed" value={peopleTotal(workspace.zones).toLocaleString()} />
          <ReportStat label="Urgent zones" value={urgent.length.toString()} />
          <ReportStat label="Announcement reach" value="91%" />
        </div>

        <h3 className="mt-8 text-lg font-semibold tracking-tight">Evaluation zones</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {workspace.zones.map((zone) => (
            <li key={zone.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{zone.name}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(zone.risk)}`}>
                  {zone.risk}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {zone.affectedPeople.toLocaleString()} people affected · {zone.expectedRainMm} mm rain · {zone.response}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
