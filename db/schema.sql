-- Haece store schema (Neon Postgres)
-- Run once: psql $DATABASE_URL -f db/schema.sql

CREATE TABLE IF NOT EXISTS brands (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collections (
  id serial PRIMARY KEY,
  brand_id int REFERENCES brands(id),
  code text NOT NULL,
  name text NOT NULL,
  season text,
  visible boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  collection_id int REFERENCES collections(id),
  code text NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text,
  description text,
  details jsonb DEFAULT '[]',
  price_cents int NOT NULL,
  cost_cents int,
  image text,
  gallery jsonb DEFAULT '[]',
  visible boolean DEFAULT true,
  sort int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS variants (
  id serial PRIMARY KEY,
  product_id int REFERENCES products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  size text NOT NULL,
  color text DEFAULT 'Black',
  sort_order int DEFAULT 0,
  visible boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS inventory_units (
  id serial PRIMARY KEY,
  variant_id int REFERENCES variants(id) ON DELETE CASCADE,
  unit_code text UNIQUE NOT NULL,
  edition_number int NOT NULL,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','reserved','sold')),
  reserved_until timestamptz,
  order_id int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  customer_id int REFERENCES customers(id),
  email text,
  name text,
  status text NOT NULL DEFAULT 'pending_payment',
  subtotal_cents int NOT NULL,
  shipping_cents int NOT NULL DEFAULT 0,
  total_cents int NOT NULL,
  currency text DEFAULT 'usd',
  stripe_session_id text,
  shipping_address jsonb,
  tracking_number text,
  offer_code text,
  discount_cents int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id int REFERENCES orders(id) ON DELETE CASCADE,
  variant_id int REFERENCES variants(id),
  unit_id int REFERENCES inventory_units(id),
  product_name text NOT NULL,
  sku text NOT NULL,
  size text NOT NULL,
  price_cents int NOT NULL,
  unit_cost_cents int
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id serial PRIMARY KEY,
  unit_id int REFERENCES inventory_units(id),
  from_status text,
  to_status text,
  order_id int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_content (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

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

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE INDEX IF NOT EXISTS idx_units_variant_status ON inventory_units(variant_id, status);
CREATE INDEX IF NOT EXISTS idx_units_order ON inventory_units(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(stripe_session_id);
