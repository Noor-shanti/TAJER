import { Hono } from 'hono';
import {
  calculateDiscountAmount,
  calculateLineSubtotal,
  derivePaymentStatus,
  validatePaymentAmount,
} from '@merchant/shared';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createInvoiceSchema, createPaymentSchema } from '../validators/schemas';

const invoicesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
invoicesRoutes.use('*', authMiddleware);

// In-memory fallback only for local development without a configured database.
const fallbackInvoices: any[] = [
  {
    id: 1,
    invoiceNumber: 'INV-000001',
    customerId: 1,
    customerName: 'أحمد المحمود',
    subtotal: 14800,
    discountType: 'NONE',
    discountValue: 0,
    total: 14800,
    amountPaid: 4800,
    remaining: 10000,
    paymentStatus: 'PARTIALLY_PAID',
    orderStatus: 'CONFIRMED',
    notes: 'طلب أول',
    items: [
      {
        id: 1,
        invoiceId: 1,
        productId: 1,
        productNameSnapshot: 'مالبورو أحمر',
        unitNameSnapshot: 'كروز',
        quantity: 2000,
        unitPrice: 7400,
        discountType: 'NONE',
        discountValue: 0,
        lineSubtotal: 14800,
        lineTotal: 14800,
        createdAt: new Date().toISOString(),
      },
    ],
    payments: [{ id: 1, invoiceId: 1, amount: 4800, paymentMethod: 'CASH', notes: 'دفعة أولى', createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function isNoDbConfigured(env: Env) {
  return shouldUseLocalFallback(env);
}

function calculateLineItem(item: { quantity: number; unitPrice: number; discountType: string; discountValue: number }) {
  const lineSubtotal = calculateLineSubtotal(item.quantity, item.unitPrice);
  const itemDiscountAmount = calculateDiscountAmount(lineSubtotal, item.discountType as any, item.discountValue);
  const lineTotal = lineSubtotal - itemDiscountAmount;
  return { lineSubtotal, lineTotal };
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

      await tx.commit();

      return c.json({ success: true, data: { id: invoiceId, invoiceNumber, total, amountPaid: initialPayment, remaining, paymentStatus } }, 201);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  const seq = fallbackInvoices.length + 1;
  const invoiceNumber = `INV-${String(seq).padStart(6, '0')}`;
  const newInv = {
    id: seq,
    invoiceNumber,
    customerId: data.customerId,
    customerName: 'أحمد المحمود',
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
  fallbackInvoices.unshift(newInv);
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
    const result = await db.execute({
      sql: 'UPDATE invoices SET order_status = ?, updated_at = datetime(\'now\') WHERE id = ? RETURNING id',
      args: [orderStatus, invoiceId],
    });
    if (result.rows.length === 0) throw new NotFoundError('الفاتورة غير موجودة');
    return c.json({ success: true, data: { id: invoiceId, orderStatus } });
  }

  const inv = fallbackInvoices.find((i) => i.id === invoiceId);
  if (!inv) throw new NotFoundError('الفاتورة غير موجودة');
  inv.orderStatus = orderStatus;
  inv.updatedAt = new Date().toISOString();
  return c.json({ success: true, data: { id: invoiceId, orderStatus } });
});

export default invoicesRoutes;
