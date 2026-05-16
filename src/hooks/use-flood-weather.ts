import { useEffect, useMemo, useState } from "react";
import type { FloodWorkspace } from "@/lib/government/flood";

type FloodWeather = {
  rain24hMm: number;
  rain72hMm: number;
  source: "open-meteo" | "demo";
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
  const fallback = useMemo<FloodWeather>(
    () => ({
      rain24hMm: workspace.expectedRain24hMm,
      rain72hMm: workspace.expectedRain72hMm,
      source: "demo",
      updatedAt: "Demo scenario",
    }),
    [workspace.expectedRain24hMm, workspace.expectedRain72hMm],
  );
  const [weather, setWeather] = useState<FloodWeather>(fallback);

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(workspace.center[0]));
    url.searchParams.set("longitude", String(workspace.center[1]));
    url.searchParams.set("hourly", "rain,precipitation");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "auto");

    setWeather(fallback);

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
        return response.json() as Promise<OpenMeteoResponse>;
      })
      .then((data) => {
        const values = data.hourly?.rain ?? data.hourly?.precipitation ?? [];
        const sum = (items: number[]) => items.reduce((total, value) => total + (Number(value) || 0), 0);
        if (values.length < 24) return;

        setWeather({
          rain24hMm: Math.round(sum(values.slice(0, 24))),
          rain72hMm: Math.round(sum(values.slice(0, 72))),
          source: "open-meteo",
          updatedAt: new Date().toLocaleString(),
        });
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setWeather(fallback);
      });

    return () => controller.abort();
  }, [fallback, workspace.center]);

  return weather;
}
