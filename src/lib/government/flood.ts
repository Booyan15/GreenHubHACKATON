export type FloodRiskLevel = "low" | "medium" | "high" | "critical";

export type FloodZone = {
  id: string;
  name: string;
  cityPart: string;
  risk: FloodRiskLevel;
  probability: number;
  expectedRainMm: number;
  floodDepthM: number;
  affectedPeople: number;
  vulnerableSites: string[];
  nearestWaterway: string;
  response: string;
  announcement: string;
  center: [number, number];
  polygon: [number, number][];
};

export type FloodWorkspace = {
  id: string;
  city: string;
  country: string;
  authority: string;
  nearestWaterway: string;
  waterMetricLabel: string;
  waterLevelM: number;
  warningLevelM: number;
  expectedRain24hMm: number;
  expectedRain72hMm: number;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  zones: FloodZone[];
  rainfallSeries: { time: string; rain: number; river: number }[];
  sourceStatus: {
    name: string;
    signal: string;
    status: "live-ready" | "demo" | "partner";
  }[];
};

const skopjeZones: FloodZone[] = [
  {
    id: "aerodrom-vardar",
    name: "Aerodrom riverfront",
    cityPart: "Aerodrom",
    risk: "critical",
    probability: 82,
    expectedRainMm: 48,
    floodDepthM: 0.9,
    affectedPeople: 18400,
    vulnerableSites: ["Jane Sandanski clinic", "Primary school Lazo Angelovski", "Vardar quay"],
    nearestWaterway: "Vardar River",
    response: "Pre-position pumps at ASNOM Blvd and close underpasses if river rises another 0.35 m.",
    announcement:
      "Flood warning for Aerodrom riverfront. Move vehicles from underground garages and avoid Vardar quay until cleared by city services.",
    center: [41.9908, 21.4652],
    polygon: [
      [41.9962, 21.446],
      [41.9986, 21.4716],
      [41.9887, 21.4864],
      [41.9819, 21.4635],
      [41.9861, 21.4476],
    ],
  },
  {
    id: "karpos-lepenec",
    name: "Karpos-Lepenec confluence",
    cityPart: "Karpos",
    risk: "high",
    probability: 68,
    expectedRainMm: 42,
    floodDepthM: 0.55,
    affectedPeople: 9200,
    vulnerableSites: ["Student dormitory Goce Delcev", "Partizanska corridor"],
    nearestWaterway: "Lepenec River",
    response: "Inspect embankment seepage and stage sandbags near the low pedestrian crossings.",
    announcement:
      "High water advisory for Karpos near Lepenec. Keep ground-floor entries protected and follow municipal diversion routes.",
    center: [42.0049, 21.3896],
    polygon: [
      [42.011, 21.374],
      [42.014, 21.399],
      [42.0004, 21.408],
      [41.9949, 21.386],
      [42.0012, 21.372],
    ],
  },
  {
    id: "chair-serava",
    name: "Chair-Serava drainage basin",
    cityPart: "Chair",
    risk: "medium",
    probability: 54,
    expectedRainMm: 36,
    floodDepthM: 0.35,
    affectedPeople: 7100,
    vulnerableSites: ["Old Bazaar access roads", "Serava drainage channels"],
    nearestWaterway: "Serava stream",
    response: "Clear drainage grates and send mobile crew to Bit Pazar before the second rain band.",
    announcement:
      "Drainage alert for Chair and Old Bazaar. Avoid basement storage and report blocked street drains to city response.",
    center: [42.0118, 21.4439],
    polygon: [
      [42.019, 21.431],
      [42.0199, 21.456],
      [42.0068, 21.463],
      [42.0011, 21.441],
      [42.009, 21.428],
    ],
  },
  {
    id: "gazi-baba-industrial",
    name: "Gazi Baba industrial belt",
    cityPart: "Gazi Baba",
    risk: "high",
    probability: 63,
    expectedRainMm: 44,
    floodDepthM: 0.48,
    affectedPeople: 5800,
    vulnerableSites: ["Rail cargo terminal", "Industrial warehouses", "A4 interchange"],
    nearestWaterway: "Vardar River",
    response: "Protect logistics depots and prepare traffic diversion around the rail underpass.",
    announcement:
      "Industrial flood advisory for Gazi Baba. Keep deliveries clear of underpasses and follow police traffic directions.",
    center: [42.0025, 21.494],
    polygon: [
      [42.011, 21.48],
      [42.007, 21.514],
      [41.994, 21.517],
      [41.988, 21.492],
      [41.998, 21.476],
    ],
  },
];

