# Bunbun Burger — Zalo Mini App (gói build)

Gói này biến prototype `bunbun-miniapp.html` thành **Zalo Mini App thật**, theo
hướng **Webview/handoff với iPOS** (Phase 1 — nhanh, không cần backend riêng).

> ⚠️ Những việc CHỈ anh/dev làm được (gắn với tài khoản & pháp nhân của anh):
> đăng ký Zalo Developer, xác thực OA doanh nghiệp, đăng nhập `zmp login`,
> `zmp deploy`, và nộp xét duyệt. Mã + cấu hình bên dưới đã sẵn sàng để cắm vào.

> ✅ **Đã làm (Prompt 1+2):** prototype đã được chuyển thành `index.html` (entry
> của Vite/zmp) — bỏ khung điện thoại `.phone`, nội dung chiếm full màn hình
> trong root `<div id="app">`, giữ nguyên 100% tính năng/giao diện. UI đã được
> nối với `src/zalo-sdk.js` qua cầu nối `window.Zalo` (xem mục 3). Còn lại: điền
> `OA_ID` + `GRAB_URL` (đánh dấu `TODO[OA_ID]`/`TODO[GRAB_URL]`), rồi `zmp init/deploy`.

---

## Định danh dự án (đã có)
| Khóa | Giá trị | Dùng ở |
|---|---|---|
| **Mini App ID** | `2519356415006132161` | nhập khi `zmp init` |
| **OA ID** | `1583148066946026012` | `app-config.json`, `src/zalo-sdk.js` (đã điền) |
| **GrabFood URL** | đã điền (`GRAB_URL`) | `src/zalo-sdk.js` |
| **API_BASE** | ⏳ chờ deploy Supabase | `src/zalo-sdk.js` |

---

## 0) Chuẩn bị (1 lần)
1. Tạo tài khoản tại **https://developers.zalo.me** → tạo **Zalo App** → **Tạo Mini App** → lấy **Mini App ID**.
2. Xác thực **OA doanh nghiệp Bunbun** (cần để bật OA, ZNS, lấy số điện thoại) → lấy **OA ID**.
3. Cài Node.js LTS, rồi cài CLI: `npm i -g zmp-cli`.

## 1) Khởi tạo dự án
```bash
# trong thư mục này
zmp login                # đăng nhập tài khoản Zalo Developer của anh
zmp init                 # nhập Mini App ID; chọn "Use ZMP to deploy only"
```

## 2) Điền cấu hình
- `app-config.json` → thay `<<OA_ID_BUNBUN>>`.
- `src/zalo-sdk.js` → thay `OA_ID`, `GRAB_URL`, (và `API_BASE` nếu làm Phase 2).
- `IPOS_URL`, `SHOPEE_URL` đã điền sẵn theo dữ liệu thật của quán.

## 3) Nối UI với SDK (WIRING-GUIDE) — ✅ đã triển khai trong `index.html`
Cuối `index.html` có bootstrap `<script type="module">` nạp `src/zalo-sdk.js` và
gắn vào `window.Zalo`. Script UI gọi qua các hàm cầu nối có **fallback mô phỏng**
(để vẫn chạy được khi test trên trình duyệt thường, lúc đó `window.Zalo` undefined):

| Điểm chạm | Trạng thái | Triển khai trong `index.html` |
|---|---|---|
| Onboarding `linkOA()` | ✅ | `await window.Zalo.linkOA()` → `getUser()` → `applyUserName()` |
| Mở iPOS | ✅ | `zaloOpenIpos()` → `window.Zalo.openIposOrder()` (fallback `window.open`) |
| Mở Grab/Shopee | ✅ | `zaloOpenPartner(which)` → `window.Zalo.openPartner(...)` |
| Tích điểm | ⏳ Phase 2 | `Zalo.getPhoneToken()` → backend → `Zalo.getMemberPoints()` (iPOS CRM) |
| Thanh toán | ⏳ | Phase 1: iPOS xử lý trên trang order. Phase 2 (tùy chọn): `Zalo.payZaloPay()` |

> Khung điện thoại `.phone` đã được gỡ; nội dung nằm trong root `<div id="app">`
> chiếm full màn hình. Nguồn chân lý UI gốc vẫn ở `prototype/bunbun-miniapp.html`.

## 4) Chạy thử & deploy
```bash
zmp start                # xem trước (browser hoặc Device mode bằng QR trong app Zalo)
zmp deploy               # đưa lên bản Testing
```
Vào **Zalo → quét QR Testing** để thử trên máy thật trước khi nộp duyệt.

## 5) Nộp xét duyệt
Trên Zalo Developer → gửi bản review. Bám `CHECKLIST-Zalo.md` để qua duyệt lần đầu.

---

## Lộ trình tích hợp
- **Phase 1 (gói này):** đặt món + thanh toán chạy trên iPOS Web Order; OA + thông báo qua Zalo; tích điểm theo cơ chế liên kết hoá đơn.
- **Phase 2:** xin iPOS mở **Order/Menu/CRM API + webhook** (email `support@ipos.vn`) → menu tự đồng bộ, đẩy đơn native, tích điểm tự động qua iPOS CRM. Xem `REQUIREMENTS.docx` + `EMAIL-iPOS.md`.

## Phụ thuộc kỹ thuật
- Zalo Mini App ID hợp lệ, SDK `zmp-sdk` bản mới nhất, build bằng **Vite**.
- Root DOM node là `<div id="app">`.
- Tài liệu API: https://mini.zalo.me/documents/api/
