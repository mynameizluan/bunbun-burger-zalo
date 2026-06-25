# CLAUDE.md — Bunbun Burger · Zalo Mini App

> File ngữ cảnh cho Claude Code. Đọc trước khi làm bất cứ việc gì trong repo này.
> Trao đổi với chủ dự án bằng **tiếng Việt**, súc tích, dựa trên dữ liệu, ưu tiên bảng/gạch đầu dòng.

## 1. Dự án là gì
Zalo Mini App cho **Bunbun Burger** — thương hiệu burger "Made in Huế" (TP. Huế). Khách **đặt món + tích điểm** ngay trong Zalo. Việc đặt món & thanh toán chạy trên **iPOS Web Order** sẵn có của quán; Mini App là lớp vỏ native (branding + tích điểm + OA).

## 2. Chủ dự án & phong cách
- Chủ dự án: **Luân** (Business Development). Giao tiếp tiếng Việt, ngắn gọn, solution-oriented.
- UI: cao cấp, mượt, **giữ cam rực #FF5A1F**. Font: **Plus Jakarta Sans** (tiêu đề) + **Be Vietnam Pro** (thân). Hạn chế emoji, dùng icon nét mảnh. KHÔNG quay lại phong cách "hoạt hình" (font Baloo, nhiều emoji).

## 3. Dữ liệu thương hiệu (định danh thật)
- Slogan "Made in Huế"; màu #FF5A1F; hotline **079 928 9889**; **39A Bến Nghé, P. Phú Hội, TP. Huế**.
- Gian hàng iPOS "BUNBUN BURGER CS1": `https://order.ipos.vn/menu?pos_parent=BRAND-QR4Q&pos_id=130726&source=DEFAULT`
- ShopeeFood: `https://shopeefood.vn/hue/bunbun-burger-39a-ben-nghe` · GrabFood: **placeholder, cần thay link thật**.

## 4. Kiến trúc (HYBRID, 2 giai đoạn)
- **Phase 1 (MVP hiện tại, zero-backend):** vỏ native (trang chủ, lướt menu, tích điểm, tài khoản, OA) + đặt món qua **iPOS Web Order (webview/handoff)** + tích điểm bằng **liên kết hoá đơn iPOS**. Hosting = **Zalo CDN**. Không cần DB.
- **Phase 1.5 (MIỄN PHÍ, khuyến nghị — KHÔNG mua API iPOS):** Supabase free làm menu/tồn-hết/điểm. Menu tự quản qua trang `admin/` (`menu-admin`); tồn-hết đặt tay; điểm lưu ở bảng `members` của bạn (đổi SĐT qua Zalo Graph API). Đặt món/thanh toán vẫn qua iPOS Web Order. → Lý do: API iPOS (Menu/CRM) trả phí, chỉ để TỰ ĐỘNG hoá; quán ~39 món không đáng.
- **Phase 2 (tuỳ chọn, trả phí):** **iPOS Menu/Order/CRM API + webhook** → tự đồng bộ menu (`sync-menu`), đẩy đơn native, cộng điểm chung sổ iPOS CRM. Cần iPOS cấp quyền đối tác (email `support@ipos.vn`).

## 5. Bản đồ repo
| Đường dẫn | Nội dung |
|---|---|
| `prototype/bunbun-miniapp.html` | **Prototype 1 file** (vanilla JS, state in-memory). Là nguồn chân lý UI/UX. |
| `app/` | Gói build Zalo Mini App: **`index.html`** (entry Vite/zmp — prototype đã gỡ khung `.phone`, đã nối SDK), `app-config.json`, `package.json`, `src/zalo-sdk.js` (tích hợp zmp-sdk), `README.md` (deploy + bảng wiring). |
| `backend/` | Supabase: `schema.sql` (7 bảng + RLS, có `sync_state`/`point_txns.note`), `functions/{menu,availability,crm-points,menu-admin,members-admin,sync-menu}.ts` (menu-admin/members-admin = tự quản $0; sync-menu = cron iPOS tuỳ chọn/trả phí), `.env.example`, `CONNECT-GUIDE.md`. |
| `admin/` | **`index.html`** (menu/tồn-hết) + **`members.html`** (hội viên: xem điểm/hạng/tem, cộng-trừ điểm, đổi quà, lịch sử) — $0, xác thực `ADMIN_TOKEN`, ghi Supabase qua `menu-admin`/`members-admin`. |
| `docs/` | `REQUIREMENTS.docx` (SRS v1.1, có mục 7 đặc tả đồng bộ menu), `DEPLOY-$0.md` (quickstart phát hành miễn phí — 1 trang), `EMAIL-iPOS.md`, `CHECKLIST-Zalo.md`. |

## 6. Tính năng prototype đã có
Onboarding + liên kết OA; menu (39 món/8 nhóm, ảnh thật); **tùy chọn món** (topping/ghi chú/số lượng); giỏ đa dòng; gợi ý món (upsell); checkout (tại bàn/mang về/giao); **handoff iPOS** + Grab/Shopee; tích điểm (điểm/hạng/tem/đổi quà, liên kết hoá đơn iPOS); **"Đơn hàng của tôi"** (chi tiết, badge kênh, trạng thái, **Đặt lại**).

