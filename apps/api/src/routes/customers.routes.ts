import { Hono } from 'hono';
import { getDbClient } from '../db/client';
import { NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createCustomerSchema, updateCustomerSchema } from '../validators/schemas';

const customersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
customersRoutes.use('*', authMiddleware);

// In-Memory Fallback Store for Local Dev
let fallbackCustomers = [
  { id: 1, name: 'أحمد المحمود', phone: '0599123456', notes: 'زبون دائم', isActive: true, totalRemaining: 15000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: 'سارة خالد', phone: '0598765432', notes: 'محل السعادة', isActive: true, totalRemaining: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

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
  } catch (_err) {
    // Fallback in-memory
    const filtered = fallbackCustomers.filter((item) => item.name.includes(search) || (item.phone && item.phone.includes(search)));
    return c.json({ success: true, data: filtered, meta: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
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
    return c.json({ success: true, data: { id: Number(row.id), name: data.name, phone: data.phone || null, notes: data.notes || null, isActive: true, totalRemaining: 0, createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }, 201);
  } catch (_err) {
    const newCust = { id: fallbackCustomers.length + 1, name: data.name, phone: data.phone || null, notes: data.notes || null, isActive: true, totalRemaining: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackCustomers.unshift(newCust);
    return c.json({ success: true, data: newCust }, 201);
  }
});

export default customersRoutes;
