-- 002-admin-controls.sql
-- Run this in the Neon SQL editor AFTER db/schema.sql and db/seed.sql.
-- Adds: a 'discontinued' unit status (for sizes never manufactured)
-- and a product_images table (photography managed from /admin).

-- 1. Allow the 'discontinued' status on inventory units.
ALTER TABLE inventory_units DROP CONSTRAINT IF EXISTS inventory_units_status_check;
ALTER TABLE inventory_units ADD CONSTRAINT inventory_units_status_check
  CHECK (status IN ('in_stock','reserved','sold','discontinued'));

-- 2. Product photography. Images are stored in the database because
-- Netlify's runtime filesystem is ephemeral, so files uploaded to
-- public/ at runtime would not persist. Served via /api/product-image/[id].
CREATE TABLE IF NOT EXISTS product_images (
  id serial PRIMARY KEY,
  product_id int NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'main' CHECK (kind IN ('main','gallery')),
  mime text NOT NULL,
  data bytea NOT NULL,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, kind, sort);
