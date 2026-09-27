import { Hono } from 'hono';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createProductSchema } from '../validators/schemas';

const productsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
productsRoutes.use('*', authMiddleware);

const fallbackProducts: any[] = [
  { id: 1, name: 'مالبورو أحمر', categoryId: 1, categoryName: 'سجائر ومشروبات', unitId: 1, unitNameAr: 'كروز', currentPrice: 7400, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: 'إل إم أزرق', categoryId: 1, categoryName: 'سجائر ومشروبات', unitId: 1, unitNameAr: 'كروز', currentPrice: 6200, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 3, name: 'وينستون أبيض', categoryId: 1, categoryName: 'سجائر ومشروبات', unitId: 1, unitNameAr: 'كروز', currentPrice: 6800, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function isNoDbConfigured(env: Env) {
  return shouldUseLocalFallback(env);
}

// GET /api/v1/products
productsRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: `
        SELECT p.*, c.name as category_name, u.name_ar as unit_name_ar
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        JOIN product_units u ON p.unit_id = u.id
        WHERE p.is_active = 1 AND (p.name LIKE ? OR c.name LIKE ?)
        ORDER BY p.name ASC LIMIT 50
      `,
      args: [`%${search}%`, `%${search}%`],
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
    return c.json({ success: true, data: products, meta: { page: 1, limit: 50, total: products.length, totalPages: 1 } });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const filtered = fallbackProducts.filter((p) => p.name.includes(search) || (p.categoryName && p.categoryName.includes(search)));
    return c.json({ success: true, data: filtered, meta: { page: 1, limit: 50, total: filtered.length, totalPages: 1 } });
  }
});

// POST /api/v1/products
productsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createProductSchema.parse(body);

  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: 'INSERT INTO products (name, category_id, unit_id, current_price) VALUES (?, ?, ?, ?) RETURNING id, created_at, updated_at',
      args: [data.name, data.categoryId || null, data.unitId, data.currentPrice],
    });
    const row = result.rows[0]!;
    return c.json({ success: true, data: { id: Number(row.id), name: data.name, categoryId: data.categoryId || null, unitId: data.unitId, currentPrice: data.currentPrice, isActive: true, createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }, 201);
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const newProd = { id: fallbackProducts.length + 1, name: data.name, categoryId: data.categoryId || null, categoryName: 'عام', unitId: data.unitId, unitNameAr: 'حبة', currentPrice: data.currentPrice, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackProducts.unshift(newProd);
    return c.json({ success: true, data: newProd }, 201);
  }
});

export default productsRoutes;
