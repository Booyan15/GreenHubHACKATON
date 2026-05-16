import { FileText, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getFloodWorkspace, highRiskZones, isGovernmentWorkspace, peopleTotal, riskBadgeClass } from "@/lib/government/flood";
import { readLatestSatelliteAnalysis } from "@/lib/satellite-analysis";

export default function Report() {
  const { user } = useAuth();
  return isGovernmentWorkspace(user?.email) ? (
    <GovernmentReport email={user?.email} />
  ) : (
    <AgronomyReport />
  );
}

function AgronomyReport() {
  const latestAnalysis = readLatestSatelliteAnalysis();
  const ndvi = latestAnalysis?.stats?.averageNdvi;
  const water = latestAnalysis?.stats?.waterPercentage;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Executive report</h1>
            <p className="text-muted-foreground">Selected-area satellite summary · {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <Button className="rounded-full" onClick={() => window.print()}>
          <Download className="mr-1.5 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant print:shadow-none">
        <h2 className="text-2xl font-semibold tracking-tight">Situation overview</h2>
        {latestAnalysis ? (
          <>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The latest report is based on <span className="font-semibold text-foreground">{layerName(latestAnalysis.layer)}</span>{" "}
              for <span className="font-semibold text-foreground">{latestAnalysis.fieldName ?? "the selected field"}</span>.
              Acquisition date: <span className="font-semibold text-foreground">{formatDate(latestAnalysis.acquisitionDate)}</span>.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ReportStat label="Average NDVI" value={typeof ndvi === "number" ? ndvi.toFixed(2) : "Not calculated"} />
              <ReportStat label="Water detected" value={typeof water === "number" ? `${water.toFixed(1)}%` : "Not calculated"} />
              <ReportStat label="Source" value="Sentinel-2 L2A" />
            </div>

            <h3 className="mt-8 text-lg font-semibold tracking-tight">Interpretation</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{latestAnalysis.interpretation}</p>

            <h3 className="mt-8 text-lg font-semibold tracking-tight">Data quality notes</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(latestAnalysis.warnings ?? ["Clouds, shadows, snow, haze, or no-data pixels may affect optical satellite analysis."]).map((warning) => (
                <li key={warning} className="rounded-xl border border-border p-3">{warning}</li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-5">
            <p className="text-muted-foreground">
              No report is generated because no real Copernicus analysis has been run yet. The previous hardcoded report values and recommendations have been removed.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/dashboard/map">Open Live map</Link>
            </Button>
          </div>
        )}
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
