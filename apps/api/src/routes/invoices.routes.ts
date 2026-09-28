import { Hono } from 'hono';
import {
  calculateDiscountAmount,
  calculateLineSubtotal,
  derivePaymentStatus,
  validatePaymentAmount,
} from '@merchant/shared';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { addFallbackAuditLog, fallbackCustomers, fallbackInvoices, getFallbackStock, moveFallbackStock } from '../db/fallback.store';
import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';
import { moveStock } from '../services/inventory.service';
import type { Env, Variables } from '../types/env.types';
import { createInvoiceSchema, createPaymentSchema } from '../validators/schemas';

const invoicesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
invoicesRoutes.use('*', authMiddleware);

function isNoDbConfigured(env: Env) {
  return shouldUseLocalFallback(env);
}

function calculateLineItem(item: { quantity: number; unitPrice: number; discountType: string; discountValue: number }) {
  const lineSubtotal = calculateLineSubtotal(item.quantity, item.unitPrice);
  const itemDiscountAmount = calculateDiscountAmount(lineSubtotal, item.discountType as any, item.discountValue);
  const lineTotal = lineSubtotal - itemDiscountAmount;
  return { lineSubtotal, lineTotal };
}

function isValidReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// GET /api/v1/invoices
invoicesRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: `
        SELECT i.*, cust.name as customer_name
        FROM invoices i
        JOIN customers cust ON i.customer_id = cust.id
        WHERE i.invoice_number LIKE ? OR cust.name LIKE ?
        ORDER BY i.created_at DESC LIMIT 20
      `,
      args: [`%${search}%`, `%${search}%`],
    });
    const invoices = result.rows.map((row) => ({
      id: Number(row.id),
      invoiceNumber: String(row.invoice_number),
      customerId: Number(row.customer_id),
      customerName: String(row.customer_name),
      total: Number(row.total),
      amountPaid: Number(row.amount_paid),
      remaining: Number(row.remaining),
      paymentStatus: String(row.payment_status),
      orderStatus: String(row.order_status),
      createdAt: String(row.created_at),
    }));
    return c.json({ success: true, data: invoices, meta: { page: 1, limit: 20, total: invoices.length, totalPages: 1 } });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const filtered = fallbackInvoices.filter((inv) => inv.invoiceNumber.includes(search) || inv.customerName.includes(search));
    return c.json({ success: true, data: filtered, meta: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
  }
});

// GET /api/v1/invoices/customer/:customerId
invoicesRoutes.get('/customer/:customerId', async (c) => {
  const customerId = Number(c.req.param('customerId'));
  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: `
        SELECT i.*, cust.name as customer_name
        FROM invoices i
        JOIN customers cust ON i.customer_id = cust.id
        WHERE i.customer_id = ?
        ORDER BY i.created_at DESC
      `,
      args: [customerId],
    });
    const invoices = result.rows.map((row) => ({
      id: Number(row.id),
      invoiceNumber: String(row.invoice_number),
      customerId: Number(row.customer_id),
      customerName: String(row.customer_name),
      total: Number(row.total),
      amountPaid: Number(row.amount_paid),
      remaining: Number(row.remaining),
      paymentStatus: String(row.payment_status),
      orderStatus: String(row.order_status),
      createdAt: String(row.created_at),
    }));
    return c.json({ success: true, data: invoices, meta: { page: 1, limit: invoices.length, total: invoices.length, totalPages: 1 } });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const invoices = fallbackInvoices.filter((inv) => inv.customerId === customerId);
    return c.json({ success: true, data: invoices, meta: { page: 1, limit: invoices.length, total: invoices.length, totalPages: 1 } });
  }
});

