import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "admin" | "enterprise" | "farmer" | "citizen";

interface DemoAccount {
  email: string;
  password: string;
  full_name: string;
  organization: string;
  role: Role;
  replaceFarms?: boolean;
  farms?: { name: string; crop: string; lat: number; lon: number; radius_km: number }[];
}

const DEMO_PASSWORD = "Demo1234!";

const accounts: DemoAccount[] = [
  {
    email: "farmer@demo.satelles.mk",
    password: DEMO_PASSWORD,
    full_name: "Stojan Petrov",
    organization: "Petrov Family Farm",
    role: "farmer",
    farms: [
      { name: "Pelagonia Wheat Field", crop: "Wheat", lat: 41.0314, lon: 21.3347, radius_km: 1.2 },
      { name: "Tikveš Vineyard", crop: "Grapes", lat: 41.5470, lon: 22.0833, radius_km: 0.8 },
    ],
  },
  {
    email: "enterprise@demo.satelles.mk",
    password: DEMO_PASSWORD,
    full_name: "Marija Nikolovska",
    organization: "AgriCorp Macedonia",
    role: "enterprise",
    farms: [
      { name: "Strumica Pepper Estate", crop: "Pepper", lat: 41.4378, lon: 22.6419, radius_km: 3.5 },
      { name: "Kočani Rice Plains", crop: "Rice", lat: 41.9170, lon: 22.4127, radius_km: 4.0 },
      { name: "Ovče Pole Cereals", crop: "Barley", lat: 41.7500, lon: 21.9333, radius_km: 5.0 },
    ],
  },
  {
    email: "gov@demo.satelles.mk",
    password: DEMO_PASSWORD,
    full_name: "Aleksandar Trajkov",
    organization: "City of Skopje Flood Operations",
    role: "admin",
    replaceFarms: true,
    farms: [
      { name: "Aerodrom riverfront", crop: "Flood evaluation zone", lat: 41.9908, lon: 21.4652, radius_km: 1.8 },
      { name: "Karpos-Lepenec confluence", crop: "Flood evaluation zone", lat: 42.0049, lon: 21.3896, radius_km: 1.4 },
      { name: "Chair-Serava drainage basin", crop: "Drainage evaluation zone", lat: 42.0118, lon: 21.4439, radius_km: 1.2 },
    ],
  },
  {
    email: "venice.gov@demo.satelles.mk",
    password: DEMO_PASSWORD,
    full_name: "Giulia Conti",
    organization: "Venice Civil Protection",
    role: "admin",
    replaceFarms: true,
    farms: [
      { name: "San Marco low pavement", crop: "Acqua alta evaluation zone", lat: 45.4341, lon: 12.3388, radius_km: 0.8 },
      { name: "Cannaregio canal edge", crop: "Tidal evaluation zone", lat: 45.4432, lon: 12.3324, radius_km: 0.9 },
      { name: "Dorsoduro waterfront", crop: "Tidal evaluation zone", lat: 45.4299, lon: 12.3215, radius_km: 0.9 },
    ],
  },
  {
    email: "citizen@demo.satelles.mk",
    password: DEMO_PASSWORD,
    full_name: "Elena Stojanova",
    organization: "Skopje Resident",
    role: "citizen",
  },
  {
    email: "admin@demo.satelles.mk",
    password: DEMO_PASSWORD,
    full_name: "Platform Admin",
    organization: "SATELLES",
    role: "admin",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: { email: string; status: string; role: Role }[] = [];

    for (const acc of accounts) {
      // Try to create the user (idempotent: if exists, look it up)
      let userId: string | null = null;

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.full_name },
      });

      if (created?.user) {
        userId = created.user.id;
      } else if (createErr && /registered|exists/i.test(createErr.message)) {
        // Lookup existing
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        userId = list?.users.find((u) => u.email === acc.email)?.id ?? null;
      } else if (createErr) {
        results.push({ email: acc.email, status: `error: ${createErr.message}`, role: acc.role });
        continue;
      }

      if (!userId) {
        results.push({ email: acc.email, status: "error: no user id", role: acc.role });
        continue;
      }

      await supabase.auth.admin.updateUserById(userId, {
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.full_name },
      });

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: acc.full_name,
        organization: acc.organization,
      });

      // Ensure role (replace default citizen if needed)
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("user_roles").insert({ user_id: userId, role: acc.role });

      // Seed farms (only if none exist for this user)
      if (acc.farms && acc.farms.length) {
        if (acc.replaceFarms) {
          await supabase.from("farms").delete().eq("user_id", userId);
        }
        const { count } = await supabase
          .from("farms")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!count) {
          await supabase.from("farms").insert(
            acc.farms.map((f) => ({ ...f, user_id: userId })),
          );
        }
      }

      results.push({ email: acc.email, status: "ready", role: acc.role });
    }

    return new Response(
      JSON.stringify({ password: DEMO_PASSWORD, accounts: results }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
