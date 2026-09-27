import { createClient } from '@libsql/client';

async function runMigrations() {
  console.log('⚡ Running local database migrations...');

  const db = createClient({
    url: 'file:local.db',
  });

  // 1. Initial Schema
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS merchant (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_units (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar     TEXT    NOT NULL,
      name_en     TEXT    NOT NULL,
      symbol      TEXT    NOT NULL UNIQUE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      unit_id       INTEGER NOT NULL REFERENCES product_units(id),
      name          TEXT    NOT NULL,
      current_price INTEGER NOT NULL CHECK (current_price >= 0),
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT,
      notes       TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number    TEXT    NOT NULL UNIQUE,
      customer_id       INTEGER NOT NULL REFERENCES customers(id),
      subtotal          INTEGER NOT NULL CHECK (subtotal >= 0),
      discount_type     TEXT    NOT NULL DEFAULT 'NONE',
      discount_value    INTEGER NOT NULL DEFAULT 0,
      total             INTEGER NOT NULL CHECK (total >= 0),
      amount_paid       INTEGER NOT NULL DEFAULT 0,
      remaining         INTEGER NOT NULL DEFAULT 0,
      payment_status    TEXT    NOT NULL DEFAULT 'UNPAID',
      order_status      TEXT    NOT NULL DEFAULT 'CONFIRMED',
      notes             TEXT,
      idempotency_key   TEXT    UNIQUE,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id            INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id            INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name_snapshot TEXT    NOT NULL,
      unit_name_snapshot    TEXT    NOT NULL,
      unit_price            INTEGER NOT NULL CHECK (unit_price >= 0),
      discount_type         TEXT    NOT NULL DEFAULT 'NONE',
      discount_value        INTEGER NOT NULL DEFAULT 0,
      line_subtotal         INTEGER NOT NULL CHECK (line_subtotal >= 0),
      line_total            INTEGER NOT NULL CHECK (line_total >= 0),
      quantity              INTEGER NOT NULL CHECK (quantity > 0),
      created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id      INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount          INTEGER NOT NULL CHECK (amount > 0),
      payment_method  TEXT    NOT NULL DEFAULT 'CASH',
      notes           TEXT,
      idempotency_key TEXT    UNIQUE,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Seed Default Merchant & Data
  await db.execute({
    sql: `
      INSERT INTO merchant (username, password_hash)
      VALUES ('merchant', '$2a$10$xTeRFuwNaA5UBoU69MrO1uOEYX8vSxAa4kkvsFx2wexvg2aoYIW1G')
      ON CONFLICT(username) DO NOTHING;
    `,
    args: [],
  });

  await db.executeMultiple(`
    INSERT INTO product_units (name_ar, name_en, symbol)
    VALUES 
      ('كروز', 'Carton', 'CARTON'),
      ('حبة', 'Piece', 'PIECE'),
      ('علبة', 'Box', 'BOX'),
      ('كيلو', 'Kilogram', 'KG')
    ON CONFLICT(symbol) DO NOTHING;

    INSERT INTO categories (name, is_active)
    VALUES 
      ('سجائر ومشروبات', 1),
      ('مواد غذائية', 1),
      ('عام', 1);
  `);

  console.log('✅ Local SQLite database initialized successfully!');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
});
