// supabase/functions/admin-auth/index.ts
// ============================================================================
//  Xác thực admin có MẬT KHẨU đổi được (lưu băm trong sync_state, không cần bảng mới).
//  - Khoá chủ (master): biến môi trường ADMIN_TOKEN luôn dùng được để khôi phục.
//  - Mật khẩu người dùng: lưu băm SHA-256 ở sync_state.job='__admin_pass__'.
//
//  POST { action:"verify", password }              -> { ok }
//  POST { action:"change", oldPassword, newPassword } -> đổi mật khẩu (cần old đúng)
//
//  Deploy: supabase functions deploy admin-auth --no-verify-jwt
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ENV_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bbsalt:" + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function storedHash(): Promise<string> {
  const { data } = await sb.from("sync_state").select("last_error").eq("job", "__admin_pass__").maybeSingle();
  return (data?.last_error as string) || "";
}
export async function verifyAdmin(incoming: string | null): Promise<boolean> {
  if (!incoming) return false;
  if (ENV_TOKEN && incoming === ENV_TOKEN) return true;     // khoá chủ
  const h = await storedHash();
  return !!h && (await sha(incoming)) === h;                // mật khẩu đã đặt
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method không hỗ trợ" }, 405);
  try {
    const { action, password, oldPassword, newPassword } = await req.json();
    if (action === "verify") {
      return json({ ok: await verifyAdmin(password) });
    }
    if (action === "change") {
      if (!(await verifyAdmin(oldPassword))) return json({ error: "Mật khẩu hiện tại không đúng" }, 401);
      if (!newPassword || String(newPassword).length < 4) return json({ error: "Mật khẩu mới phải ≥ 4 ký tự" }, 400);
      const { error } = await sb.from("sync_state").upsert({
        job: "__admin_pass__", fail_streak: 0, last_error: await sha(String(newPassword)),
        updated_at: new Date().toISOString(),
      }, { onConflict: "job" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    return json({ error: "action không hợp lệ" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
