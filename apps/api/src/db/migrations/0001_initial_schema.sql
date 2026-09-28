-- =============================================
-- MIGRATION 0001: Initial Schema
-- =============================================

-- Merchant (single merchant account)
CREATE TABLE IF NOT EXISTS merchant (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Product Units
CREATE TABLE IF NOT EXISTS product_units (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ar     TEXT    NOT NULL,         -- كروز / حبة
  name_en     TEXT    NOT NULL,         -- Carton / Piece
  symbol      TEXT    NOT NULL UNIQUE,  -- CARTON / PIECE
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  unit_id       INTEGER NOT NULL REFERENCES product_units(id),
  name          TEXT    NOT NULL,
  current_price INTEGER NOT NULL CHECK (current_price >= 0), -- Minor units (agorot / cents)
  stock_quantity INTEGER NOT NULL DEFAULT 0, -- Scale factor 1000, supports 0.5 carton
  reorder_level  INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  phone       TEXT,
  notes       TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number    TEXT    NOT NULL UNIQUE,
  customer_id       INTEGER NOT NULL REFERENCES customers(id),
  
  subtotal          INTEGER NOT NULL CHECK (subtotal >= 0),
  discount_type     TEXT    NOT NULL DEFAULT 'NONE' CHECK (discount_type IN ('NONE', 'FIXED', 'PERCENTAGE')),
  discount_value    INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  total             INTEGER NOT NULL CHECK (total >= 0),
  amount_paid       INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  remaining         INTEGER NOT NULL DEFAULT 0,
  
  payment_status    TEXT    NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
  order_status      TEXT    NOT NULL DEFAULT 'CONFIRMED' CHECK (order_status IN ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  
  notes             TEXT,
  idempotency_key   TEXT    UNIQUE,
  
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_order_status ON invoices(order_status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Invoice Items (historical snapshots)
CREATE TABLE IF NOT EXISTS invoice_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id            INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id            INTEGER REFERENCES products(id) ON DELETE SET NULL,
  
  product_name_snapshot TEXT    NOT NULL,
  unit_name_snapshot    TEXT    NOT NULL,
  
  unit_price            INTEGER NOT NULL CHECK (unit_price >= 0),
  discount_type         TEXT    NOT NULL DEFAULT 'NONE' CHECK (discount_type IN ('NONE', 'FIXED', 'PERCENTAGE')),
  discount_value        INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  line_subtotal         INTEGER NOT NULL CHECK (line_subtotal >= 0),
  line_total            INTEGER NOT NULL CHECK (line_total >= 0),
  
  quantity              INTEGER NOT NULL CHECK (quantity > 0), -- Scale factor 1000 (0.5 => 500)
  
  created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id      INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  payment_method  TEXT    NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'TRANSFER', 'OTHER')),
  notes           TEXT,
  idempotency_key TEXT    UNIQUE,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
