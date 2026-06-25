# DEPLOY-$0 — Phát hành Bunbun Mini App theo hướng MIỄN PHÍ

> Một trang gom đủ các bước để lên sóng **không tốn phí API iPOS**.
> iPOS vẫn lo **đặt món + thanh toán** (Web Order). Menu, tồn/hết, điểm chạy trên
> Supabase free + 2 trang admin. Chi tiết kỹ thuật: `backend/CONNECT-GUIDE.md`, `app/README.md`.

Ký hiệu: 🧑 = việc cần tài khoản/danh tính của bạn · 💻 = chạy lệnh là xong.

---

## 0) Cần chuẩn bị
- 🧑 Tài khoản **Supabase** (free) và **Zalo Developer** + **OA doanh nghiệp đã xác thực**.
- 💻 Cài công cụ: `npm i -g supabase zmp-cli` (cần Node LTS).
- Dữ liệu quán (đã có sẵn trong repo): hotline 079 928 9889 · 39A Bến Nghé, P. Phú Hội, TP. Huế · gian hàng iPOS, ShopeeFood. Còn thiếu: **link GrabFood thật**.

---

## 1) Backend Supabase (free)
1. 🧑 https://supabase.com → **New Project** `bunbun` (region Singapore), lưu mật khẩu DB.
2. 🧑 **Settings → API**: copy `Project URL`, `service_role`, `anon`.
3. 💻 Copy `backend/.env.example` → `backend/.env`, điền:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - `ZALO_APP_SECRET` (để đổi token SĐT → số thật)
   - `ADMIN_TOKEN` = **chuỗi ngẫu nhiên dài** (mật khẩu vào 2 trang admin)
   - *(IPOS_* để trống — chỉ cần nếu sau này mua API)*
4. 🧑 **SQL Editor** → dán toàn bộ `backend/schema.sql` → **Run** (tạo 7 bảng).
5. 💻 Đăng nhập & nạp secrets + deploy function:
   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase secrets set --env-file ./backend/.env
   # đặt mỗi file backend/functions/<tên>.ts vào supabase/functions/<tên>/index.ts rồi:
   supabase functions deploy menu --no-verify-jwt
   supabase functions deploy availability --no-verify-jwt
   supabase functions deploy crm-points
   supabase functions deploy menu-admin --no-verify-jwt
   supabase functions deploy members-admin --no-verify-jwt
   ```
   → API base: `https://<ref>.functions.supabase.co`

---

## 2) Nạp thực đơn (qua trang admin — không cần SQL)
1. Mở `admin/index.html` (mở thẳng trên máy là được).
2. Điền **API base** + **Admin token** → **Lưu cấu hình**.
3. Bấm **Nạp menu mẫu Bunbun (39 món)** → chỉnh giá/tên, dán **link ảnh** nếu có → **Lưu lên Supabase**.
4. Cần báo hết món: đặt **Tạm hết** ở dòng món → **Lưu**. App chặn thêm giỏ trong vài phút.

---

## 3) Mini App Zalo
1. 🧑 https://developers.zalo.me → tạo **Mini App** (lấy **Mini App ID**) + lấy **OA ID**.
2. 💻 Điền cấu hình:
   - `app/app-config.json` → `OA_ID` (2 chỗ `<<OA_ID_BUNBUN>>`)
   - `app/src/zalo-sdk.js` → `OA_ID`, `GRAB_URL`, `API_BASE` (= link Supabase ở bước 1)
3. 💻 Deploy:
   ```bash
   cd app
   zmp login
   zmp init        # nhập Mini App ID; chọn "Use ZMP to deploy only"
   zmp start       # xem trước
   zmp deploy      # bản Testing
   ```
4. 🧑 Quét **QR Testing** trên Zalo → test máy thật → nộp xét duyệt (bám `docs/CHECKLIST-Zalo.md`).

---

## 4) Vận hành hằng ngày ($0)
| Việc | Làm ở đâu |
|---|---|
| Đổi giá / thêm-xoá món | `admin/index.html` |
| Báo Tạm hết / Sắp hết | `admin/index.html` (dropdown trạng thái) |
| Xem điểm/hạng/tem của khách | `admin/members.html` |
| Khách đổi voucher → trừ điểm | `admin/members.html` → **Cộng/Trừ** (nhập số âm) |
| Khách đủ 10 tem → tặng burger | `admin/members.html` → **Đổi burger** (reset tem) |

Khách tích điểm: trong app, sau khi đặt qua iPOS → bấm **Liên kết hoá đơn iPOS** → điểm vào tài khoản (lưu ở Supabase của bạn).

---

## 5) Kiểm tra nhanh trước khi nộp duyệt
- [ ] Mở app: menu hiển thị, đổi giá ở admin → app cập nhật sau vài phút.
- [ ] Đặt 1 món → mở được gian hàng iPOS → quay lại app mượt.
- [ ] Đặt **Tạm hết** 1 món ở admin → app hiện "Tạm hết", không thêm được vào giỏ.
- [ ] Liên kết hoá đơn → điểm tăng; mở `admin/members.html` thấy hội viên + điểm.
- [ ] Trang **Chính sách quyền riêng tư** & **Điều khoản** mở được trong tab Tài khoản.
- [ ] Không nút chết; an toàn safe-area (tai thỏ) trên iOS.

---

## 6) Khi nào mới cần trả phí cho iPOS?
Chỉ khi muốn **tự động** đồng bộ menu/điểm với hệ iPOS (không nhập tay nữa):
mua iPOS Menu/CRM API → deploy thêm `sync-menu` + đặt cron (xem `CONNECT-GUIDE.md`).
Với quán ~39 món, **không bắt buộc**.

## Bảo mật
- `ADMIN_TOKEN`/`service_role`/`ZALO_APP_SECRET`: chỉ ở `.env`/secrets, **không** đưa ra app khách.
- 2 trang admin giữ token trong localStorage trình duyệt — đừng để lộ link kèm token.
