import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudRain, Droplets, Loader2, Thermometer, Waves, Wind } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/dashboard/StatCard";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getFloodWorkspace, isGovernmentWorkspace } from "@/lib/government/flood";
import { useFloodWeather } from "@/hooks/use-flood-weather";

type WeatherResponse = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    apparent_temperature: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
  };
};

const cities = [
  { name: "Skopje", lat: 41.9981, lon: 21.4254 },
  { name: "Bitola", lat: 41.0316, lon: 21.3433 },
  { name: "Tikveš (Kavadarci)", lat: 41.4304, lon: 22.0086 },
  { name: "Strumica", lat: 41.4378, lon: 22.6433 },
  { name: "Ohrid", lat: 41.1172, lon: 20.8019 },
];

function openMeteoUrl(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,apparent_temperature",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,uv_index_max",
    hourly: "temperature_2m,precipitation_probability,precipitation",
    forecast_days: "14",
    timezone: "auto",
  });

  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

function isWeatherResponse(value: unknown): value is WeatherResponse {
  const data = value as WeatherResponse;
  return Boolean(
    data?.current &&
      Number.isFinite(data.current.temperature_2m) &&
      Number.isFinite(data.current.relative_humidity_2m) &&
      Number.isFinite(data.current.precipitation) &&
      Number.isFinite(data.current.wind_speed_10m) &&
      Number.isFinite(data.current.apparent_temperature) &&
      Array.isArray(data.daily?.time) &&
      Array.isArray(data.daily.temperature_2m_max) &&
      Array.isArray(data.daily.temperature_2m_min) &&
      Array.isArray(data.daily.precipitation_sum),
  );
}

async function fetchOpenMeteoWeather(lat: number, lon: number, signal: AbortSignal) {
  const response = await fetch(openMeteoUrl(lat, lon), { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Open-Meteo returned ${response.status}`);
  if (!isWeatherResponse(data)) throw new Error("Weather response was incomplete");
  return data;
}

export default function Weather() {
  const { user } = useAuth();
  if (isGovernmentWorkspace(user?.email)) return <GovernmentHydrologyWeather email={user?.email} />;

  return <AgronomyWeather />;
}

function AgronomyWeather() {

  const [city, setCity] = useState(cities[0]);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setErrorMessage(null);
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: functionData, error } = await supabase.functions.invoke("weather", {
            body: null,
            method: "GET",
            // @ts-expect-error supabase-js accepts query in v2
            query: { lat: String(city.lat), lon: String(city.lon) },
          });

          if (!error && isWeatherResponse(functionData)) {
            if (!cancelled) {
              setData(functionData);
            }
            return;
          }
        }

        const liveWeather = await fetchOpenMeteoWeather(city.lat, city.lon, controller.signal);
        if (!cancelled) {
          setData(liveWeather);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError" || cancelled) return;

        setData(null);
        setErrorMessage("Weather data could not be loaded from Open-Meteo. No fake forecast is shown.");
        toast({
          title: "Weather unavailable",
          description: "Live weather could not be reached. No demo weather values are shown.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [city]);

  const dailyChart = useMemo(() => {
    if (!data) return [];
    return data.daily.time.map((t, i) => ({
      date: t.slice(5),
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
      rain: data.daily.precipitation_sum[i],
    }));
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Weather & forecast</h1>
          <p className="mt-1 text-muted-foreground">
            Live data from Open-Meteo · 14-day outlook for {city.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cities.map((c) => (
            <button
              key={c.name}
              onClick={() => setCity(c)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                city.name === c.name
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : errorMessage || !data ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold tracking-tight">Weather API is not configured yet.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {errorMessage ?? "No real weather response is available. No fake temperature, rain, humidity, or wind values are shown."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Temperature" value={`${data.current.temperature_2m.toFixed(0)}°C`} hint={`Feels like ${data.current.apparent_temperature.toFixed(0)}°`} icon={<Thermometer className="h-4 w-4 text-warning" />} />
            <StatCard label="Humidity" value={`${data.current.relative_humidity_2m}%`} hint="Relative" icon={<Droplets className="h-4 w-4 text-primary" />} />
            <StatCard label="Precipitation" value={`${data.current.precipitation} mm`} hint="Last hour" icon={<CloudRain className="h-4 w-4 text-primary" />} />
            <StatCard label="Wind" value={`${data.current.wind_speed_10m.toFixed(0)} km/h`} hint="At 10m" icon={<Wind className="h-4 w-4 text-muted-foreground" />} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold tracking-tight">Temperature outlook (°C)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="max" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="min" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold tracking-tight">Precipitation (mm)</h2>
            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChart}>
                  <defs>
                    <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="rain" stroke="hsl(var(--primary))" fill="url(#rainFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GovernmentHydrologyWeather({ email }: { email?: string | null }) {
  const workspace = getFloodWorkspace(email);
  const weather = useFloodWeather(workspace);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rain and river levels</h1>
        <p className="mt-1 text-muted-foreground">
          {workspace.city} · {workspace.nearestWaterway} · {weather.source === "open-meteo" ? "Open-Meteo live precipitation" : "Weather API is not configured yet."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Rain next 24h"
          value={formatMm(weather.rain24hMm)}
          hint="Open-Meteo city forecast"
          icon={<CloudRain className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="Rain next 72h"
          value={formatMm(weather.rain72hMm)}
          hint="Open-Meteo accumulated"
          icon={<Droplets className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label={workspace.waterMetricLabel}
          value={`${workspace.waterLevelM.toFixed(2)} m`}
          hint={`Warning ${workspace.warningLevelM.toFixed(2)} m`}
          icon={<Waves className="h-4 w-4 text-warning" />}
        />
        <StatCard
          label="Critical threshold"
          value={`${Math.max(workspace.warningLevelM - workspace.waterLevelM, 0).toFixed(2)} m`}
          hint="Remaining margin"
          icon={<Thermometer className="h-4 w-4 text-destructive" />}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold tracking-tight">72-hour hydrology outlook</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configured hydrology scenario, separate from live Open-Meteo weather values.
        </p>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={workspace.rainfallSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="rain" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="water" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Line yAxisId="rain" type="monotone" dataKey="rain" stroke="hsl(var(--primary))" strokeWidth={2} name="Rain mm" />
              <Line yAxisId="water" type="monotone" dataKey="river" stroke="hsl(var(--destructive))" strokeWidth={2} name="Water m" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {workspace.zones.map((zone) => (
          <div key={zone.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{zone.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{zone.nearestWaterway}</p>
              </div>
              <p className="text-sm font-medium">{zone.expectedRainMm} mm</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(zone.probability, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{zone.probability}% configured scenario probability · {zone.floodDepthM.toFixed(2)} m expected depth</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMm(value: number | null) {
  return typeof value === "number" ? `${value} mm` : "No data";
}
