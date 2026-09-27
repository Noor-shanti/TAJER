import { Hono } from 'hono';
import { getDbClient } from '../db/client';
import { NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createCustomerSchema, updateCustomerSchema } from '../validators/schemas';

const customersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
customersRoutes.use('*', authMiddleware);

// GET /api/v1/customers (Paginated & Searchable)
customersRoutes.get('/', async (c) => {
  const db = getDbClient(c.env);
  const search = c.req.query('search') || '';
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 20)));
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE is_active = 1';
  const args: any[] = [];

  if (search.trim()) {
    whereClause += ' AND (name LIKE ? OR phone LIKE ?)';
    args.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM customers ${whereClause}`,
    args,
  });
  const total = Number(countResult.rows[0]?.total || 0);

  const queryArgs = [...args, limit, offset];
  const result = await db.execute({
    sql: `
      SELECT 
        c.*,
        COALESCE(SUM(i.remaining), 0) as total_remaining
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND i.payment_status != 'PAID' AND i.order_status != 'CANCELLED'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: queryArgs,
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

  return c.json({
    success: true,
    data: customers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/v1/customers/:id
customersRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: `
      SELECT 
        c.*,
        COALESCE(SUM(i.remaining), 0) as total_remaining
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND i.payment_status != 'PAID' AND i.order_status != 'CANCELLED'
      WHERE c.id = ?
      GROUP BY c.id
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
});

// POST /api/v1/customers
customersRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createCustomerSchema.parse(body);
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: 'INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?) RETURNING id, created_at, updated_at',
    args: [data.name, data.phone || null, data.notes || null],
  });

  const row = result.rows[0]!;
  return c.json(
    {
      success: true,
      data: {
        id: Number(row.id),
        name: data.name,
        phone: data.phone || null,
        notes: data.notes || null,
        isActive: true,
        totalRemaining: 0,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      },
    },
    201
  );
});

// PATCH /api/v1/customers/:id
customersRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const data = updateCustomerSchema.parse(body);
  const db = getDbClient(c.env);

  const existing = await db.execute({ sql: 'SELECT id FROM customers WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) {
    throw new NotFoundError('الزبون غير موجود');
  }

  const updates: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    args.push(data.name);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    args.push(data.phone);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    args.push(data.notes);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    args.push(data.isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    args.push(id);
    await db.execute({
      sql: `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });
  }

  const updatedResult = await db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] });
  const row = updatedResult.rows[0]!;

  return c.json({
    success: true,
    data: {
      id: Number(row.id),
      name: String(row.name),
      phone: row.phone ? String(row.phone) : null,
      notes: row.notes ? String(row.notes) : null,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    },
  });
});

export default customersRoutes;
