import { Flame, Waves, TreePine, Radio, ShieldCheck, Satellite } from "lucide-react";

const parks = [
  {
    name: "Mavrovo National Park",
    area: "73,088 ha",
    risk: "Very high wildfire · spring floods",
    note: "Largest park · Radika river basin · forest-dominated terrain.",
  },
  {
    name: "Galičica National Park",
    area: "22,750 ha",
    risk: "High wildfire · karst flash-flood",
    note: "Between Lake Ohrid & Lake Prespa · UNESCO buffer zone.",
  },
  {
    name: "Pelister National Park",
    area: "17,150 ha",
    risk: "High wildfire · alpine snowmelt floods",
    note: "Oldest park (1948) · endemic five-needle pine forests.",
  },
];

const offerings = [
  {
    icon: Flame,
    title: "Wildfire early-warning",
    body:
      "Sentinel-2 thermal anomalies + drought stress index detect ignitions within 15 minutes and route alerts to ranger units, fire brigades and Crisis Management Center.",
    tone: "text-destructive bg-destructive/10",
  },
  {
    icon: Waves,
    title: "Flood & flash-flood prediction",
    body:
      "Soil-saturation models combined with 14-day Open-Meteo precipitation forecasts predict river surges 48–72 hours before they hit downstream villages.",
    tone: "text-primary bg-primary/10",
  },
  {
    icon: TreePine,
    title: "Forest health monitoring",
    body:
      "Continuous NDVI tracking detects bark-beetle outbreaks, illegal logging and post-fire regeneration across every hectare of protected territory.",
    tone: "text-success bg-success/10",
  },
  {
    icon: Radio,
    title: "Ranger field tools",
    body:
      "Mobile alerts in Macedonian & Albanian for park rangers, plus dispatch coordination with army, police and emergency services.",
    tone: "text-warning bg-warning/10",
  },
];

export default function Government() {
  return (
    <section id="government" className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Government & national infrastructure
            </div>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Protecting Macedonia's national parks from space.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              SATELLES gives the Ministry of Environment, park authorities and Crisis Management
              Center continuous satellite intelligence over <span className="font-medium text-foreground">112,988 hectares</span> of
              protected territory — turning every ranger and fire brigade into a connected, data-driven first responder.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <Stat value="3" label="National parks" />
              <Stat value="112k+" label="Protected hectares" />
              <Stat value="<15min" label="Fire detection" />
            </div>

            <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
              <Satellite className="h-4 w-4" />
              Sentinel-2 · Sentinel-3 · MODIS · Galileo · Open-Meteo
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {offerings.map((o) => (
                <div
                  key={o.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${o.tone}`}>
                    <o.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">{o.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="border-b border-border bg-background/60 px-6 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Live coverage · National parks
                </p>
              </div>
              <ul className="divide-y divide-border">
                {parks.map((p) => (
                  <li key={p.name} className="flex items-start justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TreePine className="h-4 w-4 text-success" />
                        <p className="font-medium">{p.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums">{p.area}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-warning">
                        {p.risk}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}