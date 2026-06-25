-- ============================================================================
--  Bunbun Burger — Schema Supabase (Postgres)
--  Chạy: Supabase Dashboard → SQL Editor → dán toàn bộ → Run
-- ============================================================================

-- 1) HỘI VIÊN (định danh theo SĐT Zalo)
create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  zalo_id     text unique,
  phone       text unique,                 -- đổi từ token ở backend, KHÔNG lưu ở client
  name        text,
  points      int  not null default 0,
  tier        text not null default 'Đồng',
  stamps      int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 2) ĐƠN HÀNG
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text unique not null,
  member_id     uuid references members(id) on delete set null,
  channel       text not null,             -- iPOS | GrabFood | ShopeeFood
  order_type    text not null,             -- table | take | ship
  table_or_addr text,
  total         int  not null default 0,
  status        text not null default 'pending',  -- pending | done | sent
  ipos_ref      text,                      -- mã hoá đơn iPOS (đối soát)
  created_at    timestamptz not null default now()
);

-- 3) DÒNG MÓN TRONG ĐƠN
create table if not exists order_lines (
  id          bigint generated always as identity primary key,
  order_id    uuid references orders(id) on delete cascade,
  item_id     text not null,
  name        text not null,
  addons      jsonb not null default '[]',
  note        text,
  unit_price  int  not null,
  qty         int  not null
);

-- 4) GIAO DỊCH ĐIỂM
create table if not exists point_txns (
  id            bigint generated always as identity primary key,
  member_id     uuid references members(id) on delete cascade,
  txn_type      text not null,             -- accrue | redeem | adjust
  amount        int  not null,
  ref_order_no  text,
  note          text,                      -- lý do khi cộng/trừ tay từ trang admin
  created_at    timestamptz not null default now()
);
-- an toàn cho project đã tạo bảng trước đó:
alter table point_txns add column if not exists note text;

-- 5) CACHE THỰC ĐƠN (đồng bộ từ iPOS — mục 7 SRS). 1 dòng duy nhất id=1
create table if not exists menu_cache (
  id          int primary key default 1,
  version     text not null default '0',
  data        jsonb not null default '{}', -- menu đã chuẩn hoá: { cats:[...], items:[...] }
  updated_at  timestamptz not null default now()
);

-- 6) TỒN/HẾT MÓN (cập nhật tần suất cao)
create table if not exists availability (
  item_id     text primary key,
  status      text not null default 'available',  -- available | low | soldout
  updated_at  timestamptz not null default now()
);

-- 7) TRẠNG THÁI ĐỒNG BỘ (Scheduled Function sync-menu) — đếm lỗi liên tiếp, đối soát
create table if not exists sync_state (
  job         text primary key,                   -- 'menu' | 'availability'
  fail_streak int  not null default 0,            -- số lần lỗi liên tiếp (≥3 → cảnh báo)
  last_ok_at  timestamptz,
  last_error  text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BẢO MẬT (Row Level Security)
--  • Bật RLS cho mọi bảng. Edge Functions dùng SERVICE_ROLE_KEY (bỏ qua RLS).
--  • Client (anon key) chỉ được ĐỌC menu & availability.
-- ---------------------------------------------------------------------------
alter table members      enable row level security;
alter table orders       enable row level security;
alter table order_lines  enable row level security;
alter table point_txns   enable row level security;
alter table menu_cache   enable row level security;
alter table availability enable row level security;
alter table sync_state   enable row level security;  -- chỉ Edge Functions (service role) ghi/đọc

-- Client được đọc menu + tồn kho
create policy "menu read"  on menu_cache   for select using (true);
create policy "avail read" on availability for select using (true);
-- Các bảng còn lại: không có policy cho anon → chỉ Edge Functions (service role) thao tác.
