-- 004-preorders.sql
-- Run this in the Neon SQL editor AFTER db/migrations/003-reports-fulfillment.sql.
--
-- Adds per-product pre-order control, managed in /admin/products:
--  1. products.preorder ...... when true, the product page shows a Pre-order
--                             badge and the note below, and the Add to bag
--                             button reads "Pre-order".
--  2. products.preorder_note . e.g. "Shipping November 1". Shown under the
--                             badge. Empty hides the line.

ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder_note text;
