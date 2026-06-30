// supabase/functions/crm-points/index.ts
// POST /crm-points — định danh hội viên theo SĐT & ĐỌC điểm (công khai, chỉ đọc).
//  Body:
//   { action:"get", phone:"0901234567", name? }          // khách nhập SĐT trực tiếp ($0)
//   { action:"get", phoneToken, accessToken }            // hoặc lấy SĐT từ Zalo (cần ZALO_APP_SECRET)
//  Trả: { ok, phone, points, tier, stamps, name }
//  Tích/trừ điểm KHÔNG làm ở đây (chống tự cộng) — nhân viên dùng members-admin (có mật khẩu).
//  Deploy: supabase functions deploy crm-points --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// Đổi token Zalo → SĐT thật (chỉ chạy khi có ZALO_APP_SECRET; bảo mật phía backend)
async function resolvePhone(phoneToken: string, accessToken: string): Promise<string> {
  const secret = Deno.env.get("ZALO_APP_SECRET");
  if (!secret || !phoneToken) return "";
  const r = await fetch("https://graph.zalo.me/v2.0/me/info", {
    headers: { access_token: accessToken ?? "", code: phoneToken, secret_key: secret },
  }).then((x) => x.json()).catch(() => null);
  return r?.data?.number ?? "";
}

// Chuẩn hoá SĐT VN: bỏ ký tự thừa, +84 → 0; hợp lệ khi 9–11 số bắt đầu bằng 0
function normPhone(p: string): string {
  let s = (p || "").replace(/[^\d+]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
  return /^0\d{8,10}$/.test(s) ? s : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    const { phoneToken, accessToken, phone: rawPhone, name } = body ?? {};

    // Ưu tiên SĐT nhập tay; nếu không có thì thử lấy từ Zalo token
    let phone = normPhone(rawPhone || "");
    if (!phone && phoneToken) phone = normPhone(await resolvePhone(phoneToken, accessToken));
    if (!phone) return json({ error: "Số điện thoại không hợp lệ" }, 400);

    // upsert hội viên theo SĐT
    let { data: m } = await sb.from("members").select("*").eq("phone", phone).maybeSingle();
    if (!m) {
      const ins = await sb.from("members").insert({ phone, name: name ?? null }).select().single();
      m = ins.data;
    } else if (name && !m.name) {
      await sb.from("members").update({ name }).eq("id", m.id);
      m.name = name;
    }

    return json({ ok: true, phone, points: m.points ?? 0, tier: m.tier ?? "Đồng", stamps: m.stamps ?? 0, name: m.name ?? null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
