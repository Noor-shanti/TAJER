import { Hono } from 'hono';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { addFallbackAuditLog } from '../db/fallback.store';
import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';
import { writeAuditLog } from '../services/audit.service';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createProductSchema, updateProductSchema } from '../validators/schemas';

const productsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
productsRoutes.use('*', authMiddleware);

const fallbackProducts: any[] = [
  { id: 1, name: 'مالبورو أحمر', categoryId: 1, categoryName: 'سجائر', unitId: 1, unitNameAr: 'كروز', currentPrice: 7400, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: 'إل إم أزرق', categoryId: 1, categoryName: 'سجائر', unitId: 1, unitNameAr: 'كروز', currentPrice: 6200, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 3, name: 'وينستون أبيض', categoryId: 1, categoryName: 'سجائر', unitId: 1, unitNameAr: 'كروز', currentPrice: 6800, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function isNoDbConfigured(env: Env) {
  return shouldUseLocalFallback(env);
}

function fallbackUnitName(unitId: number) {
  return ({ 1: 'كروز', 2: 'حبة', 3: 'علبة', 4: 'كيلو' } as Record<number, string>)[unitId] || 'حبة';
}

function mapProduct(row: any) {
  return {
    id: Number(row.id), categoryId: row.category_id ? Number(row.category_id) : row.categoryId ?? null,
    categoryName: row.category_name ? String(row.category_name) : row.categoryName ?? null,
    unitId: Number(row.unit_id ?? row.unitId), unitNameAr: String(row.unit_name_ar ?? row.unitNameAr),
    name: String(row.name), currentPrice: Number(row.current_price ?? row.currentPrice),
    isActive: Boolean(row.is_active ?? row.isActive), createdAt: String(row.created_at ?? row.createdAt), updatedAt: String(row.updated_at ?? row.updatedAt),
  };
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
    const products = result.rows.map(mapProduct);
    return c.json({ success: true, data: products, meta: { page: 1, limit: 50, total: products.length, totalPages: 1 } });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const filtered = fallbackProducts.filter((p) => p.name.includes(search) || (p.categoryName && p.categoryName.includes(search)));
    return c.json({ success: true, data: filtered, meta: { page: 1, limit: 50, total: filtered.length, totalPages: 1 } });
  }
});

// GET /api/v1/products/:id
productsRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: 'SELECT p.*, c.name as category_name, u.name_ar as unit_name_ar FROM products p LEFT JOIN categories c ON p.category_id = c.id JOIN product_units u ON p.unit_id = u.id WHERE p.id = ?',
      args: [id],
    });
    if (!result.rows[0]) throw new NotFoundError('المنتج غير موجود');
    return c.json({ success: true, data: mapProduct(result.rows[0]) });
  } catch (err) {
    if (err instanceof NotFoundError || !isNoDbConfigured(c.env)) throw err;
    const product = fallbackProducts.find((item) => item.id === id);
    if (!product) throw new NotFoundError('المنتج غير موجود');
    return c.json({ success: true, data: product });
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
    await writeAuditLog(db, 'PRODUCT', Number(row.id), 'CREATED', `تمت إضافة المنتج: ${data.name}`);
    return c.json({ success: true, data: { id: Number(row.id), name: data.name, categoryId: data.categoryId || null, unitId: data.unitId, currentPrice: data.currentPrice, isActive: true, createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }, 201);
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const newProd = { id: fallbackProducts.length + 1, name: data.name, categoryId: data.categoryId || null, categoryName: null, unitId: data.unitId, unitNameAr: fallbackUnitName(data.unitId), currentPrice: data.currentPrice, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackProducts.unshift(newProd);
    addFallbackAuditLog('PRODUCT', newProd.id, 'CREATED', `تمت إضافة المنتج: ${data.name}`);
    return c.json({ success: true, data: newProd }, 201);
  }
});

// PATCH /api/v1/products/:id
productsRoutes.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const data = updateProductSchema.parse(await c.req.json());
  if (Object.keys(data).length === 0) throw new BusinessRuleError('لا توجد بيانات لتعديلها');
  try {
    const db = getDbClient(c.env);
    const fields: string[] = [];
    const args: Array<string | number | null> = [];
    if (data.name !== undefined) { fields.push('name = ?'); args.push(data.name); }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); args.push(data.categoryId); }
    if (data.unitId !== undefined) { fields.push('unit_id = ?'); args.push(data.unitId); }
    if (data.currentPrice !== undefined) { fields.push('current_price = ?'); args.push(data.currentPrice); }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); args.push(data.isActive ? 1 : 0); }
    args.push(id);
    const result = await db.execute({ sql: `UPDATE products SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ? RETURNING id`, args });
    if (!result.rows[0]) throw new NotFoundError('المنتج غير موجود');
    await writeAuditLog(db, 'PRODUCT', id, data.isActive === false ? 'ARCHIVED' : 'UPDATED', data.isActive === false ? 'تم إيقاف المنتج' : 'تم تعديل بيانات المنتج');
    return c.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || !isNoDbConfigured(c.env)) throw err;
    const product = fallbackProducts.find((item) => item.id === id);
    if (!product) throw new NotFoundError('المنتج غير موجود');
    Object.assign(product, data, { unitNameAr: data.unitId ? fallbackUnitName(data.unitId) : product.unitNameAr, updatedAt: new Date().toISOString() });
    addFallbackAuditLog('PRODUCT', id, data.isActive === false ? 'ARCHIVED' : 'UPDATED', data.isActive === false ? 'تم إيقاف المنتج' : 'تم تعديل بيانات المنتج');
    return c.json({ success: true, data: { id } });
  }
});

// DELETE /api/v1/products/:id archives the product to preserve invoice history.
productsRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({ sql: "UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND is_active = 1 RETURNING id", args: [id] });
    if (!result.rows[0]) throw new NotFoundError('المنتج غير موجود أو متوقف');
    await writeAuditLog(db, 'PRODUCT', id, 'ARCHIVED', 'تم إيقاف المنتج');
    return c.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || !isNoDbConfigured(c.env)) throw err;
    const product = fallbackProducts.find((item) => item.id === id && item.isActive);
    if (!product) throw new NotFoundError('المنتج غير موجود أو متوقف');
    product.isActive = false; product.updatedAt = new Date().toISOString();
    addFallbackAuditLog('PRODUCT', id, 'ARCHIVED', 'تم إيقاف المنتج');
    return c.json({ success: true, data: { id } });
  }
});

export default productsRoutes;
