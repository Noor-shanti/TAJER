-- =============================================
-- MIGRATION 0002: Seed Data
-- =============================================

-- Default Merchant Account (username: merchant / password: password123)
INSERT INTO merchant (username, password_hash)
VALUES ('merchant', '$2a$10$xTeRFuwNaA5UBoU69MrO1uOEYX8vSxAa4kkvsFx2wexvg2aoYIW1G')
ON CONFLICT(username) DO NOTHING;

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
