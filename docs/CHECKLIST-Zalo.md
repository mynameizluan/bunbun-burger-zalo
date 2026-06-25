# Checklist xét duyệt Zalo Mini App — Bunbun Burger

Bám checklist này để qua duyệt ngay lần đầu (các lỗi dưới là lý do bị từ chối phổ biến nhất).

## A. Hồ sơ & khai báo
- [ ] Tên Mini App đúng thương hiệu: **Bunbun Burger**.
- [ ] Logo & ảnh bìa rõ nét, đúng tỉ lệ, đúng nhận diện.
- [ ] Mô tả **đúng chức năng** (đặt món, tích điểm), không quảng cáo sai lệch.
- [ ] Thông tin liên hệ (hotline 079 928 9889, địa chỉ 39A Bến Nghé, Huế) đầy đủ, chính xác.
- [ ] Liên kết OA doanh nghiệp **đã xác thực**.
- [ ] Phân loại ngành nghề: Ẩm thực/F&B.

## B. Pháp lý & chính sách
- [ ] Có **Chính sách quyền riêng tư** và **Điều khoản sử dụng** (link hoặc trang trong app).
- [ ] Khi xin quyền (thông tin cá nhân, số điện thoại, vị trí) phải có **màn hình xin phép rõ ràng**, đúng mục đích.
- [ ] Không thu thập dữ liệu vượt nhu cầu; không gửi dữ liệu cá nhân qua URL.
- [ ] Không có nội dung nhạy cảm/vi phạm cộng đồng.

## C. Kỹ thuật & trải nghiệm
- [ ] Mọi nút **bấm được và hoạt động** (không nút chết).
- [ ] Không lỗi giao diện (chữ đè, ảnh vỡ, tràn khung) trên cả iOS & Android.
- [ ] **Tốc độ tải nhanh**; có trạng thái loading khi gọi mạng.
- [ ] Webview iPOS mở đúng gian hàng, quay lại Mini App mượt.
- [ ] Có xử lý **lỗi mạng / trạng thái rỗng** (giỏ trống, chưa có đơn…).
- [ ] Bỏ khung điện thoại demo `.phone`; nội dung **full màn hình**, an toàn vùng tai thỏ (safe-area).
- [ ] Dùng **SDK zmp mới nhất**, build bằng Vite, root `<div id="app">`.

## D. Luồng nghiệp vụ
- [ ] Đặt món → mở iPOS → hoàn tất được.
- [ ] Liên kết OA → nhận quyền lợi (điểm) hoạt động.
- [ ] Tích điểm / xem đơn hàng hiển thị đúng.
- [ ] Thông báo (ZNS qua OA) gửi được sau đặt đơn (nếu bật).

## E. Trước khi nộp
- [ ] Test trên **máy thật** qua bản Testing (quét QR).
- [ ] Chuẩn bị tài khoản/đơn mẫu để đội duyệt Zalo thử.
- [ ] Ảnh chụp màn hình các bước chính cho hồ sơ duyệt.

> Mẹo: lần nộp đầu nên để **luồng cốt lõi (đặt món + tích điểm)** thật mượt; tính năng phụ có thể bổ sung ở bản cập nhật sau khi đã được duyệt.