// GET /api/v1/invoices/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
invoicesRoutes.get('/reports/sales', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = c.req.query('from') || today;
  const to = c.req.query('to') || today;

  if (!isValidReportDate(from) || !isValidReportDate(to) || from > to) {
    throw new BusinessRuleError('اختر فترة صحيحة بصيغة YYYY-MM-DD، ويجب أن يكون تاريخ البداية قبل تاريخ النهاية');
  }

  try {
    const db = getDbClient(c.env);
    const summaryResult = await db.execute({
      sql: `
        SELECT
          COUNT(*) as invoice_count,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(remaining), 0) as total_remaining
        FROM invoices
        WHERE DATE(created_at) BETWEEN ? AND ?
          AND order_status != 'CANCELLED'
      `,
      args: [from, to],
    });

    const itemsResult = await db.execute({
      sql: `
        SELECT
          ii.product_name_snapshot as product_name,
          ii.unit_name_snapshot as unit_name,
          COALESCE(SUM(ii.quantity), 0) as quantity,
          COALESCE(SUM(ii.line_total), 0) as total
        FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id
        WHERE DATE(i.created_at) BETWEEN ? AND ?
          AND i.order_status != 'CANCELLED'
        GROUP BY ii.product_name_snapshot, ii.unit_name_snapshot
        ORDER BY total DESC
      `,
      args: [from, to],
    });

    const summary = summaryResult.rows[0];
    return c.json({
      success: true,
      data: {
        from,
        to,
        invoiceCount: Number(summary?.invoice_count || 0),
        totalSales: Number(summary?.total_sales || 0),
        totalPaid: Number(summary?.total_paid || 0),
        totalRemaining: Number(summary?.total_remaining || 0),
        items: itemsResult.rows.map((row) => ({
          productName: String(row.product_name),
          unitName: String(row.unit_name),
          quantity: Number(row.quantity),
          total: Number(row.total),
        })),
      },
    });
  } catch (err) {
    if (!isNoDbConfigured(c.env)) throw err;
    const fromTime = new Date(`${from}T00:00:00`).getTime();
    const toTime = new Date(`${to}T23:59:59`).getTime();
    const matching = fallbackInvoices.filter((invoice) => {
      const created = new Date(invoice.createdAt).getTime();
      return created >= fromTime && created <= toTime && invoice.orderStatus !== 'CANCELLED';
    });
    const itemMap = new Map<string, { productName: string; unitName: string; quantity: number; total: number }>();
    for (const invoice of matching) {
      for (const item of invoice.items || []) {
        const key = `${item.productNameSnapshot}|${item.unitNameSnapshot}`;
        const existing = itemMap.get(key) || {
          productName: item.productNameSnapshot,
          unitName: item.unitNameSnapshot,
          quantity: 0,
          total: 0,
        };
        existing.quantity += item.quantity;
        existing.total += item.lineTotal;
        itemMap.set(key, existing);
      }
    }
    return c.json({
      success: true,
      data: {
        from,
        to,
        invoiceCount: matching.length,
        totalSales: matching.reduce((sum, invoice) => sum + invoice.total, 0),
        totalPaid: matching.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
        totalRemaining: matching.reduce((sum, invoice) => sum + invoice.remaining, 0),
        items: Array.from(itemMap.values()).sort((a, b) => b.total - a.total),
      },
    });
  }
});

// GET /api/v1/invoices/:id
invoicesRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  try {
    const db = getDbClient(c.env);
    const invoiceResult = await db.execute({
      sql: 'SELECT i.*, cust.name as customer_name FROM invoices i JOIN customers cust ON i.customer_id = cust.id WHERE i.id = ?',
      args: [id],
    });
    const invoiceRow = invoiceResult.rows[0];
    if (!invoiceRow) throw new NotFoundError('الفاتورة غير موجودة');

    const itemsResult = await db.execute({ sql: 'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', args: [id] });
    const items = itemsResult.rows.map((row) => ({
      id: Number(row.id),
      invoiceId: Number(row.invoice_id),
      productId: row.product_id ? Number(row.product_id) : null,
      productNameSnapshot: String(row.product_name_snapshot),
      unitNameSnapshot: String(row.unit_name_snapshot),
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      discountType: String(row.discount_type),
      discountValue: Number(row.discount_value),
      lineSubtotal: Number(row.line_subtotal),
      lineTotal: Number(row.line_total),
      createdAt: String(row.created_at),
    }));

    const paymentsResult = await db.execute({ sql: 'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC, id DESC', args: [id] });
    const payments = paymentsResult.rows.map((row) => ({
      id: Number(row.id),
      invoiceId: Number(row.invoice_id),
      amount: Number(row.amount),
      paymentMethod: String(row.payment_method),
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at),
    }));

    return c.json({
      success: true,
      data: {
        id: Number(invoiceRow.id),
        invoiceNumber: String(invoiceRow.invoice_number),
        customerId: Number(invoiceRow.customer_id),
        customerName: String(invoiceRow.customer_name),
        subtotal: Number(invoiceRow.subtotal),
        discountType: String(invoiceRow.discount_type),
        discountValue: Number(invoiceRow.discount_value),
        total: Number(invoiceRow.total),
        amountPaid: Number(invoiceRow.amount_paid),
        remaining: Number(invoiceRow.remaining),
        paymentStatus: String(invoiceRow.payment_status),
        orderStatus: String(invoiceRow.order_status),
        notes: invoiceRow.notes ? String(invoiceRow.notes) : null,
        items,
        payments,
        createdAt: String(invoiceRow.created_at),
        updatedAt: String(invoiceRow.updated_at),
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (!isNoDbConfigured(c.env)) throw err;
    const inv = fallbackInvoices.find((i) => i.id === id);
    if (!inv) throw new NotFoundError('الفاتورة غير موجودة');
    inv.payments = inv.payments || [];
    return c.json({ success: true, data: inv });
  }
});

