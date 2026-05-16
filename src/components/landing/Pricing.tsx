import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Basic",
    price: "Free",
    desc: "For citizens & curious minds.",
    features: ["1 monitored zone", "Daily satellite refresh", "Air & weather alerts"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Agriculture Pro",
    price: "€29",
    suffix: "/zone/mo",
    desc: "For farmers & agribusiness.",
    features: ["Unlimited zones", "Hourly NDVI & soil", "AI Agronomy Advisor", "WhatsApp & SMS alerts"],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For utilities, insurers, government.",
    features: ["SLA & dedicated support", "API & data exports", "On-prem option", "Multi-org dashboards"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Pricing</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Simple plans. National impact.</h2>
          <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you need more zones, AI advice or enterprise support.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl border p-8 shadow-soft ${
                p.highlight ? "border-primary bg-card shadow-glow" : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
                {p.suffix && <span className="text-sm text-muted-foreground">{p.suffix}</span>}
              </div>
              <Button asChild className="mt-6 h-11 w-full rounded-full" variant={p.highlight ? "default" : "outline"}>
                <Link to="/auth">{p.cta}</Link>
              </Button>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}