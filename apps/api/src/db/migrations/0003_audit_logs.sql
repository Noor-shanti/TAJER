-- MIGRATION 0003: Merchant activity history
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT    NOT NULL CHECK (entity_type IN ('CUSTOMER', 'PRODUCT', 'INVOICE')),
  entity_id   INTEGER NOT NULL,
  action      TEXT    NOT NULL,
  description TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
