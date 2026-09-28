import { Hono } from 'hono';
import { z } from 'zod';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { addFallbackAuditLog, fallbackStockMovements, getFallbackStock, moveFallbackStock, setFallbackStock } from '../db/fallback.store';
import { fallbackProducts } from './products.routes';
import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import { moveStock } from '../services/inventory.service';
import { writeAuditLog } from '../services/audit.service';
import type { Env, Variables } from '../types/env.types';

const inventoryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
inventoryRoutes.use('*', authMiddleware);
const setStockSchema = z.object({ quantity: z.number().int().nonnegative(), reorderLevel: z.number().int().nonnegative().optional(), notes: z.string().trim().optional().nullable() });
const receiveStockSchema = z.object({ quantity: z.number().int().positive(), notes: z.string().trim().optional().nullable() });

inventoryRoutes.get('/low-stock', async (c) => {
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({ sql: "SELECT p.*, u.name_ar as unit_name_ar, c.name as category_name FROM products p JOIN product_units u ON u.id = p.unit_id LEFT JOIN categories c ON c.id = p.category_id WHERE p.is_active = 1 AND p.stock_quantity <= p.reorder_level ORDER BY p.stock_quantity ASC", args: [] });
    return c.json({ success: true, data: result.rows.map((row) => ({ id: Number(row.id), name: String(row.name), unitNameAr: String(row.unit_name_ar), categoryName: row.category_name ? String(row.category_name) : null, currentPrice: Number(row.current_price), stockQuantity: Number(row.stock_quantity), reorderLevel: Number(row.reorder_level) })) });
  } catch (err) {
    if (!shouldUseLocalFallback(c.env)) throw err;
    return c.json({ success: true, data: fallbackProducts.filter((product) => { const stock = getFallbackStock(product.id); return product.isActive && stock.quantity <= stock.reorderLevel; }).map((product) => ({ ...product, stockQuantity: getFallbackStock(product.id).quantity, reorderLevel: getFallbackStock(product.id).reorderLevel })) });
  }
});

inventoryRoutes.get('/:productId/movements', async (c) => {
  const productId = Number(c.req.param('productId'));
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({ sql: 'SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC, id DESC LIMIT 50', args: [productId] });
    return c.json({ success: true, data: result.rows.map((row) => ({ id: Number(row.id), productId: Number(row.product_id), movementType: String(row.movement_type), quantityDelta: Number(row.quantity_delta), balanceAfter: Number(row.balance_after), invoiceId: row.invoice_id ? Number(row.invoice_id) : null, notes: row.notes ? String(row.notes) : null, createdAt: String(row.created_at) })) });
  } catch (err) {
    if (!shouldUseLocalFallback(c.env)) throw err;
    return c.json({ success: true, data: fallbackStockMovements.filter((movement) => movement.productId === productId) });
  }
});

inventoryRoutes.post('/:productId/receive', async (c) => {
  const productId = Number(c.req.param('productId'));
  const data = receiveStockSchema.parse(await c.req.json());
  try {
    const db = getDbClient(c.env);
    const productResult = await db.execute({ sql: 'SELECT id FROM products WHERE id = ? AND is_active = 1', args: [productId] });
    if (!productResult.rows[0]) throw new NotFoundError('المنتج غير موجود أو متوقف');
    const tx = await db.transaction('write');
    try {
      const stockQuantity = await moveStock(tx, productId, data.quantity, 'RECEIPT', null, data.notes || 'توريد مخزون');
      await writeAuditLog(tx, 'PRODUCT', productId, 'STOCK_RECEIVED', 'تمت إضافة كمية جديدة إلى المخزون');
      await tx.commit();
      return c.json({ success: true, data: { productId, stockQuantity } });
    } catch (err) { await tx.rollback(); throw err; }
  } catch (err) {
    if (err instanceof NotFoundError || !shouldUseLocalFallback(c.env)) throw err;
    const product = fallbackProducts.find((item) => item.id === productId && item.isActive);
    if (!product) throw new NotFoundError('المنتج غير موجود أو متوقف');
    const stockQuantity = moveFallbackStock(productId, data.quantity, 'RECEIPT', null, data.notes || 'توريد مخزون');
    addFallbackAuditLog('PRODUCT', productId, 'STOCK_RECEIVED', 'تمت إضافة كمية جديدة إلى المخزون');
    return c.json({ success: true, data: { productId, stockQuantity } });
  }
});

inventoryRoutes.put('/:productId', async (c) => {
  const productId = Number(c.req.param('productId'));
  const data = setStockSchema.parse(await c.req.json());
  try {
    const db = getDbClient(c.env);
    const productResult = await db.execute({ sql: 'SELECT stock_quantity FROM products WHERE id = ? AND is_active = 1', args: [productId] });
    const product = productResult.rows[0];
    if (!product) throw new NotFoundError('المنتج غير موجود أو متوقف');
    const tx = await db.transaction('write');
    try {
      const delta = data.quantity - Number(product.stock_quantity);
      await moveStock(tx, productId, delta, 'ADJUSTMENT', null, data.notes || 'تعديل المتوفر يدويا');
      if (data.reorderLevel !== undefined) await tx.execute({ sql: "UPDATE products SET reorder_level = ?, updated_at = datetime('now') WHERE id = ?", args: [data.reorderLevel, productId] });
      await writeAuditLog(tx, 'PRODUCT', productId, 'STOCK_UPDATED', 'تم تعديل الكمية المتوفرة');
      await tx.commit();
      return c.json({ success: true, data: { productId, stockQuantity: data.quantity, reorderLevel: data.reorderLevel ?? 0 } });
    } catch (err) { await tx.rollback(); throw err; }
  } catch (err) {
    if (err instanceof NotFoundError || !shouldUseLocalFallback(c.env)) throw err;
    const product = fallbackProducts.find((item) => item.id === productId && item.isActive);
    if (!product) throw new NotFoundError('المنتج غير موجود أو متوقف');
    const current = getFallbackStock(productId);
    setFallbackStock(productId, data.quantity, data.reorderLevel);
    fallbackStockMovements.unshift({ id: fallbackStockMovements.length + 1, productId, movementType: 'ADJUSTMENT', quantityDelta: data.quantity - current.quantity, balanceAfter: data.quantity, invoiceId: null, notes: data.notes || 'تعديل المتوفر يدويا', createdAt: new Date().toISOString() });
    addFallbackAuditLog('PRODUCT', productId, 'STOCK_UPDATED', 'تم تعديل الكمية المتوفرة');
    return c.json({ success: true, data: { productId, stockQuantity: data.quantity, reorderLevel: data.reorderLevel ?? current.reorderLevel } });
  }
});

export default inventoryRoutes;
