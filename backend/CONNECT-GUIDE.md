# Kết nối DB + Backend (Supabase) — 7 bước

> Mục tiêu: có sẵn DB + 3 endpoint (`/menu`, `/availability`, `/crm-points`) để Mini App gọi.
> Phần anh tự làm: bước 1–2 (đăng ký, tạo project). Phần còn lại chạy lệnh là xong.

## 1. Tạo tài khoản & project  *(anh tự làm)*
- Vào **https://supabase.com** → đăng nhập (GitHub/email) → **New Project**.
- Đặt tên `bunbun`, chọn region gần VN (Singapore), đặt **Database Password** (lưu lại).

## 2. Lấy khóa  *(anh tự làm)*
- **Settings → API**: copy `Project URL`, `service_role` key, `anon` key.
- Dán vào file `.env` (sao từ `.env.example`).

## 3. Tạo bảng
- **SQL Editor** → dán toàn bộ `schema.sql` → **Run**.
- Kiểm tra **Table Editor**: thấy 7 bảng (members, orders, order_lines, point_txns, menu_cache, availability, sync_state).

## 4. Cài CLI & đăng nhập
```bash
npm i -g supabase
supabase login                       # mở trình duyệt, anh xác nhận
supabase link --project-ref <PROJECT_REF>   # REF nằm trong Project URL
```

## 5. Nạp biến môi trường cho Edge Functions
```bash
supabase secrets set --env-file ./backend/.env
```

## 6. Deploy endpoint + Scheduled Function
Đặt mỗi file vào `supabase/functions/<tên>/index.ts` rồi:
```bash
supabase functions deploy menu --no-verify-jwt
supabase functions deploy availability --no-verify-jwt
supabase functions deploy crm-points        # giữ verify-jwt nếu cần bảo vệ
supabase functions deploy menu-admin --no-verify-jwt    # admin tự quản menu/tồn-hết ($0)
supabase functions deploy members-admin --no-verify-jwt # admin xem/cộng-trừ điểm hội viên ($0)
supabase functions deploy sync-menu --no-verify-jwt     # TUỲ CHỌN: cron đồng bộ iPOS (Phase 2, trả phí)
```
Endpoint sẽ có dạng: `https://<ref>.functions.supabase.co/menu`

## 7. Nối vào Mini App
Trong `src/zalo-sdk.js` → `CONFIG.API_BASE` = `https://<ref>.functions.supabase.co`
- `GET {API_BASE}/menu` → đổ vào menu native (kèm ETag để cache).
- `GET {API_BASE}/availability` → cập nhật trạng thái còn/hết.
- `POST {API_BASE}/crm-points` → tích/đọc điểm theo SĐT.

---

## ✅ Vận hành MIỄN PHÍ (không mua API iPOS) — khuyến nghị
Toàn bộ hệ vẫn dùng iPOS để **đặt món + thanh toán** (qua Web Order webview, $0).
Menu, tồn/hết, tích điểm chạy trên Supabase free — **không cần Menu/CRM API trả phí**:

1. **Đặt `ADMIN_TOKEN`** trong `.env` (chuỗi ngẫu nhiên dài) → `supabase secrets set` lại.
2. **Deploy `menu-admin`** (đã có ở bước 6).
3. **Mở trang admin** `admin/index.html` (mở trực tiếp trên máy, hoặc up cùng Zalo CDN):
   - Điền **API base** + **Admin token** → bấm **Nạp menu mẫu Bunbun (39 món)**.
   - Sửa giá / thêm-xoá món / đặt **Tạm hết** → **Lưu lên Supabase** (ghi `menu_cache` + `availability`).
4. App tự kéo `GET /menu` + `/availability` → cập nhật trong vài phút. Xong.
5. **Tích điểm:** khách liên kết **mã hoá đơn iPOS** trong app → `POST /crm-points` (action `accrue`)
   lưu điểm vào bảng `members` của bạn (đổi SĐT qua Zalo Graph API — miễn phí). Điểm sống ở
   hệ của bạn, không cần iPOS CRM.
6. **Quản hội viên & đổi quà:** mở `admin/members.html` (cùng API base + token):
   xem điểm/hạng/tem từng khách, **cộng/trừ điểm** (đổi voucher ở quầy), **reset tem** khi
   tặng burger miễn phí, xem **lịch sử điểm**. Mọi thao tác ghi vào `point_txns` để đối soát.

> Cron `sync-menu` bên dưới CHỈ cần khi sau này bạn mua iPOS Menu API để tự động hoá — **không bắt buộc**.

## (Tuỳ chọn, Phase 2) Cron đồng bộ iPOS — Scheduled Function `sync-menu`
File `backend/functions/sync-menu.ts` kéo menu + tồn/hết từ **iPOS Menu API** →
ghi `menu_cache` (tăng `version` khi nội dung đổi) và `availability`.
- Cần env: `IPOS_API_BASE`, `IPOS_API_KEY` (trong `.env`, đã nạp ở bước 5).
- ⚠️ Hàm `mapIposMenu()` / `mapIposAvailability()` đang theo **giả định schema**;
  chỉnh lại khi iPOS cấp tài liệu API thật (đầu vào → khóa `{groups,...}` UI dùng).
- Đặt **2 lịch cron** (Dashboard → Database → **Cron Jobs**, hoặc pg_cron) gọi function:

```sql
-- bật extension (1 lần)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- menu: mỗi 12 phút (10–15')
select cron.schedule('sync-menu-full', '*/12 * * * *', $$
  select net.http_post(
    url:='https://<ref>.functions.supabase.co/sync-menu?mode=menu',
    headers:='{"Content-Type":"application/json"}'::jsonb) $$);

-- tồn/hết: mỗi 2 phút (1–2')
select cron.schedule('sync-menu-avail', '*/2 * * * *', $$
  select net.http_post(
    url:='https://<ref>.functions.supabase.co/sync-menu?mode=availability',
    headers:='{"Content-Type":"application/json"}'::jsonb) $$);
```
- **Chống lỗi:** iPOS lỗi → KHÔNG ghi đè cache (stale-while-revalidate), client vẫn
  nhận menu/tồn gần nhất. Lỗi ≥3 lần liên tiếp → log `[ALERT]` trong **Logs** +
  cột `sync_state.last_error` để soi nhanh.

## Lưu ý bảo mật
- `service_role` & `ZALO_APP_SECRET`: **chỉ** đặt ở Edge Functions/secrets, **không** đưa ra client.
- Client (Mini App) chỉ dùng `anon` key và chỉ đọc `/menu`, `/availability`.
- Không bao giờ giải mã token SĐT ở client — luôn đổi ở `/crm-points`.
