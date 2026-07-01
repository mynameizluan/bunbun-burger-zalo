// supabase/functions/loyalty-admin/index.ts
// ============================================================================
//  CẤU HÌNH ĐIỂM THƯỞNG (rate đ/điểm, tem, hạng) + MẬT KHẨU QUẢN LÝ riêng.
//  - Logic điểm chỉnh trên dashboard nhưng cần MẬT KHẨU QUẢN LÝ (khác mật khẩu
//    nhân viên) để lưu → nhân viên thường không đổi được rate (chống lạm dụng).
//  - Config lưu trong menu_cache.data.loyalty (app + dashboard đọc chung).
//
//  GET                                   → { config }               (ai đọc cũng được: để tính điểm & hiển thị)
//  POST { action:"verifyManager", password }            → { ok }
//  POST { action:"changeManager", oldPassword, newPassword }        → đổi mật khẩu quản lý
//  POST { action:"save", password, config }             → lưu config (cần mật khẩu quản lý)
//
//  Mật khẩu quản lý: token .env (ADMIN_TOKEN) làm khoá chủ, HOẶC băm lưu ở
//  sync_state.job = '__manager_pass__' (last_error = hash).
//  Deploy: supabase functions deploy loyalty-admin --no-verify-jwt
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ENV_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";

const DEFAULT_CONFIG = {
  vndPerPoint: 1000,          // 1.000đ = 1 điểm
  stampPerOrder: 1,           // mỗi đơn +1 tem
  stampGoal: 10,              // 10 tem = 1 burger miễn phí
  tiers: [
    { n: "Đồng", min: 0 },
    { n: "Bạc", min: 200 },
    { n: "Vàng", min: 500 },
    { n: "Kim Cương", min: 1000 },
  ],
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function mgrHash(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bbmgr:" + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyManager(pw: string | null): Promise<boolean> {
  if (!pw) return false;
  if (ENV_TOKEN && pw === ENV_TOKEN) return true;   // khoá chủ luôn dùng được
  const { data } = await sb.from("sync_state").select("last_error").eq("job", "__manager_pass__").maybeSingle();
  const h = (data?.last_error as string) || "";
  return !!h && (await mgrHash(pw)) === h;
}

async function sha8(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanConfig(c: any) {
  const vpp = Math.max(100, Math.round(Number(c?.vndPerPoint) || 1000));   // tối thiểu 100đ/điểm
  const spo = Math.max(0, Math.round(Number(c?.stampPerOrder ?? 1)));
  const goal = Math.max(1, Math.round(Number(c?.stampGoal ?? 10)));
  let tiers = Array.isArray(c?.tiers) ? c.tiers
    .filter((t: any) => t && typeof t.n === "string")
    .map((t: any) => ({ n: String(t.n).slice(0, 30), min: Math.max(0, Math.round(Number(t.min) || 0)) }))
    : [];
  if (!tiers.length) tiers = DEFAULT_CONFIG.tiers;
  tiers.sort((a: any, b: any) => a.min - b.min);
  return { vndPerPoint: vpp, stampPerOrder: spo, stampGoal: goal, tiers };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (req.method === "GET") {
      const { data: mc } = await sb.from("menu_cache").select("data").eq("id", 1).maybeSingle();
      const cfg = (mc?.data as any)?.loyalty || DEFAULT_CONFIG;
      return json({ config: { ...DEFAULT_CONFIG, ...cfg } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const action = body?.action;

      if (action === "verifyManager") {
        return json({ ok: await verifyManager(body?.password) });
      }

      if (action === "changeManager") {
        if (!(await verifyManager(body?.oldPassword))) return json({ error: "Mật khẩu quản lý hiện tại không đúng" }, 401);
        const np = String(body?.newPassword || "");
        if (np.length < 4) return json({ error: "Mật khẩu mới tối thiểu 4 ký tự" }, 400);
        const h = await mgrHash(np);
        await sb.from("sync_state").upsert({ job: "__manager_pass__", last_error: h, updated_at: new Date().toISOString() }, { onConflict: "job" });
        return json({ ok: true });
      }

      if (action === "save") {
        if (!(await verifyManager(body?.password))) return json({ error: "Cần mật khẩu quản lý để đổi cấu hình điểm" }, 401);
        const cfg = cleanConfig(body?.config);
        const { data: cur } = await sb.from("menu_cache").select("data,version").eq("id", 1).maybeSingle();
        const data = { ...(cur?.data as any || {}), loyalty: cfg };
        const version = await sha8(JSON.stringify(data));
        const { error } = await sb.from("menu_cache").upsert({ id: 1, version, data, updated_at: new Date().toISOString() });
        if (error) return json({ error: "ghi lỗi: " + error.message }, 500);
        return json({ ok: true, config: cfg, version });
      }

      return json({ error: "action không hợp lệ" }, 400);
    }

    return json({ error: "method không hỗ trợ" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
