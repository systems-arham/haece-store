-- 003-reports-fulfillment.sql
-- Run this in the Neon SQL editor AFTER db/schema.sql, db/seed.sql,
-- and db/migrations/002-admin-controls.sql.
--
-- Adds:
--  1. products.cost_cents ......... production cost per piece, set in /admin/products.
--  2. order_items.unit_cost_cents .. cost snapshot at sale time, so later edits
--                                   never rewrite past months' profit.
--  3. orders.tracking_number ..... shown to the client in Find Your Order.
--  4. orders.offer_code ........... private code used on the order, if any.
--  5. orders.discount_cents ....... discount given via the code (snapshot).
--  6. offer_codes ................. private client codes (percent off),
--                                   managed in /admin/offers.
--
-- Order statuses used by the admin (no constraint change needed):
--   pending_payment, paid (= confirmed), shipped, in_transit, delivered,
--   cancelled, expired, refunded.

-- 1. Production cost per piece.
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cents int;

-- 2. Cost snapshot on each sold unit.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost_cents int;

-- 3-5. Fulfillment + offer columns on orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents int NOT NULL DEFAULT 0;

-- 6. Private offer codes.
CREATE TABLE IF NOT EXISTS offer_codes (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  percent_off int NOT NULL CHECK (percent_off >= 1 AND percent_off <= 90),
  active boolean NOT NULL DEFAULT true,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  stripe_coupon_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_codes_code ON offer_codes(code);
