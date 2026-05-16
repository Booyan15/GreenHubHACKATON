import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle, MapPin } from "lucide-react";
import type { SavedLocation } from "./LocationChooser";

const Globe = lazy(() => import("./Globe"));

export default function Hero({ selectedLocation }: { selectedLocation: SavedLocation }) {
  return (
    <section className="relative isolate overflow-hidden bg-hero pt-24">
      {/* Subtle mesh accents */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-2 lg:gap-8 lg:pt-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live satellite intelligence · Balkans
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Satellite intelligence
            <br />
            for <span className="text-gradient">real decisions.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Protect farms, cities, water and people with live space data.
            SATELLES turns complex satellite, weather and risk signals into
            simple, profitable decisions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Button size="lg" className="h-12 rounded-full px-6 text-base shadow-glow">
              Start free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-border bg-card px-6 text-base"
            >
              <PlayCircle className="mr-1.5 h-4 w-4" />
              Book a demo
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-4 text-base text-foreground"
            >
              Explore live risks
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Protection begins where you stand
            </div>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <div>Used by Macedonian farms & institutions</div>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <div>Powered by Sentinel · Galileo · Open-Meteo</div>
          </motion.div>
        </div>

        {/* Globe */}
        <div className="relative aspect-square w-full max-w-[640px] justify-self-center">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative h-full w-full">
            <Suspense fallback={<div className="h-full w-full animate-pulse rounded-full bg-secondary" />}>
              <Globe location={selectedLocation} />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
