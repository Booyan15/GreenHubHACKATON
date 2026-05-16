import type { Connect } from "vite";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

type Layer = "rgb" | "ndvi" | "water" | "risk";

const LAYERS = new Set<Layer>(["rgb", "ndvi", "water", "risk"]);

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function ensureDenoEnv(env: Record<string, string>) {
  const get = (key: string) => env[key] ?? process.env[key];
  (globalThis as typeof globalThis & { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno = {
    env: { get },
  };
  process.env.COPERNICUS_CLIENT_ID = get("COPERNICUS_CLIENT_ID");
  process.env.COPERNICUS_CLIENT_SECRET = get("COPERNICUS_CLIENT_SECRET");
}

export function satelliteDevApiPlugin(): Plugin {
  let copernicusModule: typeof import("../supabase/functions/_shared/copernicus.ts") | null = null;

  async function loadCopernicus(env: Record<string, string>) {
    ensureDenoEnv(env);
    copernicusModule ??= await import("../supabase/functions/_shared/copernicus.ts");
    return copernicusModule;
  }

  return {
    name: "satellite-dev-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        const match = url.match(/^\/api\/satellite\/(rgb|ndvi|water|risk)$/);
        if (!match) return next();

        const layer = match[1] as Layer;
        if (!LAYERS.has(layer)) return next();

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.end();
          return;
        }

        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Use POST." }));
          return;
        }

        try {
          const body = await readBody(req);
          const { handleSatelliteRequest } = await loadCopernicus(env);
          const response = await handleSatelliteRequest(
            new Request(`http://127.0.0.1${url}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body,
            }),
            layer,
          );
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(await response.text());
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Satellite dev API failed.",
            }),
          );
        }
      });
    },
  };
}
