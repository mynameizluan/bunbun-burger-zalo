// supabase/functions/menu/index.ts  —  GET /menu  (thực đơn + ETag)
// Deploy: supabase functions deploy menu --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, if-none-match",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const { data, error } = await sb.from("menu_cache").select("version,data,updated_at").eq("id", 1).single();
  if (error || !data) return new Response(JSON.stringify({ error: "no menu" }), { status: 404, headers: CORS });

  const etag = `"v${data.version}"`;
  // stale-while-revalidate: client dùng cache, tự làm mới nền; 304 nếu chưa đổi
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ...CORS, ETag: etag } });
  }
  return new Response(JSON.stringify({ version: data.version, updatedAt: data.updated_at, ...data.data }), {
    headers: { ...CORS, "Content-Type": "application/json", ETag: etag, "Cache-Control": "public, max-age=300, stale-while-revalidate=1800" },
  });
});
