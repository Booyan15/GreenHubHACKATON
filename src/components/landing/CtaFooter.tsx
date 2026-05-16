import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CtaFooter() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-12 text-center shadow-elegant sm:p-16">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-70" />
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Protect what matters. From one farm to a whole nation.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Join farmers, agribusinesses and institutions already using SATELLES.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base shadow-glow">
              <Link to="/auth">Start free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">Talk to sales</Button>
          </div>
        </div>
      </div>
    </section>
  );
}