# Email gửi iPOS — xin quyền đối tác & tài liệu API
**Gửi tới:** support@ipos.vn (CC: người phụ trách kỹ thuật của Bunbun)
**Tiêu đề:** [Bunbun Burger] Đề nghị tích hợp Zalo Mini App với iPOS Web Order — xin quyền đối tác & tài liệu API

---

Kính gửi đội ngũ iPOS,

Chúng tôi là **Bunbun Burger** (thương hiệu burger Made in Huế), hiện đang sử dụng **iPOS Web Order** cho cửa hàng:

- Tên gian hàng: **BUNBUN BURGER CS1**
- pos_parent: **BRAND-QR4Q** · pos_id: **130726**
- Link: https://order.ipos.vn/menu?pos_parent=BRAND-QR4Q&pos_id=130726&source=DEFAULT

Chúng tôi đang xây dựng một **Zalo Mini App** cho thương hiệu và muốn tích hợp trực tiếp với iPOS để khách đặt món, thanh toán và tích điểm liền mạch. Mong iPOS hỗ trợ:

**1. Cấp quyền đối tác** cho thương hiệu Bunbun (tài khoản/khóa truy cập) để kết nối với hệ thống.

**2. Tài liệu API / Webhook**, cụ thể chúng tôi cần:
- **Menu API:** lấy danh mục, món, giá, topping/biến thể, trạng thái còn/hết để đồng bộ về Mini App.
- **Order API:** đẩy đơn từ Mini App vào POS tại quán (kèm loại đơn: tại bàn/mang về/giao; số bàn; ghi chú; topping).
- **Webhook trạng thái đơn:** đã nhận → đang chế biến → hoàn tất, để cập nhật cho khách và cộng điểm.
- **CRM / Hội viên API:** tra cứu, tích và đổi điểm theo **số điện thoại** (chúng tôi sẽ định danh khách qua số điện thoại Zalo đã xác thực).
- **Thanh toán:** các cổng iPOS đang hỗ trợ (VNPay/Momo/ZaloPay) và cách kích hoạt qua API.

**3. Câu hỏi kỹ thuật bổ sung:**
- Deep link gian hàng iPOS có hỗ trợ **truyền sẵn giỏ hàng** và **số bàn** qua tham số URL không?
- iPOS có sẵn **module/đối tác làm Zalo Mini App** không (chúng tôi thấy iPOS hỗ trợ kết nối Zalo ZCA/ZNS)?
- Mô hình tính phí cho việc dùng API/đối tác (nếu có).

Rất mong nhận phản hồi cùng tài liệu kỹ thuật và đầu mối phụ trách. Xin cảm ơn iPOS.

Trân trọng,
**[Họ tên] — [Chức vụ], Bunbun Burger**
**[SĐT] · [Email]**
