// supabase/functions/availability/index.ts  —  GET /availability  (tồn/hết món)
// Deploy: supabase functions deploy availability --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const { data, error } = await sb.from("availability").select("item_id,status,updated_at");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
  // map gọn: { itemId: status }
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.item_id] = r.status;
  return new Response(JSON.stringify({ availability: map, ts: Date.now() }), {
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});
