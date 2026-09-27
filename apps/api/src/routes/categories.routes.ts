import { Hono } from 'hono';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createCategorySchema, updateCategorySchema } from '../validators/schemas';

const categoriesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
categoriesRoutes.use('*', authMiddleware);

type CategoryResponse = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const fallbackCategories: CategoryResponse[] = [
  { id: 1, name: 'سجائر', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: 'مواد غذائية', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function isNoDbConfigured(env: Env) {
  return shouldUseLocalFallback(env);
}

// GET /api/v1/categories
categoriesRoutes.get('/', async (c) => {
  const includeInactive = c.req.query('includeInactive') === 'true';

  try {
    const db = getDbClient(c.env);
    const sql = includeInactive
      ? 'SELECT * FROM categories ORDER BY name ASC'
      : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC';

    const result = await db.execute(sql);
    const categories = result.rows
      .map((row) => ({
        id: Number(row.id),
        name: String(row.name) === 'سجائر ومشروبات' ? 'سجائر' : String(row.name),
        isActive: Boolean(row.is_active),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }))
      .filter((category) => category.name !== 'عام');

    return c.json({ success: true, data: categories });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    return c.json({ success: true, data: includeInactive ? fallbackCategories : fallbackCategories.filter((cat) => cat.isActive) });
  }
});

// POST /api/v1/categories
categoriesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createCategorySchema.parse(body);

  try {
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
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const newCategory = { id: fallbackCategories.length + 1, name: data.name, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackCategories.push(newCategory);
    return c.json({ success: true, data: newCategory }, 201);
  }
});

// PATCH /api/v1/categories/:id
categoriesRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const data = updateCategorySchema.parse(body);

  try {
    const db = getDbClient(c.env);
    const existing = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      throw new NotFoundError('التصنيف غير موجود');
    }

    const updates: string[] = [];
    const args: Array<string | number> = [];

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
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const category = fallbackCategories.find((item) => item.id === id);
    if (!category) throw new NotFoundError('التصنيف غير موجود');
    if (data.name !== undefined) category.name = data.name;
    if (data.isActive !== undefined) category.isActive = data.isActive;
    category.updatedAt = new Date().toISOString();
    return c.json({ success: true, data: category });
  }
});

export default categoriesRoutes;