// POST /api/v1/invoices
invoicesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createInvoiceSchema.parse(body);

  // Server is the source of truth for every money calculation.
  let subtotal = 0;
  const processedItems = data.items.map((item) => {
    const { lineSubtotal, lineTotal } = calculateLineItem(item);
    subtotal += lineTotal;
    return { ...item, lineSubtotal, lineTotal };
  });

  const invoiceDiscountAmount = calculateDiscountAmount(subtotal, data.discountType, data.discountValue);
  const total = subtotal - invoiceDiscountAmount;

  const initialPayment = data.initialPaymentAmount || 0;
  if (initialPayment > total) {
    throw new BusinessRuleError('الدفعة الأولى أكبر من إجمالي الفاتورة');
  }
  const remaining = Math.max(0, total - initialPayment);
  const paymentStatus = derivePaymentStatus(total, initialPayment);

  const noDb = isNoDbConfigured(c.env);

  if (!noDb) {
    const db = getDbClient(c.env);

    if (data.idempotencyKey) {
      const existing = await db.execute({
        sql: 'SELECT id, invoice_number FROM invoices WHERE idempotency_key = ?',
        args: [data.idempotencyKey],
      });
      if (existing.rows.length > 0) {
        const row = existing.rows[0]!;
        return c.json({
          success: true,
          data: { id: Number(row.id), invoiceNumber: String(row.invoice_number), total, amountPaid: initialPayment, remaining, paymentStatus },
        }, 201);
      }
    }

    const customerCheck = await db.execute({ sql: 'SELECT id FROM customers WHERE id = ? AND is_active = 1', args: [data.customerId] });
    if (customerCheck.rows.length === 0) {
      throw new NotFoundError('الزبون غير موجود أو غير نشط');
    }

    const tx = await db.transaction('write');
    try {
      const invoiceInsert = await tx.execute({
        sql: `INSERT INTO invoices
                (invoice_number, customer_id, subtotal, discount_type, discount_value, total, amount_paid, remaining, payment_status, order_status, notes, idempotency_key)
              VALUES ('PENDING', ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
        args: [
          data.customerId,
          subtotal,
          data.discountType,
          data.discountValue,
          total,
          initialPayment,
          remaining,
          paymentStatus,
          data.notes || null,
          data.idempotencyKey || null,
        ],
      });
      const invoiceId = Number(invoiceInsert.lastInsertRowid);
      const invoiceNumber = `INV-${String(invoiceId).padStart(6, '0')}`;
      await tx.execute({ sql: 'UPDATE invoices SET invoice_number = ? WHERE id = ?', args: [invoiceNumber, invoiceId] });

      for (const item of processedItems) {
        if (item.productId) {
          await moveStock(tx, item.productId, -item.quantity, 'SALE', invoiceId, `بيع في الفاتورة ${invoiceNumber}`);
        }
        await tx.execute({
          sql: `INSERT INTO invoice_items
                  (invoice_id, product_id, product_name_snapshot, unit_name_snapshot, unit_price, discount_type, discount_value, line_subtotal, line_total, quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            invoiceId,
            item.productId || null,
            item.productNameSnapshot,
            item.unitNameSnapshot,
            item.unitPrice,
            item.discountType,
            item.discountValue,
            item.lineSubtotal,
            item.lineTotal,
            item.quantity,
          ],
        });
      }

      if (initialPayment > 0) {
        await tx.execute({
          sql: `INSERT INTO payments (invoice_id, amount, payment_method, notes) VALUES (?, ?, 'CASH', ?)`,
          args: [invoiceId, initialPayment, 'دفعة أولى عند إصدار الفاتورة'],
        });
      }

      await writeAuditLog(tx, 'INVOICE', invoiceId, 'CREATED', `تم إنشاء الفاتورة ${invoiceNumber}`);

      await tx.commit();

      return c.json({ success: true, data: { id: invoiceId, invoiceNumber, total, amountPaid: initialPayment, remaining, paymentStatus } }, 201);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  for (const item of processedItems) {
    if (item.productId && getFallbackStock(item.productId).quantity < item.quantity) {
      throw new BusinessRuleError(`المتوفر من ${item.productNameSnapshot} لا يكفي لإتمام الطلبية`);
    }
  }
  const seq = fallbackInvoices.length + 1;
  const invoiceNumber = `INV-${String(seq).padStart(6, '0')}`;
  const newInv = {
    id: seq,
    invoiceNumber,
    customerId: data.customerId,
    customerName: fallbackCustomers.find((customer) => customer.id === data.customerId)?.name || 'زبون',
    subtotal,
    discountType: data.discountType,
    discountValue: data.discountValue,
    total,
    amountPaid: initialPayment,
    remaining,
    paymentStatus,
    orderStatus: 'CONFIRMED',
    notes: data.notes || null,
    items: processedItems.map((pi, idx) => ({ ...pi, id: idx + 1, invoiceId: seq, createdAt: new Date().toISOString() })),
    payments: initialPayment > 0 ? [{ id: 1, invoiceId: seq, amount: initialPayment, paymentMethod: 'CASH', notes: 'دفعة أولى', createdAt: new Date().toISOString() }] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  for (const item of processedItems) {
    if (item.productId) moveFallbackStock(item.productId, -item.quantity, 'SALE', seq, `بيع في الفاتورة ${invoiceNumber}`);
  }
  fallbackInvoices.unshift(newInv);
  addFallbackAuditLog('INVOICE', seq, 'CREATED', `تم إنشاء الفاتورة ${invoiceNumber}`);
  return c.json({ success: true, data: { id: seq, invoiceNumber, total, amountPaid: initialPayment, remaining, paymentStatus } }, 201);
});

