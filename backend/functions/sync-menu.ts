// supabase/functions/sync-menu/index.ts
// ============================================================================
//  ⚠️ TUỲ CHỌN — CHỈ DÙNG KHI ĐÃ MUA iPOS Menu API (Phase 2, trả phí).
//  Đường mặc định MIỄN PHÍ để quản menu/tồn-hết là `menu-admin` + trang
//  `admin/index.html` (tự nhập, không phụ thuộc API iPOS). Chỉ deploy + đặt cron
//  cho function này khi bạn thật sự cần TỰ ĐỘNG đồng bộ từ iPOS.
//
//  SCHEDULED FUNCTION — Đồng bộ thực đơn + tồn/hết từ iPOS Menu API
//  (Phase 2 · theo mục 7 docs/REQUIREMENTS.docx)
//
//  Chế độ chạy (query ?mode=):
//    ?mode=menu          → kéo toàn bộ thực đơn, ghi menu_cache (tăng version khi đổi)
//    ?mode=availability  → chỉ kéo trạng thái tồn/hết, ghi bảng availability
//    ?mode=all (mặc định)→ cả hai
//
//  Tần suất (đặt ở Supabase Dashboard → Database → Cron jobs, hoặc pg_cron):
//    menu:          */12 * * * *   (10–15 phút/lần)   → .../sync-menu?mode=menu
//    availability:  */2  * * * *   (1–2 phút/lần)     → .../sync-menu?mode=availability
//
//  An toàn:
//    • stale-while-revalidate: khi iPOS lỗi, KHÔNG ghi đè cache cũ → client vẫn
//      nhận menu/tồn gần nhất; chỉ ghi log.
//    • version chỉ tăng khi nội dung menu thực sự đổi (hash) → ETag client ổn định.
//    • Đếm số lần lỗi liên tiếp (sync_state.fail_streak); ≥ MAX_FAIL_ALERT thì
//      console.error("[ALERT] ...") để hiện trong Supabase Logs / cảnh báo.
//
//  Deploy: supabase functions deploy sync-menu --no-verify-jwt
//  Env cần có (backend/.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//                             IPOS_API_BASE, IPOS_API_KEY
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const IPOS_BASE = (Deno.env.get("IPOS_API_BASE") ?? "").replace(/\/$/, "");
const IPOS_TOKEN = Deno.env.get("IPOS_API_KEY") ?? "";
const MAX_FAIL_ALERT = 3;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

