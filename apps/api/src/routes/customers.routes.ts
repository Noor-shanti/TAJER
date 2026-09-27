import { Hono } from 'hono';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import {
  fallbackCustomers,
  addFallbackAuditLog,
  getFallbackCustomerRemaining,
  getFallbackDebtSummary,
} from '../db/fallback.store';
import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';
import type { Env, Variables } from '../types/env.types';
import { createCustomerSchema, updateCustomerSchema } from '../validators/schemas';

const customersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
customersRoutes.use('*', authMiddleware);

function isNoDbConfigured(env: Env) {
  return shouldUseLocalFallback(env);
}

// GET /api/v1/customers
customersRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 20)));

  try {
    const db = getDbClient(c.env);
    const searchParam = search.trim();
    let whereClause = 'WHERE is_active = 1';
    const args: any[] = [];

    if (searchParam) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ?)';
      args.push(`%${searchParam}%`, `%${searchParam}%`);
    }

    const countResult = await db.execute({ sql: `SELECT COUNT(*) as total FROM customers ${whereClause}`, args });
    const total = Number(countResult.rows[0]?.total || 0);
    const offset = (page - 1) * limit;

    const result = await db.execute({
      sql: `
        SELECT c.*, COALESCE(SUM(i.remaining), 0) as total_remaining
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.payment_status != 'PAID' AND i.order_status != 'CANCELLED'
        ${whereClause} GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset],
    });

    const customers = result.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      phone: row.phone ? String(row.phone) : null,
      notes: row.notes ? String(row.notes) : null,
      isActive: Boolean(row.is_active),
      totalRemaining: Number(row.total_remaining),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));

    return c.json({ success: true, data: customers, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const filtered = fallbackCustomers
      .filter((item) => item.name.includes(search) || (item.phone && item.phone.includes(search)))
      .map((item) => ({ ...item, totalRemaining: getFallbackCustomerRemaining(item.id) }));
    return c.json({ success: true, data: filtered, meta: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
  }
});

// GET /api/v1/customers/summary/debts
customersRoutes.get('/summary/debts', async (c) => {
  try {
    const db = getDbClient(c.env);
    const result = await db.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN i.payment_status != 'PAID' AND i.order_status != 'CANCELLED' THEN i.remaining ELSE 0 END), 0) as total_remaining,
        COUNT(DISTINCT c.id) as active_customers,
        COUNT(DISTINCT CASE WHEN i.remaining > 0 AND i.payment_status != 'PAID' AND i.order_status != 'CANCELLED' THEN i.id END) as open_invoices
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      WHERE c.is_active = 1
    `);
    const row = result.rows[0];
    return c.json({
      success: true,
      data: {
        totalRemaining: Number(row?.total_remaining || 0),
        activeCustomers: Number(row?.active_customers || 0),
        openInvoices: Number(row?.open_invoices || 0),
      },
    });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    return c.json({ success: true, data: getFallbackDebtSummary() });
  }
});

// GET /api/v1/customers/:id
customersRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: `
        SELECT c.*, COALESCE(SUM(i.remaining), 0) as total_remaining
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.payment_status != 'PAID' AND i.order_status != 'CANCELLED'
        WHERE c.id = ? GROUP BY c.id
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      throw new NotFoundError('الزبون غير موجود');
    }

    const row = result.rows[0]!;
    return c.json({
      success: true,
      data: {
        id: Number(row.id),
        name: String(row.name),
        phone: row.phone ? String(row.phone) : null,
        notes: row.notes ? String(row.notes) : null,
        isActive: Boolean(row.is_active),
        totalRemaining: Number(row.total_remaining),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (!isNoDbConfigured(c.env)) throw err;
    const cust = fallbackCustomers.find((item) => item.id === id);
    if (!cust) throw new NotFoundError('الزبون غير موجود');
    return c.json({ success: true, data: { ...cust, totalRemaining: getFallbackCustomerRemaining(cust.id) } });
  }
});

// POST /api/v1/customers
customersRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createCustomerSchema.parse(body);

  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: 'INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?) RETURNING id, created_at, updated_at',
      args: [data.name, data.phone || null, data.notes || null],
    });
    const row = result.rows[0]!;
    await writeAuditLog(db, 'CUSTOMER', Number(row.id), 'CREATED', `تمت إضافة الزبون: ${data.name}`);
    return c.json({ success: true, data: { id: Number(row.id), name: data.name, phone: data.phone || null, notes: data.notes || null, isActive: true, totalRemaining: 0, createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }, 201);
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const newCust = { id: fallbackCustomers.length + 1, name: data.name, phone: data.phone || null, notes: data.notes || null, isActive: true, totalRemaining: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackCustomers.unshift(newCust);
    addFallbackAuditLog('CUSTOMER', newCust.id, 'CREATED', `تمت إضافة الزبون: ${data.name}`);
    return c.json({ success: true, data: newCust }, 201);
  }
});

// PATCH /api/v1/customers/:id
customersRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const data = updateCustomerSchema.parse(await c.req.json());
  if (Object.keys(data).length === 0) throw new BusinessRuleError('لا توجد بيانات لتعديلها');
  try {
    const db = getDbClient(c.env);
    const fields: string[] = [];
    const args: Array<string | number | null> = [];
    if (data.name !== undefined) { fields.push('name = ?'); args.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); args.push(data.phone); }
    if (data.notes !== undefined) { fields.push('notes = ?'); args.push(data.notes); }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); args.push(data.isActive ? 1 : 0); }
    args.push(id);
    const result = await db.execute({ sql: `UPDATE customers SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ? RETURNING id`, args });
    if (!result.rows[0]) throw new NotFoundError('الزبون غير موجود');
    await writeAuditLog(db, 'CUSTOMER', id, data.isActive === false ? 'ARCHIVED' : 'UPDATED', data.isActive === false ? 'تم إيقاف الزبون' : 'تم تعديل بيانات الزبون');
    return c.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || !isNoDbConfigured(c.env)) throw err;
    const customer = fallbackCustomers.find((item) => item.id === id);
    if (!customer) throw new NotFoundError('الزبون غير موجود');
    Object.assign(customer, data, { updatedAt: new Date().toISOString() });
    addFallbackAuditLog('CUSTOMER', id, data.isActive === false ? 'ARCHIVED' : 'UPDATED', data.isActive === false ? 'تم إيقاف الزبون' : 'تم تعديل بيانات الزبون');
    return c.json({ success: true, data: { id } });
  }
});

// DELETE /api/v1/customers/:id archives the customer to keep invoices and debts auditable.
customersRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({ sql: "UPDATE customers SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND is_active = 1 RETURNING id", args: [id] });
    if (!result.rows[0]) throw new NotFoundError('الزبون غير موجود أو متوقف');
    await writeAuditLog(db, 'CUSTOMER', id, 'ARCHIVED', 'تم إيقاف الزبون');
    return c.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || !isNoDbConfigured(c.env)) throw err;
    const customer = fallbackCustomers.find((item) => item.id === id && item.isActive);
    if (!customer) throw new NotFoundError('الزبون غير موجود أو متوقف');
    customer.isActive = false; customer.updatedAt = new Date().toISOString();
    addFallbackAuditLog('CUSTOMER', id, 'ARCHIVED', 'تم إيقاف الزبون');
    return c.json({ success: true, data: { id } });
  }
});

export default customersRoutes;