const veniceZones: FloodZone[] = [
  {
    id: "san-marco",
    name: "San Marco low pavement",
    cityPart: "San Marco",
    risk: "critical",
    probability: 88,
    expectedRainMm: 62,
    floodDepthM: 1.1,
    affectedPeople: 12600,
    vulnerableSites: ["Piazza San Marco", "Basilica access", "Vaporetto stops"],
    nearestWaterway: "Venetian Lagoon / Canal Grande tidal basin",
    response: "Deploy raised walkways, gate vulnerable entrances, and activate tourist diversion corridors.",
    announcement:
      "Acqua alta warning for San Marco. Use raised walkways, avoid low pavement areas and follow Civil Protection routes.",
    center: [45.4341, 12.3388],
    polygon: [
      [45.4384, 12.3313],
      [45.438, 12.3462],
      [45.4311, 12.3481],
      [45.4297, 12.335],
      [45.4348, 12.3299],
    ],
  },
  {
    id: "cannaregio",
    name: "Cannaregio canal edge",
    cityPart: "Cannaregio",
    risk: "high",
    probability: 71,
    expectedRainMm: 54,
    floodDepthM: 0.68,
    affectedPeople: 8300,
    vulnerableSites: ["Fondamente Nove", "Hospital water access", "Residential ground floors"],
    nearestWaterway: "Canale di Cannaregio",
    response: "Open shelter route via higher streets and monitor hospital pier accessibility.",
    announcement:
      "High tide flood advisory for Cannaregio. Protect ground-floor entrances and use marked higher routes.",
    center: [45.4432, 12.3324],
    polygon: [
      [45.4495, 12.3208],
      [45.4498, 12.3439],
      [45.4387, 12.3482],
      [45.4354, 12.3284],
      [45.4423, 12.3178],
    ],
  },
  {
    id: "dorsoduro",
    name: "Dorsoduro waterfront",
    cityPart: "Dorsoduro",
    risk: "high",
    probability: 66,
    expectedRainMm: 50,
    floodDepthM: 0.58,
    affectedPeople: 6400,
    vulnerableSites: ["Zattere promenade", "University buildings", "Accademia approaches"],
    nearestWaterway: "Giudecca Canal",
    response: "Stage mobile barriers on Zattere and route pedestrian flow inland from the waterfront.",
    announcement:
      "Flood advisory for Dorsoduro waterfront. Avoid Zattere low points and follow posted pedestrian diversions.",
    center: [45.4299, 12.3215],
    polygon: [
      [45.4355, 12.3101],
      [45.4357, 12.3346],
      [45.425, 12.339],
      [45.4208, 12.3173],
      [45.4272, 12.3072],
    ],
  },
  {
    id: "mestre-marghera",
    name: "Mestre-Marghera drainage corridor",
    cityPart: "Mestre / Marghera",
    risk: "medium",
    probability: 49,
    expectedRainMm: 45,
    floodDepthM: 0.32,
    affectedPeople: 15100,
    vulnerableSites: ["Rail station approaches", "Industrial access roads", "Mainland bus corridor"],
    nearestWaterway: "Osellino Canal",
    response: "Clear roadside drainage and keep mainland evacuation bus corridors open.",
    announcement:
      "Mainland drainage advisory for Mestre-Marghera. Expect road ponding and use official bus diversion notices.",
    center: [45.4805, 12.2366],
    polygon: [
      [45.493, 12.211],
      [45.496, 12.266],
      [45.461, 12.273],
      [45.453, 12.224],
      [45.474, 12.202],
    ],
  },
];

function rainfallSeries(baseRain: number, baseWater: number) {
  return [
    { time: "Now", rain: Math.round(baseRain * 0.18), river: +(baseWater - 0.18).toFixed(2) },
    { time: "+6h", rain: Math.round(baseRain * 0.36), river: +(baseWater - 0.06).toFixed(2) },
    { time: "+12h", rain: Math.round(baseRain * 0.62), river: +(baseWater + 0.12).toFixed(2) },
    { time: "+18h", rain: Math.round(baseRain * 0.84), river: +(baseWater + 0.24).toFixed(2) },
    { time: "+24h", rain: baseRain, river: +(baseWater + 0.31).toFixed(2) },
    { time: "+48h", rain: Math.round(baseRain * 1.52), river: +(baseWater + 0.18).toFixed(2) },
    { time: "+72h", rain: Math.round(baseRain * 1.9), river: +(baseWater + 0.04).toFixed(2) },
  ];
}

