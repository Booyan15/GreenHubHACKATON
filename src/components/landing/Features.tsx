import { Satellite, CloudSun, Brain, ShieldAlert, Map, BellRing } from "lucide-react";

const features = [
  { icon: Satellite, title: "Sentinel-2 imagery", body: "10m-resolution NDVI, NDWI and thermal indices refreshed continuously." },
  { icon: CloudSun, title: "Hyperlocal forecasts", body: "14-day precipitation, frost & heat outlooks calibrated to your land." },
  { icon: Brain, title: "Agronomy AI", body: "Personalized irrigation, disease and harvest decisions in plain language." },
  { icon: ShieldAlert, title: "Crisis layer", body: "Wildfire, flood and drought signals routed to authorities in real time." },
  { icon: Map, title: "Live map", body: "Risk overlays for every monitored zone across the Balkans." },
  { icon: BellRing, title: "Multichannel alerts", body: "WhatsApp, SMS and email — translated into Macedonian and Albanian." },
];

export default function Features() {
  return (
    <section id="product" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Platform</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            One pane of glass for satellite intelligence.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for citizens, farms and institutions across North Macedonia and the Balkans.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-3xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}