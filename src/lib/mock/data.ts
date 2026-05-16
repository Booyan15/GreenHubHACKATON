// Deterministic mock satellite & risk data engine for SATELLES.
// Same input -> same output, so dashboards feel real & stable.

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 100000) / 100000;
  };
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function ndviSeries(seed = "default", days = 30) {
  const rnd = hash(seed + "-ndvi");
  const out: { date: string; ndvi: number; soil: number; rain: number }[] = [];
  let ndvi = 0.55 + rnd() * 0.15;
  let soil = 28 + rnd() * 10;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    ndvi = Math.max(0.2, Math.min(0.92, ndvi + (rnd() - 0.5) * 0.04));
    soil = Math.max(8, Math.min(55, soil + (rnd() - 0.5) * 3));
    const rain = rnd() < 0.25 ? rnd() * 12 : 0;
    out.push({
      date: d.toISOString().slice(5, 10),
      ndvi: +ndvi.toFixed(3),
      soil: +soil.toFixed(1),
      rain: +rain.toFixed(1),
    });
  }
  return out;
}

export function farmHealth(seed = "default") {
  const series = ndviSeries(seed);
  const last = series[series.length - 1];
  const ndvi = last.ndvi;
  const soil = last.soil;
  let risk: RiskLevel = "low";
  if (soil < 14 || ndvi < 0.35) risk = "critical";
  else if (soil < 20 || ndvi < 0.45) risk = "high";
  else if (soil < 26 || ndvi < 0.55) risk = "medium";
  return { ndvi, soil, risk, series };
}

export function alertsFor(seed = "default") {
  const rnd = hash(seed + "-alerts");
  const all = [
    {
      id: "a1",
      level: "high" as RiskLevel,
      title: "Drought stress detected",
      body: "NDVI dropped 7% in the last 5 days near Kavadarci block 3.",
      time: "2h ago",
    },
    {
      id: "a2",
      level: "medium" as RiskLevel,
      title: "Frost risk overnight",
      body: "Forecast lows of -1°C between 03:00–06:00 in Strumica plain.",
      time: "5h ago",
    },
    {
      id: "a3",
      level: "low" as RiskLevel,
      title: "Optimal irrigation window",
      body: "Soil moisture recovering — irrigate 30% less for the next 48h.",
      time: "Yesterday",
    },
    {
      id: "a4",
      level: "critical" as RiskLevel,
      title: "Wildfire smoke plume nearby",
      body: "Sentinel-2 detected smoke 14 km NE of monitored zone.",
      time: "Yesterday",
    },
  ];
  return all.slice(0, 2 + Math.floor(rnd() * 3));
}

export const riskColor: Record<RiskLevel, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-warning",
  critical: "text-destructive",
};

export const riskBg: Record<RiskLevel, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-warning/15 text-warning",
  critical: "bg-destructive/10 text-destructive",
};