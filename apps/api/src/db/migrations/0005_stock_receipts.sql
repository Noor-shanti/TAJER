-- MIGRATION 0005: Add a dedicated stock receipt movement.
CREATE TABLE stock_movements_next (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  movement_type  TEXT NOT NULL CHECK (movement_type IN ('ADJUSTMENT', 'RECEIPT', 'SALE', 'CANCELLATION')),
  quantity_delta INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  invoice_id     INTEGER REFERENCES invoices(id),
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO stock_movements_next (id, product_id, movement_type, quantity_delta, balance_after, invoice_id, notes, created_at)
SELECT id, product_id, movement_type, quantity_delta, balance_after, invoice_id, notes, created_at FROM stock_movements;

DROP TABLE stock_movements;
ALTER TABLE stock_movements_next RENAME TO stock_movements;
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