export const FLOOD_WORKSPACES: Record<string, FloodWorkspace> = {
  skopje: {
    id: "skopje",
    city: "Skopje",
    country: "North Macedonia",
    authority: "City of Skopje Flood Operations",
    nearestWaterway: "Vardar River",
    waterMetricLabel: "River level",
    waterLevelM: 3.12,
    warningLevelM: 3.4,
    expectedRain24hMm: 48,
    expectedRain72hMm: 91,
    center: [41.9981, 21.4254],
    bounds: [
      [41.94, 21.31],
      [42.06, 21.57],
    ],
    zones: skopjeZones,
    rainfallSeries: rainfallSeries(48, 3.12),
    sourceStatus: [
      { name: "Sentinel-1 SAR flood extent", signal: "GFM observed flood/water extent", status: "live-ready" },
      { name: "Sentinel-2 optical land cover", signal: "Impervious surface and exposed assets", status: "live-ready" },
      { name: "EFAS / GloFAS flood forecast", signal: "River probability and impact layers", status: "partner" },
      { name: "Open-Meteo precipitation", signal: "Hourly rain and runoff forecast", status: "live-ready" },
    ],
  },
  venice: {
    id: "venice",
    city: "Venice",
    country: "Italy",
    authority: "Venice Civil Protection",
    nearestWaterway: "Venetian Lagoon / Canal Grande tidal basin",
    waterMetricLabel: "Tide level",
    waterLevelM: 1.18,
    warningLevelM: 1.1,
    expectedRain24hMm: 62,
    expectedRain72hMm: 117,
    center: [45.4408, 12.3155],
    bounds: [
      [45.39, 12.18],
      [45.53, 12.41],
    ],
    zones: veniceZones,
    rainfallSeries: rainfallSeries(62, 1.18),
    sourceStatus: [
      { name: "Sentinel-1 SAR flood extent", signal: "Lagoon-edge water expansion", status: "live-ready" },
      { name: "Sentinel-2 optical land cover", signal: "Exposed urban fabric and public assets", status: "live-ready" },
      { name: "Centro Maree Venezia", signal: "Tide forecast and acqua alta thresholds", status: "partner" },
      { name: "Open-Meteo precipitation", signal: "Hourly rain and runoff forecast", status: "live-ready" },
    ],
  },
};

export const DEMO_WORKSPACE_KEY = "satelles.demoWorkspace";

function getDemoWorkspaceOverride() {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(DEMO_WORKSPACE_KEY);
  return value === "venice" || value === "skopje" ? value : null;
}

export function isGovernmentWorkspace(email?: string | null) {
  return Boolean(email && /(^gov@|^venice\.gov@)/i.test(email));
}

export function getFloodWorkspace(email?: string | null) {
  const override = getDemoWorkspaceOverride();
  if (override) return FLOOD_WORKSPACES[override];
  if (email?.toLowerCase().startsWith("venice.gov@")) return FLOOD_WORKSPACES.venice;
  return FLOOD_WORKSPACES.skopje;
}

export function getRiskColor(risk: FloodRiskLevel) {
  if (risk === "critical") return "#ff3b30";
  if (risk === "high") return "#ff9500";
  if (risk === "medium") return "#007aff";
  return "#34c759";
}

export function riskBadgeClass(risk: FloodRiskLevel) {
  if (risk === "critical") return "bg-destructive/10 text-destructive";
  if (risk === "high") return "bg-warning/10 text-warning";
  if (risk === "medium") return "bg-primary/10 text-primary";
  return "bg-success/10 text-success";
}

export function peopleTotal(zones: FloodZone[]) {
  return zones.reduce((sum, zone) => sum + zone.affectedPeople, 0);
}

export function highRiskZones(zones: FloodZone[]) {
  return zones.filter((zone) => zone.risk === "critical" || zone.risk === "high");
}
