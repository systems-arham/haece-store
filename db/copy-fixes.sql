-- copy-fixes.sql
-- Run this in the Neon SQL editor AFTER db/migrations/003-reports-fulfillment.sql.
-- (Order does not strictly matter; this file only updates product copy.)
--
-- What it does:
--  1. Onyx Layer page rewrite, using the draft from the later checklist
--     (2026-09-30). Review the text below before running; edit freely.
--     NOTE: the image swap to the full-sleeve visual is NOT included here,
--     it needs your approval of the image first.
--  2. Atlas Vest (men's + women's): "Midweight technical knit" reads
--     synthetic. Locked spec is 300 GSM brushed-back fleece, 100% cotton.
--
-- Safe to run more than once.

-- 1. Onyx Layer (slug: onyx-layer)
UPDATE products
SET tagline = 'Full sleeve, band collar, hidden placket',
    description = 'The overlayer. A band collar, hidden placket, and full sleeves cut to sit over everything beneath. Garment-washed cotton twill in our signature black.',
    details = '["Band collar","Hidden placket","Full sleeves","220 GSM garment-washed cotton twill","Single embroidered mark at the chest","HAECE woven neck label"]'::jsonb
WHERE slug = 'onyx-layer';

-- 2. Atlas Vests (slugs: atlas-vest-mens, atlas-vest-womens)
UPDATE products
SET details = replace(details::text, 'Midweight technical knit', '300 GSM brushed-back fleece')::jsonb
WHERE slug IN ('atlas-vest-mens', 'atlas-vest-womens')
  AND details::text LIKE '%Midweight technical knit%';

-- Verify:
-- SELECT slug, tagline, description, details FROM products
-- WHERE slug IN ('onyx-layer', 'atlas-vest-mens', 'atlas-vest-womens');
