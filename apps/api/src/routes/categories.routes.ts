import { Hono } from 'hono';
import { getDbClient } from '../db/client';
import { NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createCategorySchema, updateCategorySchema } from '../validators/schemas';

const categoriesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
categoriesRoutes.use('*', authMiddleware);

// GET /api/v1/categories
categoriesRoutes.get('/', async (c) => {
  const db = getDbClient(c.env);
  const includeInactive = c.req.query('includeInactive') === 'true';

  const sql = includeInactive
    ? 'SELECT * FROM categories ORDER BY name ASC'
    : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC';

  const result = await db.execute(sql);
  const categories = result.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  return c.json({
    success: true,
    data: categories,
  });
});

// POST /api/v1/categories
categoriesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createCategorySchema.parse(body);
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: 'INSERT INTO categories (name) VALUES (?) RETURNING id, created_at, updated_at',
    args: [data.name],
  });

  const row = result.rows[0]!;
  return c.json(
    {
      success: true,
      data: {
        id: Number(row.id),
        name: data.name,
        isActive: true,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      },
    },
    201
  );
});

// PATCH /api/v1/categories/:id
categoriesRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const data = updateCategorySchema.parse(body);
  const db = getDbClient(c.env);

  const existing = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) {
    throw new NotFoundError('التصنيف غير موجود');
  }

  const updates: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    args.push(data.name);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    args.push(data.isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    args.push(id);
    await db.execute({
      sql: `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });
  }

  const updatedResult = await db.execute({ sql: 'SELECT * FROM categories WHERE id = ?', args: [id] });
  const row = updatedResult.rows[0]!;

  return c.json({
    success: true,
    data: {
      id: Number(row.id),
      name: String(row.name),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    },
  });
});

export default categoriesRoutes;
