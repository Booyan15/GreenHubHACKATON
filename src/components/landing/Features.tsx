import { Satellite, Map, BellRing } from "lucide-react";

const features = [
  { icon: Satellite, title: "Sentinel-2 imagery", body: "10m-resolution NDVI, NDWI and thermal indices refreshed continuously." },
  { icon: Map, title: "Live map", body: "Risk overlays for every monitored zone across the Balkans." },
  { icon: BellRing, title: "Multichannel alerts", body: "WhatsApp, SMS and email — translated into Macedonian and Albanian." },
];

export default function Features() {
  return (
    <section id="product" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-4 pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Platform</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            One pane of glass for satellite intelligence.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for citizens, farms and institutions across North Macedonia and the Balkans.
          </p>
        </div>

        <div className="mt-6 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
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