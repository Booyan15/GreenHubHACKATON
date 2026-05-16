import { handleSatelliteRequest } from "../_shared/copernicus.ts";

Deno.serve((req) => handleSatelliteRequest(req, "risk"));
