/* ============================================================================
 *  zalo-sdk.js — Lớp tích hợp Zalo Mini App cho Bunbun Burger
 *  ----------------------------------------------------------------------------
 *  Module này gói toàn bộ điểm chạm với hệ sinh thái Zalo + iPOS để phần UI
 *  (file bunbun-miniapp.html) chỉ cần gọi các hàm ở đây, không phụ thuộc SDK.
 *
 *  CÁCH DÙNG: dev thay các lời gọi "mô phỏng" trong UI bằng các hàm export
 *  dưới đây (xem WIRING-GUIDE trong README.md).
 *
 *  LƯU Ý API: tên hàm của zmp-sdk có thể đổi theo phiên bản. Trước khi build,
 *  đối chiếu với tài liệu chính thức: https://mini.zalo.me/documents/api/
 * ========================================================================== */

import {
  getUserInfo,
  getPhoneNumber,
  getAccessToken as zGetAccessToken,
  followOA,
  openWebview,
  openShareSheet,
  createOrder,        // ZaloPay (chỉ dùng nếu thanh toán trong Mini App)
  authorize,
} from "zmp-sdk/apis";

/* -------------------- CẤU HÌNH BUNBUN (điền giá trị thật) ----------------- */
export const CONFIG = {
  // TODO[OA_ID]: điền ID Zalo OA đã xác thực (cũng cập nhật trong app-config.json)
  OA_ID: "<<OA_ID_BUNBUN>>",
  IPOS_URL:
    "https://order.ipos.vn/menu?pos_parent=BRAND-QR4Q&pos_id=130726&source=DEFAULT",
  // TODO[GRAB_URL]: điền link gian hàng GrabFood thật của Bunbun
  GRAB_URL: "<<LINK_GIAN_HANG_GRABFOOD>>",
  SHOPEE_URL: "https://shopeefood.vn/hue/bunbun-burger-39a-ben-nghe",
  // Endpoint backend của bạn (nếu Phase 2 nối iPOS CRM/Order API qua server riêng)
  API_BASE: "<<HTTPS_BACKEND_BUNBUN>>",
};

const inZalo = typeof getUserInfo === "function"; // false khi chạy thử trên trình duyệt

/* -------------------- 1. ĐĂNG NHẬP & THÔNG TIN NGƯỜI DÙNG ---------------- */
export async function getUser() {
  if (!inZalo) return { id: "demo", name: "Luân (demo)" };
  const { userInfo } = await getUserInfo({ autoRequestPermission: true });
  return userInfo; // { id, name, avatar }
}

/* -------------------- 2. LIÊN KẾT / QUAN TÂM OA -------------------------- */
export async function linkOA() {
  if (!inZalo) return true; // demo: coi như đã quan tâm
  await authorize({ scopes: ["scope.userInfo"] });
  await followOA({ id: CONFIG.OA_ID });
  return true;
}

/* -------------------- 3. LẤY SỐ ĐIỆN THOẠI (định danh CRM) --------------- */
/* Trả về token; GỬI token này lên BACKEND để đổi ra SĐT thật qua Zalo Open API
   (KHÔNG giải mã ở client). SĐT dùng để gắn với hội viên iPOS CRM.            */
export async function getPhoneToken() {
  if (!inZalo) return "demo-phone-token";
  const { token } = await getPhoneNumber();
  return token;
}

/* Access token của phiên Zalo — backend cần để đổi phoneToken → SĐT (crm-points). */
export async function getAccessToken() {
  if (!inZalo) return "demo-access-token";
  return await zGetAccessToken();
}

/* -------------------- 4. MỞ GIAN HÀNG iPOS (đặt món) -------------------- */
export function openIposOrder() {
  if (!inZalo) { window.open(CONFIG.IPOS_URL, "_blank"); return; }
  openWebview({ url: CONFIG.IPOS_URL, config: { style: "bottomSheet", leftButton: "back" } });
}

export function openPartner(which) {
  const url = which === "grab" ? CONFIG.GRAB_URL : CONFIG.SHOPEE_URL;
  if (!inZalo) { window.open(url, "_blank"); return; }
  openWebview({ url });
}

/* -------------------- 5. CHIA SẺ MINI APP ------------------------------- */
export function shareApp() {
  if (!inZalo) return;
  openShareSheet({
    type: "zmp_deep_link",
    data: { title: "Bunbun Burger — Made in Huế", description: "Đặt món & tích điểm ngay trên Zalo" },
  });
}

/* -------------------- 6. (TÙY CHỌN) THANH TOÁN ZALOPAY ------------------ */
/* Chỉ dùng khi thanh toán TRONG Mini App. Phase 1 để iPOS xử lý thanh toán. */
export async function payZaloPay(amount, desc) {
  if (!inZalo) return { ok: true, demo: true };
  // orderId/mac phải tạo phía BACKEND (ký số) rồi truyền sang — KHÔNG ký ở client
  const res = await fetch(`${CONFIG.API_BASE}/zalopay/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, desc }),
  }).then((r) => r.json());
  return createOrder({ desc, item: [], amount, ...res });
}

/* -------------------- 7. (PHASE 2) TÍCH ĐIỂM QUA iPOS CRM --------------- */
/* Sau khi có quyền đối tác iPOS, backend gọi iPOS CRM API để cộng/đổi điểm.  */
export async function getMemberPoints(phoneToken) {
  if (!inZalo) return { points: 0, tier: "Đồng" };
  return fetch(`${CONFIG.API_BASE}/crm/points`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneToken }),
  }).then((r) => r.json());
}
