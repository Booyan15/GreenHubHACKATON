const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "41.9981");
    const lon = parseFloat(url.searchParams.get("lon") ?? "21.4254");

    if (!isFinite(lat) || !isFinite(lon)) {
      return new Response(JSON.stringify({ error: "Invalid lat/lon" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Open-Meteo failed [${r.status}]: ${text}`);
    }
    const data = await r.json();

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});