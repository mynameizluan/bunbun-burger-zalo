// supabase/functions/menu-admin/index.ts
// ============================================================================
//  TRANG ADMIN MENU — chỉnh thực đơn & tồn/hết KHÔNG cần API iPOS (hướng $0)
//  Thay cho cron sync-menu (vốn cần API iPOS trả phí).
//
//  Xác thực: header  x-admin-token: <ADMIN_TOKEN>   (đặt trong .env)
//  - GET  → trả { version, updatedAt, groups, availability }  (để admin nạp lên form)
//  - POST { groups, availability? } → ghi menu_cache (tăng version khi đổi) + availability
//
//  Deploy: supabase functions deploy menu-admin --no-verify-jwt
//  Env cần: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Kiểm tra cấu trúc menu trước khi ghi (tránh hỏng dữ liệu client) */
function validateGroups(groups: any): string | null {
  if (!Array.isArray(groups) || !groups.length) return "groups rỗng";
  for (const g of groups) {
    if (!g || typeof g.cat !== "string" || !Array.isArray(g.items)) return "nhóm sai định dạng";
    for (const it of g.items) {
      if (!it || typeof it.id !== "string" || typeof it.nm !== "string") return "món thiếu id/nm";
      if (typeof it.pr !== "number" || it.pr < 0) return `giá không hợp lệ ở "${it.nm}"`;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // --- Xác thực admin ---
  if (!ADMIN_TOKEN || req.headers.get("x-admin-token") !== ADMIN_TOKEN) {
    return json({ error: "Sai hoặc thiếu admin token" }, 401);
  }

  try {
    if (req.method === "GET") {
      const { data: mc } = await sb.from("menu_cache").select("version,data,updated_at").eq("id", 1).maybeSingle();
      const { data: av } = await sb.from("availability").select("item_id,status");
      const availability: Record<string, string> = {};
      for (const r of av ?? []) availability[r.item_id] = r.status;
      return json({
        version: mc?.version ?? null,
        updatedAt: mc?.updated_at ?? null,
        groups: (mc?.data as any)?.groups ?? [],
        availability,
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const groups = body?.groups;
      const err = validateGroups(groups);
      if (err) return json({ error: err }, 400);

      const data = { groups };
      const version = await sha(JSON.stringify(data));
      const { error: e1 } = await sb.from("menu_cache").upsert({
        id: 1, version, data, updated_at: new Date().toISOString(),
      });
      if (e1) return json({ error: "ghi menu_cache lỗi: " + e1.message }, 500);

      // availability (tuỳ chọn): { itemId: 'available'|'low'|'soldout' }
      let availCount = 0;
      if (body?.availability && typeof body.availability === "object") {
        const rows = Object.entries(body.availability).map(([item_id, status]) => ({
          item_id, status: String(status), updated_at: new Date().toISOString(),
        }));
        if (rows.length) {
          const { error: e2 } = await sb.from("availability").upsert(rows, { onConflict: "item_id" });
          if (e2) return json({ error: "ghi availability lỗi: " + e2.message }, 500);
          availCount = rows.length;
        }
      }

      return json({ ok: true, version, groups: groups.length, availability: availCount });
    }

    return json({ error: "method không hỗ trợ" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
