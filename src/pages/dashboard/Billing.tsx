import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Basic",
    price: "Free",
    desc: "For citizens & small holdings.",
    features: ["1 monitored zone", "Daily satellite refresh", "Basic weather alerts"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Agriculture Pro",
    price: "€29",
    suffix: "/zone/mo",
    desc: "For farmers & cooperatives.",
    features: [
      "Unlimited zones",
      "Hourly NDVI & soil",
      "AI Agronomy Advisor",
      "Frost · drought · fire alerts",
      "WhatsApp & SMS notifications",
    ],
    cta: "Upgrade",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For agribusiness, utilities, government.",
    features: ["SLA & dedicated support", "API & data exports", "On-prem option", "Multi-org dashboards"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function Billing() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Billing & plan</h1>
        <p className="mt-1 text-muted-foreground">Pick the plan that matches your operation.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-3xl border p-6 shadow-soft ${
              p.highlight ? "border-primary bg-card shadow-glow" : "border-border bg-card"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
              {p.suffix && <span className="text-sm text-muted-foreground">{p.suffix}</span>}
            </div>
            <Button className="mt-6 h-11 w-full rounded-full" variant={p.highlight ? "default" : "outline"}>
              {p.cta}
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
  );
}