export type CountryLocation = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  bounds: [[number, number], [number, number]];
};

export const DEFAULT_COUNTRY_ID = "north-macedonia";

export const COUNTRIES: CountryLocation[] = [
  {
    id: "north-macedonia",
    name: "North Macedonia",
    region: "Balkans",
    lat: 41.6086,
    lon: 21.7453,
    bounds: [
      [40.75, 20.45],
      [42.4, 23.1],
    ],
  },
  {
    id: "albania",
    name: "Albania",
    region: "Balkans",
    lat: 41.1533,
    lon: 20.1683,
    bounds: [
      [39.6, 19.0],
      [42.7, 21.1],
    ],
  },
  {
    id: "andorra",
    name: "Andorra",
    region: "Western Europe",
    lat: 42.5063,
    lon: 1.5218,
    bounds: [
      [42.4, 1.4],
      [42.7, 1.8],
    ],
  },
  {
    id: "austria",
    name: "Austria",
    region: "Central Europe",
    lat: 47.5162,
    lon: 14.5501,
    bounds: [
      [46.35, 9.45],
      [49.1, 17.2],
    ],
  },
  {
    id: "belarus",
    name: "Belarus",
    region: "Eastern Europe",
    lat: 53.7098,
    lon: 27.9534,
    bounds: [
      [51.2, 23.1],
      [56.2, 32.8],
    ],
  },
  {
    id: "belgium",
    name: "Belgium",
    region: "Western Europe",
    lat: 50.5039,
    lon: 4.4699,
    bounds: [
      [49.45, 2.45],
      [51.6, 6.45],
    ],
  },
  {
    id: "bosnia-herzegovina",
    name: "Bosnia and Herzegovina",
    region: "Balkans",
    lat: 43.9159,
    lon: 17.6791,
    bounds: [
      [42.55, 15.7],
      [45.35, 19.7],
    ],
  },
  {
    id: "bulgaria",
    name: "Bulgaria",
    region: "Balkans",
    lat: 42.7339,
    lon: 25.4858,
    bounds: [
      [41.2, 22.2],
      [44.25, 28.7],
    ],
  },
  {
    id: "croatia",
    name: "Croatia",
    region: "Balkans",
    lat: 45.1,
    lon: 15.2,
    bounds: [
      [42.35, 13.0],
      [46.65, 19.55],
    ],
  },
  {
    id: "cyprus",
    name: "Cyprus",
    region: "Southern Europe",
    lat: 35.1264,
    lon: 33.4299,
    bounds: [
      [34.5, 32.0],
      [35.8, 34.7],
    ],
  },
  {
    id: "czechia",
    name: "Czechia",
    region: "Central Europe",
    lat: 49.8175,
    lon: 15.473,
    bounds: [
      [48.5, 12.0],
      [51.1, 18.9],
    ],
  },
  {
    id: "denmark",
    name: "Denmark",
    region: "Northern Europe",
    lat: 56.2639,
    lon: 9.5018,
    bounds: [
      [54.5, 8.0],
      [57.9, 15.3],
    ],
  },
  {
    id: "estonia",
    name: "Estonia",
    region: "Northern Europe",
    lat: 58.5953,
    lon: 25.0136,
    bounds: [
      [57.5, 21.5],
      [59.8, 28.3],
    ],
  },
  {
    id: "finland",
    name: "Finland",
    region: "Northern Europe",
    lat: 61.9241,
    lon: 25.7482,
    bounds: [
      [59.7, 20.5],
      [70.1, 31.6],
    ],
  },
  {
    id: "france",
    name: "France",
    region: "Western Europe",
    lat: 46.2276,
    lon: 2.2137,
    bounds: [
      [41.3, -5.2],
      [51.2, 9.7],
    ],
  },
  {
    id: "germany",
    name: "Germany",
    region: "Central Europe",
    lat: 51.1657,
    lon: 10.4515,
    bounds: [
      [47.25, 5.85],
      [55.1, 15.1],
    ],
  },
  {
    id: "greece",
    name: "Greece",
    region: "Balkans",
    lat: 39.0742,
    lon: 21.8243,
    bounds: [
      [34.8, 19.3],
      [41.8, 29.7],
    ],
  },
  {
    id: "hungary",
    name: "Hungary",
    region: "Central Europe",
    lat: 47.1625,
    lon: 19.5033,
    bounds: [
      [45.7, 16.0],
      [48.6, 22.9],
    ],
  },
  {
    id: "iceland",
    name: "Iceland",
    region: "Northern Europe",
    lat: 64.9631,
    lon: -19.0208,
    bounds: [
      [63.2, -24.7],
      [66.7, -13.3],
    ],
  },
  {
    id: "ireland",
    name: "Ireland",
    region: "Western Europe",
    lat: 53.1424,
    lon: -7.6921,
    bounds: [
      [51.3, -10.7],
      [55.5, -5.9],
    ],
  },
  {
    id: "italy",
    name: "Italy",
    region: "Southern Europe",
    lat: 41.8719,
    lon: 12.5674,
    bounds: [
      [36.5, 6.6],
      [47.1, 18.6],
    ],
  },
  {
    id: "kosovo",
    name: "Kosovo",
    region: "Balkans",
    lat: 42.6026,
    lon: 20.903,
    bounds: [
      [41.75, 20.0],
      [43.3, 21.9],
    ],
  },
  {
    id: "latvia",
    name: "Latvia",
    region: "Northern Europe",
    lat: 56.8796,
    lon: 24.6032,
    bounds: [
      [55.65, 20.9],
      [58.1, 28.3],
    ],
  },
  {
    id: "lithuania",
    name: "Lithuania",
    region: "Northern Europe",
    lat: 55.1694,
    lon: 23.8813,
    bounds: [
      [53.85, 20.9],
      [56.45, 26.9],
    ],
  },
  {
    id: "luxembourg",
    name: "Luxembourg",
    region: "Western Europe",
    lat: 49.8153,
    lon: 6.1296,
    bounds: [
      [49.4, 5.7],
      [50.2, 6.6],
    ],
  },
  {
    id: "malta",
    name: "Malta",
    region: "Southern Europe",
    lat: 35.9375,
    lon: 14.3754,
    bounds: [
      [35.75, 14.1],
      [36.1, 14.6],
    ],
  },
  {
    id: "moldova",
    name: "Moldova",
    region: "Eastern Europe",
    lat: 47.4116,
    lon: 28.3699,
    bounds: [
      [45.45, 26.6],
      [48.6, 30.2],
    ],
  },
  {
    id: "montenegro",
    name: "Montenegro",
    region: "Balkans",
    lat: 42.7087,
    lon: 19.3744,
    bounds: [
      [41.8, 18.4],
      [43.6, 20.4],
    ],
  },
  {
    id: "netherlands",
    name: "Netherlands",
    region: "Western Europe",
    lat: 52.1326,
    lon: 5.2913,
    bounds: [
      [50.75, 3.2],
      [53.7, 7.3],
    ],
  },
  {
    id: "norway",
    name: "Norway",
    region: "Northern Europe",
    lat: 60.472,
    lon: 8.4689,
    bounds: [
      [57.8, 4.5],
      [71.2, 31.1],
    ],
  },
  {
    id: "poland",
    name: "Poland",
    region: "Central Europe",
    lat: 51.9194,
    lon: 19.1451,
    bounds: [
      [49.0, 14.1],
      [54.9, 24.2],
    ],
  },
  {
    id: "portugal",
    name: "Portugal",
    region: "Western Europe",
    lat: 39.3999,
    lon: -8.2245,
    bounds: [
      [36.9, -9.6],
      [42.2, -6.1],
    ],
  },
  {
    id: "romania",
    name: "Romania",
    region: "Eastern Europe",
    lat: 45.9432,
    lon: 24.9668,
    bounds: [
      [43.6, 20.2],
      [48.3, 29.7],
    ],
  },
  {
    id: "serbia",
    name: "Serbia",
    region: "Balkans",
    lat: 44.0165,
    lon: 21.0059,
    bounds: [
      [42.2, 18.8],
      [46.2, 23.1],
    ],
  },
  {
    id: "slovakia",
    name: "Slovakia",
    region: "Central Europe",
    lat: 48.669,
    lon: 19.699,
    bounds: [
      [47.7, 16.8],
      [49.65, 22.6],
    ],
  },
  {
    id: "slovenia",
    name: "Slovenia",
    region: "Central Europe",
    lat: 46.1512,
    lon: 14.9955,
    bounds: [
      [45.4, 13.3],
      [46.9, 16.7],
    ],
  },
  {
    id: "spain",
    name: "Spain",
    region: "Western Europe",
    lat: 40.4637,
    lon: -3.7492,
    bounds: [
      [35.9, -9.5],
      [43.9, 4.3],
    ],
  },
  {
    id: "sweden",
    name: "Sweden",
    region: "Northern Europe",
    lat: 60.1282,
    lon: 18.6435,
    bounds: [
      [55.3, 11.0],
      [69.1, 24.2],
    ],
  },
  {
    id: "switzerland",
    name: "Switzerland",
    region: "Central Europe",
    lat: 46.8182,
    lon: 8.2275,
    bounds: [
      [45.8, 5.9],
      [47.9, 10.6],
    ],
  },
  {
    id: "turkey",
    name: "Turkey",
    region: "Southern Europe",
    lat: 38.9637,
    lon: 35.2433,
    bounds: [
      [35.7, 25.6],
      [42.2, 44.8],
    ],
  },
  {
    id: "ukraine",
    name: "Ukraine",
    region: "Eastern Europe",
    lat: 48.3794,
    lon: 31.1656,
    bounds: [
      [44.2, 22.1],
      [52.4, 40.3],
    ],
  },
  {
    id: "united-kingdom",
    name: "United Kingdom",
    region: "Western Europe",
    lat: 55.3781,
    lon: -3.436,
    bounds: [
      [49.9, -8.7],
      [60.9, 1.9],
    ],
  },
];

export function getCountryById(id: string) {
  return COUNTRIES.find((country) => country.id === id);
}

export function getCountryByName(name?: string) {
  if (!name) return undefined;
  return COUNTRIES.find((country) => country.name.toLowerCase() === name.toLowerCase());
}