## 7. Quy ước kỹ thuật
- Prototype là **1 file HTML tự chứa**. Kiểm cú pháp JS: trích `<script>` ra file rồi `node --check`.
- State **in-memory** (mất khi reload) — chỉ dùng cho Phase 1/demo.
- Tiền VND, định dạng "42.000đ". Điểm: **1.000đ = 1 điểm**.
- Giỏ là **mảng dòng**: mỗi tổ hợp topping/ghi chú = 1 dòng riêng.
- Đã sửa lỗi: ô ghi chú trong "Tùy chọn món" mất chữ khi re-render → dùng `syncNote()` đọc DOM trước khi vẽ lại. Giữ cơ chế này.

## 8. Trạng thái hiện tại
- ✅ Prototype hoàn chỉnh, demo-ready (UI cao cấp, cam rực, handoff iPOS, lịch sử đơn + đặt lại).
- ✅ Gói build + Requirements v1.1 + email iPOS + checklist.
- ✅ Backend Supabase (schema + 3 Edge Function) — **chưa deploy, chưa nối vào app**.
- ✅ **(Prompt 1+2)** Prototype → `app/index.html` (entry Vite/zmp): gỡ khung `.phone`, full màn hình trong `<div id="app">`, giữ 100% UI/tính năng; đã nối `app/src/zalo-sdk.js` qua `window.Zalo` (linkOA/getUser, mở iPOS, mở Grab/Shopee) + fallback mô phỏng. Chờ điền `OA_ID`/`GRAB_URL` rồi `zmp init/deploy`.
- ✅ **(Prompt 5)** Rà checklist Zalo: safe-area (viewport-fit + inset zbar), trang Chính sách riêng tư/Điều khoản trong app, không nút chết, empty state. Mục hồ sơ/OA/test máy thật là việc người.
- ✅ **(Prompt 3 — code-ready, chờ Supabase)** `index.html` có data-layer: `GET /menu` (ETag cache localStorage), `GET /availability` (trạng thái "Tạm hết"/"Sắp hết" chặn thêm giỏ), nhãn "Cập nhật lần cuối HH:MM", `POST /crm-points` (điểm), fallback cache/bundled khi API lỗi. Kích hoạt thật khi điền `CONFIG.API_BASE`.
- ✅ **(Prompt 4 — code-ready, chờ Supabase)** `backend/functions/sync-menu.ts`: Scheduled Function kéo menu/tồn iPOS → `menu_cache`(bump version)+`availability`; mode `menu` (~12') / `availability` (~2'); stale-while-revalidate + log `[ALERT]` khi lỗi ≥3 (bảng `sync_state`). Hàm `mapIpos*` theo giả định, chỉnh khi có API iPOS thật. **Đã hạ xuống TUỲ CHỌN** (chỉ khi mua API iPOS).
- ✅ **(Hướng $0 — không cần API iPOS)** `backend/functions/menu-admin.ts` (xác thực `ADMIN_TOKEN`) + trang `admin/index.html`: tự quản menu/giá/tồn-hết → ghi `menu_cache`+`availability`. Tích điểm: `claimIpos()` gọi `crm-points accrue` lưu điểm vào `members` (Supabase free). `sync-menu` thành tuỳ chọn.
- ✅ **(Admin hội viên $0)** `backend/functions/members-admin.ts` + `admin/members.html`: xem điểm/hạng/tem, cộng-trừ điểm (đổi voucher tại quầy), reset tem khi tặng burger, xem lịch sử (`point_txns`). Thêm cột `point_txns.note`.

## 9. Việc tiếp theo (TODO)
1. **[Người]** Đăng ký Zalo Developer; xác thực OA doanh nghiệp; lấy Mini App ID + OA ID.
2. **[Người]** Gửi `docs/EMAIL-iPOS.md` cho `support@ipos.vn` xin quyền API.
3. **[Người]** Tạo project Supabase; điền `.env`; chạy `backend/schema.sql`; deploy functions (theo `backend/CONNECT-GUIDE.md`).
4. ✅ **[Dev]** Chuyển prototype thành Mini App (`app/index.html`); nối `app/src/zalo-sdk.js`; bỏ khung `.phone` full màn hình. → còn lại bước người: `zmp login/init/deploy`, điền `OA_ID`/`GRAB_URL`.
5. ✅ **[Dev]** Nối menu/điểm với Supabase (data-layer trong `index.html`); "Tạm hết" + nhãn "Cập nhật lần cuối". → chờ người deploy Supabase + điền `API_BASE`.
6. ✅ **[Dev]** Scheduled Function `backend/functions/sync-menu.ts` đồng bộ menu iPOS → `menu_cache`+`availability`. → chờ người deploy + đặt cron + iPOS cấp API (chỉnh `mapIpos*`).
7. Test trên máy thật → nộp xét duyệt Zalo (`docs/CHECKLIST-Zalo.md`).

## 10. Ranh giới (chỉ con người làm)
Tạo tài khoản, nhập credentials/thẻ thanh toán, `zmp login`/`zmp deploy`, nộp xét duyệt Zalo, **gửi** email iPOS — đều cần danh tính của chủ dự án. Claude Code chuẩn bị sẵn code/cấu hình; không tự thực hiện các bước này.

## 11. Lệnh hữu ích
- Kiểm JS prototype: trích `<script>` → `node --check`.
- Supabase: `supabase login` / `link` / `secrets set --env-file ./backend/.env` / `functions deploy` (xem `backend/CONNECT-GUIDE.md`).
- Zalo: `zmp login` / `zmp init` / `zmp start` / `zmp deploy` (xem `app/README.md`).
