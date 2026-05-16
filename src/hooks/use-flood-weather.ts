import { useEffect, useState } from "react";
import type { FloodWorkspace } from "@/lib/government/flood";

type FloodWeather = {
  rain24hMm: number | null;
  rain72hMm: number | null;
  source: "open-meteo" | "unavailable";
  updatedAt: string;
};

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    rain?: number[];
    precipitation?: number[];
  };
};

export function useFloodWeather(workspace: FloodWorkspace) {
  const [weather, setWeather] = useState<FloodWeather>({
    rain24hMm: null,
    rain72hMm: null,
    source: "unavailable",
    updatedAt: "Weather API is not configured yet.",
  });

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(workspace.center[0]));
    url.searchParams.set("longitude", String(workspace.center[1]));
    url.searchParams.set("hourly", "rain,precipitation");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "auto");

    setWeather({
      rain24hMm: null,
      rain72hMm: null,
      source: "unavailable",
      updatedAt: "Loading Open-Meteo forecast...",
    });

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
        return response.json() as Promise<OpenMeteoResponse>;
      })
      .then((data) => {
        const values = data.hourly?.rain ?? data.hourly?.precipitation ?? [];
        const sum = (items: number[]) => items.reduce((total, value) => total + (Number(value) || 0), 0);
        if (values.length < 24) throw new Error("Open-Meteo response was incomplete");

        setWeather({
          rain24hMm: Math.round(sum(values.slice(0, 24))),
          rain72hMm: Math.round(sum(values.slice(0, 72))),
          source: "open-meteo",
          updatedAt: new Date().toLocaleString(),
        });
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setWeather({
            rain24hMm: null,
            rain72hMm: null,
            source: "unavailable",
            updatedAt: "Weather API is not configured yet.",
          });
        }
      });

    return () => controller.abort();
  }, [workspace.center]);

  return weather;
}
