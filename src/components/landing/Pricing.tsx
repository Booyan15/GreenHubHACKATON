import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const features = [
  "Unlimited mapped fields and zones",
  "Instant access to live NDVI crop health insights",
  "High-precision soil moisture & flood risk detection",
  "Automated anomaly alerts sent directly to your phone",
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-6 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Pricing</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Simple pricing. Built for every farmer.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No complicated tiers or hidden fees. Get full access to all advanced satellite tools for one predictable monthly subscription.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl dark:border-border dark:bg-card md:p-10">
          <div className="mt-2">
            <span className="text-6xl font-bold tracking-tight text-gray-900 dark:text-foreground">€19</span>
            <span className="ml-2 text-xl font-medium text-gray-500 dark:text-muted-foreground">/ month</span>
          </div>
          <p className="mt-2 text-sm text-gray-400 dark:text-muted-foreground">
            Your first 14 days are completely free
          </p>

          <ul className="mt-8 space-y-3 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-gray-700 dark:text-foreground">
                <span className="mt-0.5 shrink-0 font-bold text-blue-600 dark:text-primary">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}