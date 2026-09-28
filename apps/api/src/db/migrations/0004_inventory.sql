-- MIGRATION 0004: Simple product availability and movement history
ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS stock_movements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  movement_type  TEXT NOT NULL CHECK (movement_type IN ('ADJUSTMENT', 'SALE', 'CANCELLATION')),
  quantity_delta INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  invoice_id     INTEGER REFERENCES invoices(id),
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
