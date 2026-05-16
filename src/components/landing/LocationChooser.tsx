import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/lib/countries";

const STORAGE_KEY = "satelles.location";

export type SavedLocation = {
  name: string;
  region?: string;
  lat: number;
  lon: number;
};

export default function LocationChooser({
  onPick,
}: {
  onPick?: (loc: SavedLocation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, []);

  function save(loc: SavedLocation, id: string) {
    setPicked(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    onPick?.(loc);
    setTimeout(() => setOpen(false), 450);
  }

  function detect() {
    if (!("geolocation" in navigator)) return;
    setBusy("detect");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        save(
          {
            name: "Current location",
            region: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          },
          "detect"
        );
        setBusy(null);
      },
      () => setBusy(null),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  const filtered = COUNTRIES.filter((p) =>
    `${p.name} ${p.region}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-2xl"
            onClick={() => setOpen(false)}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-elegant backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />

            <div className="px-8 pb-2 pt-9 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 18 }}
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-foreground text-background shadow-glow"
              >
                <MapPin className="h-6 w-6" />
              </motion.div>
              <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-[28px]">
                Where should we look?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[15px] leading-snug text-muted-foreground">
                SATELLES tunes satellite, weather and risk data to your place.
              </p>
            </div>

            <div className="px-6 pt-5 sm:px-8">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a country…"
                  className="h-11 rounded-2xl border-border bg-background/60 pl-9 text-[15px]"
                />
              </div>
            </div>

            <div className="max-h-[280px] overflow-y-auto px-3 pb-2 pt-3 sm:px-5">
              <ul className="space-y-1">
                {filtered.map((p) => {
                  const isPicked = picked === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() =>
                          save(
                            { name: p.name, region: p.region, lat: p.lat, lon: p.lon },
                            p.id
                          )
                        }
                        className="group flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground/80 transition-colors group-hover:bg-foreground group-hover:text-background">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-[15px] font-medium leading-tight">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.region}
                            </div>
                          </div>
                        </div>
                        {isPicked ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            Select
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No matches. Try “North Macedonia” or “Albania”.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/70 bg-background/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="rounded-full text-muted-foreground"
              >
                Skip for now
              </Button>
              <Button
                onClick={detect}
                size="sm"
                className="h-10 rounded-full px-5"
                disabled={busy === "detect"}
              >
                {busy === "detect" ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Detecting…
                  </>
                ) : (
                  <>
                    <MapPin className="mr-1.5 h-4 w-4" /> Use my location
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