/* -------- Gọi iPOS API (có timeout + ném lỗi khi không 2xx) --------------- */
async function iposGet(path: string): Promise<any> {
  if (!IPOS_BASE) throw new Error("IPOS_API_BASE chưa cấu hình");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const r = await fetch(IPOS_BASE + path, {
      headers: { Authorization: `Bearer ${IPOS_TOKEN}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`iPOS ${path} → HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ============================================================================
 *  ÁNH XẠ iPOS → CẤU TRÚC UI  ⚠️ CHỈNH theo schema thật khi iPOS cấp tài liệu.
 *  UI (app/index.html) tiêu thụ: { groups:[{cat,icon,items:[{id,nm,ds,pr,photo,hot}]}] }
 * ========================================================================== */
const CAT_ICON: Record<string, string> = {
  "Burger": "🍔", "Mini Burger": "🍔", "Món kèm": "🍟", "Topping": "➕",
  "Salad": "🥗", "Tráng miệng": "🍮", "Cà phê": "☕", "Nước uống": "🥤",
};

function mapIposMenu(raw: any): { groups: any[] } {
  // GIẢ ĐỊNH: raw.categories = [{ name, items:[{ id, name, description, price, image, is_best }] }]
  const cats: any[] = raw?.categories ?? raw?.menu ?? [];
  const groups = cats.map((c: any) => ({
    cat: c.name ?? c.category ?? "Khác",
    icon: CAT_ICON[c.name] ?? "🍽️",
    items: (c.items ?? c.dishes ?? []).map((it: any) => ({
      id: String(it.id ?? it.code ?? it.sku),
      nm: it.name ?? it.title ?? "",
      ds: it.description ?? it.desc ?? "",
      pr: Number(it.price ?? it.unit_price ?? 0),
      photo: it.image ?? it.photo ?? it.image_url ?? "",
      hot: Boolean(it.is_best ?? it.bestseller ?? false),
    })),
  })).filter((g: any) => g.items.length);
  return { groups };
}

function mapIposAvailability(raw: any): { item_id: string; status: string }[] {
  // GIẢ ĐỊNH: raw.items = [{ id, in_stock:boolean, low?:boolean }]
  const items: any[] = raw?.items ?? raw?.availability ?? [];
  return items.map((it: any) => ({
    item_id: String(it.id ?? it.code ?? it.sku),
    status: it.in_stock === false || it.sold_out === true
      ? "soldout"
      : (it.low === true || it.low_stock === true ? "low" : "available"),
  }));
}

/* -------- Hash ổn định để chỉ tăng version khi nội dung đổi --------------- */
async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------- Ghi nhận kết quả + đếm lỗi liên tiếp (sync_state) --------------- */
async function recordResult(job: string, ok: boolean, errMsg = ""): Promise<number> {
  const { data: cur } = await sb.from("sync_state").select("fail_streak").eq("job", job).maybeSingle();
  const streak = ok ? 0 : (cur?.fail_streak ?? 0) + 1;
  await sb.from("sync_state").upsert({
    job,
    fail_streak: streak,
    last_ok_at: ok ? new Date().toISOString() : (cur as any)?.last_ok_at ?? null,
    last_error: ok ? null : errMsg.slice(0, 500),
    updated_at: new Date().toISOString(),
  }, { onConflict: "job" });
  if (!ok && streak >= MAX_FAIL_ALERT) {
    console.error(`[ALERT] sync-menu job="${job}" lỗi ${streak} lần liên tiếp: ${errMsg}`);
  }
  return streak;
}

/* -------- Đồng bộ menu: chỉ ghi khi nội dung đổi (bump version) ----------- */
async function syncMenu() {
  const raw = await iposGet("/menu");
  const norm = mapIposMenu(raw);
  if (!norm.groups.length) throw new Error("menu iPOS rỗng sau khi ánh xạ");
  const version = await sha(JSON.stringify(norm));
  const { data: cur } = await sb.from("menu_cache").select("version").eq("id", 1).maybeSingle();
  if (cur?.version === version) return { changed: false, version };
  const { error } = await sb.from("menu_cache").upsert({
    id: 1, version, data: norm, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("ghi menu_cache lỗi: " + error.message);
  return { changed: true, version, groups: norm.groups.length };
}

/* -------- Đồng bộ tồn/hết (tần suất cao) ---------------------------------- */
async function syncAvailability() {
  const raw = await iposGet("/availability");
  const rows = mapIposAvailability(raw);
  if (!rows.length) return { count: 0 };
  const stamped = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await sb.from("availability").upsert(stamped, { onConflict: "item_id" });
  if (error) throw new Error("ghi availability lỗi: " + error.message);
  return { count: rows.length };
}

const JOBS: Record<string, () => Promise<unknown>> = { menu: syncMenu, availability: syncAvailability };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const mode = new URL(req.url).searchParams.get("mode") ?? "all";
  const jobs = mode === "all" ? ["menu", "availability"] : [mode];
  const out: Record<string, unknown> = {};

  for (const job of jobs) {
    if (!JOBS[job]) { out[job] = { error: "mode không hợp lệ" }; continue; }
    try {
      out[job] = await JOBS[job]();
      await recordResult(job, true);
    } catch (e) {
      // stale-while-revalidate: KHÔNG ghi đè cache cũ → client vẫn dùng dữ liệu gần nhất
      const streak = await recordResult(job, false, String(e));
      out[job] = { error: String(e), failStreak: streak, servedStale: true };
    }
  }

  return new Response(JSON.stringify({ ts: Date.now(), ...out }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
