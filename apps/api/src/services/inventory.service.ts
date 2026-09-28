import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';

type SqlExecutor = { execute: (statement: { sql: string; args: Array<string | number | null> }) => Promise<any> };

export async function moveStock(
  db: SqlExecutor,
  productId: number,
  delta: number,
  movementType: 'ADJUSTMENT' | 'RECEIPT' | 'SALE' | 'CANCELLATION',
  invoiceId: number | null,
  notes: string | null
) {
  const result = await db.execute({ sql: 'SELECT id, name, stock_quantity FROM products WHERE id = ?', args: [productId] });
  const product = result.rows[0];
  if (!product) throw new NotFoundError('المنتج غير موجود');
  const balanceAfter = Number(product.stock_quantity) + delta;
  if (balanceAfter < 0) throw new BusinessRuleError(`المتوفر من ${String(product.name)} لا يكفي لإتمام الطلبية`);
  await db.execute({ sql: "UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?", args: [balanceAfter, productId] });
  await db.execute({ sql: 'INSERT INTO stock_movements (product_id, movement_type, quantity_delta, balance_after, invoice_id, notes) VALUES (?, ?, ?, ?, ?, ?)', args: [productId, movementType, delta, balanceAfter, invoiceId, notes] });
  return balanceAfter;
}
