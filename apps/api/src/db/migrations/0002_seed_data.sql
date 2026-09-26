-- =============================================
-- MIGRATION 0002: Seed Data
-- =============================================

-- Default product units
INSERT INTO product_units (name_ar, name_en, symbol)
VALUES 
  ('كروز', 'Carton', 'CARTON'),
  ('حبة', 'Piece', 'PIECE'),
  ('علبة', 'Box', 'BOX'),
  ('كيلو', 'Kilogram', 'KG')
ON CONFLICT(symbol) DO NOTHING;

-- Default Categories (Sample categories for merchant setup)
INSERT INTO categories (name, is_active)
VALUES 
  ('سجائر ومشروبات', 1),
  ('مواد غذائية', 1),
  ('عام', 1);
