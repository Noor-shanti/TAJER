import { Hono } from 'hono';
import { getDbClient } from '../db/client';
import { NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createProductSchema, updateProductSchema } from '../validators/schemas';

const productsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
productsRoutes.use('*', authMiddleware);

// GET /api/v1/products (Paginated, Searchable, Filterable)
productsRoutes.get('/', async (c) => {
  const db = getDbClient(c.env);
  const search = c.req.query('search') || '';
  const categoryId = c.req.query('categoryId');
  const includeInactive = c.req.query('includeInactive') === 'true';

  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 20)));
  const offset = (page - 1) * limit;

  const whereConditions: string[] = [];
  const args: any[] = [];

  if (!includeInactive) {
    whereConditions.push('p.is_active = 1');
  }

  if (search.trim()) {
    whereConditions.push('p.name LIKE ?');
    args.push(`%${search.trim()}%`);
  }

  if (categoryId) {
    whereConditions.push('p.category_id = ?');
    args.push(Number(categoryId));
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM products p ${whereClause}`,
    args,
  });
  const total = Number(countResult.rows[0]?.total || 0);

  const queryArgs = [...args, limit, offset];
  const result = await db.execute({
    sql: `
      SELECT 
        p.*,
        c.name as category_name,
        u.name_ar as unit_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN product_units u ON p.unit_id = u.id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `,
    args: queryArgs,
  });

  const products = result.rows.map((row) => ({
    id: Number(row.id),
    categoryId: row.category_id ? Number(row.category_id) : null,
    categoryName: row.category_name ? String(row.category_name) : null,
    unitId: Number(row.unit_id),
    unitNameAr: String(row.unit_name_ar),
    name: String(row.name),
    currentPrice: Number(row.current_price),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  return c.json({
    success: true,
    data: products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/v1/products/:id
productsRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: `
      SELECT 
        p.*,
        c.name as category_name,
        u.name_ar as unit_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN product_units u ON p.unit_id = u.id
      WHERE p.id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) {
    throw new NotFoundError('المنتج غير موجود');
  }

  const row = result.rows[0]!;
  return c.json({
    success: true,
    data: {
      id: Number(row.id),
      categoryId: row.category_id ? Number(row.category_id) : null,
      categoryName: row.category_name ? String(row.category_name) : null,
      unitId: Number(row.unit_id),
      unitNameAr: String(row.unit_name_ar),
      name: String(row.name),
      currentPrice: Number(row.current_price),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    },
  });
});

// POST /api/v1/products
productsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createProductSchema.parse(body);
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: `
      INSERT INTO products (name, category_id, unit_id, current_price) 
      VALUES (?, ?, ?, ?) 
      RETURNING id, created_at, updated_at
    `,
    args: [data.name, data.categoryId || null, data.unitId, data.currentPrice],
  });

  const row = result.rows[0]!;
  return c.json(
    {
      success: true,
      data: {
        id: Number(row.id),
        name: data.name,
        categoryId: data.categoryId || null,
        unitId: data.unitId,
        currentPrice: data.currentPrice,
        isActive: true,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      },
    },
    201
  );
});

// PATCH /api/v1/products/:id
productsRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const data = updateProductSchema.parse(body);
  const db = getDbClient(c.env);

  const existing = await db.execute({ sql: 'SELECT id FROM products WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) {
    throw new NotFoundError('المنتج غير موجود');
  }

  const updates: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    args.push(data.name);
  }
  if (data.categoryId !== undefined) {
    updates.push('category_id = ?');
    args.push(data.categoryId);
  }
  if (data.unitId !== undefined) {
    updates.push('unit_id = ?');
    args.push(data.unitId);
  }
  if (data.currentPrice !== undefined) {
    updates.push('current_price = ?');
    args.push(data.currentPrice);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    args.push(data.isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    args.push(id);
    await db.execute({
      sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });
  }

  const updatedResult = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] });
  const row = updatedResult.rows[0]!;

  return c.json({
    success: true,
    data: {
      id: Number(row.id),
      name: String(row.name),
      categoryId: row.category_id ? Number(row.category_id) : null,
      unitId: Number(row.unit_id),
      currentPrice: Number(row.current_price),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    },
  });
});

export default productsRoutes;
