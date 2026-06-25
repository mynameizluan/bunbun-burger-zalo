// supabase/functions/members-admin/index.ts
// ============================================================================
//  TRANG ADMIN HỘI VIÊN — xem điểm/hạng/tem, cộng-trừ điểm & đổi quà thủ công.
//  Hướng $0: không cần iPOS CRM API; điểm sống ở bảng `members` của bạn.
//
//  Xác thực: header  x-admin-token: <ADMIN_TOKEN>
//  - GET  /members-admin                  → danh sách hội viên (mới nhất trước)
//  - GET  /members-admin?phone=09...       → tìm theo SĐT (khớp một phần)
//  - GET  /members-admin?txns=<member_id>  → lịch sử giao dịch điểm của 1 hội viên
//  - POST /members-admin { action, ... }:
//       { action:"adjust",  memberId, pointsDelta, note? }  → cộng/trừ điểm (đổi quà ở quầy)
//       { action:"redeemStamp", memberId }                  → reset tem về 0 (đã tặng burger)
//
//  Deploy: supabase functions deploy members-admin --no-verify-jwt
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
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function tierOf(p: number): string {
  if (p >= 1000) return "Kim Cương";
  if (p >= 500) return "Vàng";
  if (p >= 200) return "Bạc";
  return "Đồng";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!ADMIN_TOKEN || req.headers.get("x-admin-token") !== ADMIN_TOKEN) {
    return json({ error: "Sai hoặc thiếu admin token" }, 401);
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const txnsFor = url.searchParams.get("txns");
      if (txnsFor) {
        const { data, error } = await sb.from("point_txns")
          .select("id,txn_type,amount,ref_order_no,note,created_at")
          .eq("member_id", txnsFor).order("created_at", { ascending: false }).limit(100);
        if (error) return json({ error: error.message }, 500);
        return json({ txns: data ?? [] });
      }
      const phone = url.searchParams.get("phone");
      let q = sb.from("members").select("id,phone,name,points,tier,stamps,created_at")
        .order("created_at", { ascending: false }).limit(500);
      if (phone) q = q.ilike("phone", `%${phone}%`);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ members: data ?? [] });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action, memberId } = body ?? {};
      if (!memberId) return json({ error: "thiếu memberId" }, 400);

      const { data: m, error: e0 } = await sb.from("members").select("*").eq("id", memberId).maybeSingle();
      if (e0 || !m) return json({ error: "không tìm thấy hội viên" }, 404);

      if (action === "adjust") {
        const delta = Number(body.pointsDelta);
        if (!delta || Number.isNaN(delta)) return json({ error: "pointsDelta không hợp lệ" }, 400);
        const points = Math.max(0, (m.points ?? 0) + delta);
        const tier = tierOf(points);
        const { error: e1 } = await sb.from("members").update({ points, tier }).eq("id", memberId);
        if (e1) return json({ error: e1.message }, 500);
        await sb.from("point_txns").insert({
          member_id: memberId,
          txn_type: delta >= 0 ? "adjust" : "redeem",
          amount: delta,
          note: (body.note ? String(body.note) : (delta >= 0 ? "Cộng tay (admin)" : "Đổi quà/trừ tay (admin)")).slice(0, 200),
        });
        return json({ ok: true, points, tier });
      }

      if (action === "redeemStamp") {
        const { error: e1 } = await sb.from("members").update({ stamps: 0 }).eq("id", memberId);
        if (e1) return json({ error: e1.message }, 500);
        await sb.from("point_txns").insert({
          member_id: memberId, txn_type: "redeem", amount: 0, note: "Đổi burger miễn phí — reset 10 tem (admin)",
        });
        return json({ ok: true, stamps: 0 });
      }

      return json({ error: "action không hợp lệ" }, 400);
    }

    return json({ error: "method không hỗ trợ" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
