// supabase/functions/crm-points/index.ts
// POST /crm-points  — đổi token SĐT Zalo → định danh hội viên → tích/đọc điểm
// Body: { phoneToken, accessToken, action?: "accrue"|"get", amount?, orderNo? }
// Deploy: supabase functions deploy crm-points --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

// Đổi token → số điện thoại thật qua Zalo Graph API (bảo mật: chỉ chạy ở backend)
async function resolvePhone(phoneToken: string, accessToken: string): Promise<string> {
  const r = await fetch("https://graph.zalo.me/v2.0/me/info", {
    headers: {
      access_token: accessToken,
      code: phoneToken,
      secret_key: Deno.env.get("ZALO_APP_SECRET")!,
    },
  }).then((x) => x.json());
  return r?.data?.number ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { phoneToken, accessToken, action = "get", amount = 0, orderNo } = await req.json();
    const phone = await resolvePhone(phoneToken, accessToken);
    if (!phone) return new Response(JSON.stringify({ error: "phone resolve failed" }), { status: 400, headers: CORS });

    // upsert hội viên theo SĐT
    let { data: m } = await sb.from("members").select("*").eq("phone", phone).maybeSingle();
    if (!m) {
      const ins = await sb.from("members").insert({ phone }).select().single();
      m = ins.data;
    }

    if (action === "accrue" && amount > 0) {
      // TODO (Phase 2): gọi iPOS CRM API để cộng điểm phía iPOS (đối soát theo SĐT)
      //   await fetch(`${Deno.env.get("IPOS_API_BASE")}/crm/accrue`, { ... })
      await sb.from("members").update({ points: (m.points ?? 0) + amount }).eq("id", m.id);
      await sb.from("point_txns").insert({ member_id: m.id, txn_type: "accrue", amount, ref_order_no: orderNo });
      m.points = (m.points ?? 0) + amount;
    }

    return new Response(JSON.stringify({ points: m.points, tier: m.tier, stamps: m.stamps }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