// POST /api/v1/invoices/:id/payments
invoicesRoutes.post('/:id/payments', async (c) => {
  const invoiceId = Number(c.req.param('id'));
  const body = await c.req.json();
  const data = createPaymentSchema.parse(body);

  const noDb = isNoDbConfigured(c.env);

  if (!noDb) {
    const db = getDbClient(c.env);

    if (data.idempotencyKey) {
      const existing = await db.execute({ sql: 'SELECT id FROM payments WHERE idempotency_key = ?', args: [data.idempotencyKey] });
      if (existing.rows.length > 0) {
        const invRow = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [invoiceId] });
        const row = invRow.rows[0]!;
        return c.json({ success: true, data: { invoiceId, amountPaid: Number(row.amount_paid), remaining: Number(row.remaining), paymentStatus: String(row.payment_status) } }, 201);
      }
    }

    const tx = await db.transaction('write');
    try {
      const invResult = await tx.execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [invoiceId] });
      const invoiceRow = invResult.rows[0];
      if (!invoiceRow) {
        await tx.rollback();
        throw new NotFoundError('الفاتورة غير موجودة');
      }

      const currentRemaining = Number(invoiceRow.remaining);
      const validation = validatePaymentAmount(currentRemaining, data.amount);
      if (!validation.isValid) {
        await tx.rollback();
        throw new BusinessRuleError(validation.error);
      }

      await tx.execute({
        sql: 'INSERT INTO payments (invoice_id, amount, payment_method, notes, idempotency_key) VALUES (?, ?, ?, ?, ?)',
        args: [invoiceId, data.amount, data.paymentMethod, data.notes || null, data.idempotencyKey || null],
      });

      const newAmountPaid = Number(invoiceRow.amount_paid) + data.amount;
      const newRemaining = currentRemaining - data.amount;
      const newTotal = Number(invoiceRow.total);
      const newStatus = derivePaymentStatus(newTotal, newAmountPaid);

      await tx.execute({
        sql: 'UPDATE invoices SET amount_paid = ?, remaining = ?, payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?',
        args: [newAmountPaid, newRemaining, newStatus, invoiceId],
      });

      await writeAuditLog(tx, 'INVOICE', invoiceId, 'PAYMENT_ADDED', `تم تسجيل دفعة بقيمة ${data.amount}`);

      await tx.commit();

      return c.json({ success: true, data: { invoiceId, amountPaid: newAmountPaid, remaining: newRemaining, paymentStatus: newStatus } }, 201);
    } catch (err) {
      try { await tx.rollback(); } catch { /* already rolled back */ }
      throw err;
    }
  }

  const inv = fallbackInvoices.find((i) => i.id === invoiceId);
  if (!inv) throw new NotFoundError('الفاتورة غير موجودة');
  const validation = validatePaymentAmount(inv.remaining, data.amount);
  if (!validation.isValid) throw new BusinessRuleError(validation.error);
  inv.amountPaid += data.amount;
  inv.remaining -= data.amount;
  inv.paymentStatus = derivePaymentStatus(inv.total, inv.amountPaid);
  inv.payments = [
    ...(inv.payments || []),
    { id: (inv.payments || []).length + 1, invoiceId, amount: data.amount, paymentMethod: data.paymentMethod, notes: data.notes || null, createdAt: new Date().toISOString() },
  ];
  inv.updatedAt = new Date().toISOString();
  addFallbackAuditLog('INVOICE', invoiceId, 'PAYMENT_ADDED', `تم تسجيل دفعة بقيمة ${data.amount}`);
  return c.json({ success: true, data: { invoiceId, amountPaid: inv.amountPaid, remaining: inv.remaining, paymentStatus: inv.paymentStatus } }, 201);
});

