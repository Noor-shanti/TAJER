# Database Architecture & Schema Documentation

## Database Engine
- **Engine:** Turso / libSQL (SQLite compatible)
- **Deployment:** Cloudflare Workers connects via `@libsql/client` HTTP protocol
- **Migrations:** Sequential SQL migration files located in `apps/api/src/db/migrations/`

---

## Data Representations & Conventions

### 1. Financial Amounts (Money Strategy)
- All monetary fields (`current_price`, `subtotal`, `total`, `amount_paid`, `remaining`, `line_subtotal`, `line_total`, `amount`) are stored as **INTEGER in minor units (Agorot / Cents)**.
- **Scale Factor:** `1 ILS = 100 minor units` (`MONEY_SCALE = 100`).
- **Example:**
  - `74.00 ILS` = `7400`
  - `0.50 ILS` = `50`
  - `10.25 ILS` = `1025`

### 2. Quantities (Quantity Strategy)
- All quantity fields are stored as **INTEGER in minor units** to support decimal/fractional quantities safely without floating-point precision issues.
- **Scale Factor:** `1 Unit = 1000 minor quantity units` (`QUANTITY_SCALE = 1000`).
- **Example:**
  - `1 Carton` = `1000`
  - `0.5 Carton` = `500`
  - `1.5 Cartons` = `1500`
  - `2.25 Cartons` = `2250`

### 3. Historical Invoice Snapshots
- Invoices store snapshots of product metadata inside `invoice_items` (`product_name_snapshot`, `unit_name_snapshot`, `unit_price`).
- If a merchant updates a product name or unit price in the catalog, **historical invoices remain completely unmodified and accurate**.

---

## Schema Overview

### Tables Overview
1. **`merchant`**: Single merchant user credentials and profile.
2. **`categories`**: Product categories.
3. **`product_units`**: Measurable units (e.g., كروز, حبة).
4. **`products`**: Item catalog.
5. **`customers`**: Customer contacts and notes.
6. **`invoices`**: Financial sales invoices header.
7. **`invoice_items`**: Detailed line items per invoice.
8. **`payments`**: Audit log of payments against invoices.

---

## Migration Strategy
Migrations must be run in order:
1. `0001_initial_schema.sql`
2. `0002_seed_data.sql`
