# Bunbun Burger — Zalo Mini App

Zalo Mini App cho thương hiệu burger **Made in Huế**: đặt món qua **iPOS Web Order**, tích điểm, liên kết Zalo OA.

## Cấu trúc
```
bunbun-burger-zalo/
├── CLAUDE.md            # Ngữ cảnh dự án cho Claude Code (đọc đầu tiên)
├── prototype/           # Prototype 1 file HTML (nguồn chân lý UI/UX)
├── app/                 # Gói build Zalo Mini App (zmp-cli + zmp-sdk)
├── backend/             # Supabase: schema + Edge Functions + hướng dẫn nối
└── docs/                # Requirements (SRS), email iPOS, checklist xét duyệt
```

## Mở & làm tiếp trong Claude Code

1. **Cài Claude Code** (cần Node.js 18+):
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
   (Đừng dùng `sudo`. Nếu lỗi quyền, đặt npm prefix về thư mục cá nhân.)

2. **Mở thư mục dự án và khởi động:**
   ```bash
   cd bunbun-burger-zalo
   claude
   ```
   Lần đầu sẽ đăng nhập qua trình duyệt (tài khoản Claude Pro/Max hoặc API key).

3. Claude Code tự đọc **CLAUDE.md** → đã nắm toàn bộ bối cảnh, trạng thái và việc cần làm. Bắt đầu bằng một yêu cầu, ví dụ:
   - *"Nối menu prototype với Supabase backend theo TODO #5."*
   - *"Viết Supabase Scheduled Function đồng bộ menu iPOS theo mục 7 Requirements."*

## Mẹo dùng Claude Code
- Tham chiếu file bằng `@`: vd `@prototype/bunbun-miniapp.html`.
- `/clear` để reset ngữ cảnh; `/compact` để tóm tắt khi phiên dài.
- Khởi tạo lại context tự động: lệnh `/init` (nếu muốn Claude Code tự sinh CLAUDE.md — nhưng repo này đã có sẵn bản chi tiết).

## Xem nhanh prototype
Mở `prototype/bunbun-miniapp.html` bằng trình duyệt (không cần cài gì).
