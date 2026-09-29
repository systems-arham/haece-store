-- Haece seed: brand, collections, 6 products, variants (XS-XXL), 300 serialized units each
-- Run after schema: psql $DATABASE_URL -f db/seed.sql

INSERT INTO brands (name, slug) VALUES ('Haece', 'haece') ON CONFLICT (slug) DO NOTHING;

INSERT INTO collections (brand_id, code, name, season, visible) VALUES
  ((SELECT id FROM brands WHERE slug='haece'), 'FW26', 'Drop 01', 'Fall / Winter 2026', true),
  ((SELECT id FROM brands WHERE slug='haece'), 'SS27', 'Drop 02', 'Summer 2027', false)
ON CONFLICT DO NOTHING;

-- Products (Drop 01)
INSERT INTO products (collection_id, code, name, slug, tagline, description, details, price_cents, image, gallery, visible, sort) VALUES
  ((SELECT id FROM collections WHERE code='FW26'), 'FCT', 'The Founder Coat', 'founder-coat',
   'The defining piece',
   'Our defining piece. A heavyweight hoodie cut with the discipline of tailoring: boxy through the body, finished with barrel cuffs and buttons. One embroidered mark, nothing else.',
   '["Boxy, considered silhouette","Tailored barrel cuffs with buttons","Single embroidered mark at the chest","Heavyweight brushed fleece","HAECE woven neck label"]',
   19500, '/images/founder-coat.png',
   '["/images/founder-coat.png","/images/embroidery-macro.jpg","/images/cuff-detail.png"]',
   true, 1),
  ((SELECT id FROM collections WHERE code='FW26'), 'AVM', 'The Atlas Vest', 'atlas-vest-mens',
   'Straight cut',
   'A straight cut vest for layering with intent. Clean lines, considered weight, the embroidered mark at the chest.',
   '["Straight, clean cut","Single embroidered mark at the chest","Midweight technical knit","HAECE woven neck label"]',
   11000, '/images/atlas-vest-mens.png',
   '["/images/atlas-vest-mens.png"]',
   true, 2),
  ((SELECT id FROM collections WHERE code='FW26'), 'AVW', 'The Atlas Vest', 'atlas-vest-womens',
   'Tailored fit',
   'The Atlas Vest, tailored for a closer fit. Same discipline, cut for her.',
   '["Tailored fit","Single embroidered mark at the chest","Midweight technical knit","HAECE woven neck label"]',
   11000, '/images/atlas-vest-womens.png',
   '["/images/atlas-vest-womens.png"]',
   true, 3),
  ((SELECT id FROM collections WHERE code='FW26'), 'ONL', 'Onyx Layer', 'onyx-layer',
   'Band collar, hidden placket',
   'The layer between. A band collar, hidden placket, and short sleeve in our signature black. Wears alone or under the coat.',
   '["Band collar","Hidden placket","Short sleeve","Single embroidered mark at the chest","HAECE woven neck label"]',
   13500, '/images/onyx-layer.jpg',
   '["/images/onyx-layer.jpg"]',
   true, 4);

-- Products (Drop 02, hidden until launch)
INSERT INTO products (collection_id, code, name, slug, tagline, description, details, price_cents, image, gallery, visible, sort) VALUES
  ((SELECT id FROM collections WHERE code='SS27'), 'UNT', 'The Uniform Tee', 'uniform-tee',
   'Relaxed fit',
   'The everyday uniform. Relaxed fit, heavyweight cotton, one embroidered mark. The entry point to the house.',
   '["Relaxed fit","Heavyweight cotton","Single embroidered mark at the chest","HAECE woven neck label"]',
   6500, '/images/uniform-tee.png',
   '["/images/uniform-tee.png"]',
   true, 1),
  ((SELECT id FROM collections WHERE code='SS27'), 'PLT', 'The Pleated Trouser', 'pleated-trouser',
   'Wide leg',
   'Wide leg, sharp pleat, tailored waistband. Trousers that move like they mean it.',
   '["Wide leg","Sharp front pleat","Tailored waistband","HAECE woven label"]',
   15000, '/images/pleated-trouser.png',
   '["/images/pleated-trouser.png"]',
   true, 2)
ON CONFLICT (slug) DO NOTHING;

-- Variants: XS-XXL for every product. SKU = HAE-{COLLECTION}-{CODE}-BLK-{SIZE}
WITH sizes(size, sort_order) AS (
  VALUES ('XS',1),('S',2),('M',3),('L',4),('XL',5),('XXL',6)
)
INSERT INTO variants (product_id, sku, size, color, sort_order)
SELECT p.id,
       'HAE-' || c.code || '-' || p.code || '-BLK-' || s.size,
       s.size, 'Black', s.sort_order
FROM products p
JOIN collections c ON c.id = p.collection_id
CROSS JOIN sizes s
ON CONFLICT (sku) DO NOTHING;

-- Serialized inventory: 300 numbered units per variant (edition of 300)
INSERT INTO inventory_units (variant_id, unit_code, edition_number, status)
SELECT v.id, v.sku || '-' || lpad(g::text, 4, '0'), g, 'in_stock'
FROM variants v
CROSS JOIN generate_series(1, 300) g
ON CONFLICT (unit_code) DO NOTHING;

-- Site content defaults
INSERT INTO site_content (key, value) VALUES
  ('hero_caption', 'Fall / Winter 2026'),
  ('announcement', ''),
  ('drop02_visible', 'false'),
  ('contact_email', 'care@haece.com'),
  ('shipping_note', 'Complimentary shipping over $200. Duties included worldwide.'),
  ('free_ship_threshold_cents', '20000'),
  ('flat_ship_cents', '1200')
ON CONFLICT (key) DO NOTHING;