// PATCH /api/v1/invoices/:id/status
invoicesRoutes.patch('/:id/status', async (c) => {
  const invoiceId = Number(c.req.param('id'));
  const body = await c.req.json();
  const orderStatus = String(body.orderStatus || '');
  const allowed = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
  if (!allowed.includes(orderStatus)) {
    throw new BusinessRuleError('حالة الطلبية غير صحيحة');
  }

  const noDb = isNoDbConfigured(c.env);
  if (!noDb) {
    const db = getDbClient(c.env);
    const tx = await db.transaction('write');
    try {
      const invoiceResult = await tx.execute({ sql: 'SELECT invoice_number, order_status FROM invoices WHERE id = ?', args: [invoiceId] });
      const invoice = invoiceResult.rows[0];
      if (!invoice) throw new NotFoundError('الفاتورة غير موجودة');
      const previousStatus = String(invoice.order_status);
      if (previousStatus !== orderStatus && (previousStatus === 'CANCELLED' || orderStatus === 'CANCELLED')) {
        const itemsResult = await tx.execute({ sql: 'SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?', args: [invoiceId] });
        for (const item of itemsResult.rows) {
          if (!item.product_id) continue;
          const delta = orderStatus === 'CANCELLED' ? Number(item.quantity) : -Number(item.quantity);
          await moveStock(tx, Number(item.product_id), delta, orderStatus === 'CANCELLED' ? 'CANCELLATION' : 'SALE', invoiceId, orderStatus === 'CANCELLED' ? `إلغاء الفاتورة ${String(invoice.invoice_number)}` : `إعادة تفعيل الفاتورة ${String(invoice.invoice_number)}`);
        }
      }
      await tx.execute({ sql: "UPDATE invoices SET order_status = ?, updated_at = datetime('now') WHERE id = ?", args: [orderStatus, invoiceId] });
      await writeAuditLog(tx, 'INVOICE', invoiceId, orderStatus === 'CANCELLED' ? 'CANCELLED' : 'STATUS_UPDATED', orderStatus === 'CANCELLED' ? 'تم إلغاء الفاتورة وإرجاع الأصناف للمتوفر' : 'تم تحديث حالة الطلبية');
      await tx.commit();
      return c.json({ success: true, data: { id: invoiceId, orderStatus } });
    } catch (err) {
      try { await tx.rollback(); } catch { /* already rolled back */ }
      throw err;
    }
  }

  const inv = fallbackInvoices.find((i) => i.id === invoiceId);
  if (!inv) throw new NotFoundError('الفاتورة غير موجودة');
  if (inv.orderStatus !== orderStatus && (inv.orderStatus === 'CANCELLED' || orderStatus === 'CANCELLED')) {
    for (const item of inv.items || []) {
      if (item.productId && orderStatus !== 'CANCELLED' && getFallbackStock(item.productId).quantity < item.quantity) {
        throw new BusinessRuleError(`لا يمكن إعادة تفعيل الفاتورة، المتوفر من ${item.productNameSnapshot} لا يكفي`);
      }
    }
    for (const item of inv.items || []) {
      if (item.productId) moveFallbackStock(item.productId, orderStatus === 'CANCELLED' ? item.quantity : -item.quantity, orderStatus === 'CANCELLED' ? 'CANCELLATION' : 'SALE', invoiceId, orderStatus === 'CANCELLED' ? `إلغاء الفاتورة ${inv.invoiceNumber}` : `إعادة تفعيل الفاتورة ${inv.invoiceNumber}`);
    }
  }
  inv.orderStatus = orderStatus;
  inv.updatedAt = new Date().toISOString();
  addFallbackAuditLog('INVOICE', invoiceId, orderStatus === 'CANCELLED' ? 'CANCELLED' : 'STATUS_UPDATED', orderStatus === 'CANCELLED' ? 'تم إلغاء الفاتورة وإرجاع الأصناف للمتوفر' : 'تم تحديث حالة الطلبية');
  return c.json({ success: true, data: { id: invoiceId, orderStatus } });
});

export default invoicesRoutes;
