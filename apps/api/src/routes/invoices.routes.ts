import { Hono } from 'hono';
import { QUANTITY_SCALE } from '@merchant/shared';
import { getDbClient } from '../db/client';
import { BusinessRuleError, NotFoundError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createInvoiceSchema, createPaymentSchema } from '../validators/schemas';

const invoicesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
invoicesRoutes.use('*', authMiddleware);

/**
 * Financial calculation helper strictly executing minor units logic on backend.
 */
function calculateLineItem(item: {
  quantity: number; // Scale 1000
  unitPrice: number; // Minor units
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
}) {
  // lineSubtotal = (quantity * unitPrice) / 1000
  const lineSubtotal = Math.round((item.quantity * item.unitPrice) / QUANTITY_SCALE);

  let itemDiscountAmount = 0;
  if (item.discountType === 'FIXED') {
    itemDiscountAmount = Math.min(lineSubtotal, item.discountValue);
  } else if (item.discountType === 'PERCENTAGE') {
    itemDiscountAmount = Math.round((lineSubtotal * item.discountValue) / 10_000);
    itemDiscountAmount = Math.min(lineSubtotal, itemDiscountAmount);
  }

  const lineTotal = lineSubtotal - itemDiscountAmount;
  return { lineSubtotal, lineTotal };
}

// GET /api/v1/invoices (Paginated & Filterable)
invoicesRoutes.get('/', async (c) => {
  const db = getDbClient(c.env);
  const search = c.req.query('search') || '';
  const customerId = c.req.query('customerId');
  const paymentStatus = c.req.query('paymentStatus');
  const orderStatus = c.req.query('orderStatus');

  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 20)));
  const offset = (page - 1) * limit;

  const whereConditions: string[] = [];
  const args: any[] = [];

  if (search.trim()) {
    whereConditions.push('(i.invoice_number LIKE ? OR cust.name LIKE ?)');
    args.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  if (customerId) {
    whereConditions.push('i.customer_id = ?');
    args.push(Number(customerId));
  }

  if (paymentStatus) {
    whereConditions.push('i.payment_status = ?');
    args.push(paymentStatus);
  }

  if (orderStatus) {
    whereConditions.push('i.order_status = ?');
    args.push(orderStatus);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM invoices i JOIN customers cust ON i.customer_id = cust.id ${whereClause}`,
    args,
  });
  const total = Number(countResult.rows[0]?.total || 0);

  const queryArgs = [...args, limit, offset];
  const result = await db.execute({
    sql: `
      SELECT 
        i.*,
        cust.name as customer_name
      FROM invoices i
      JOIN customers cust ON i.customer_id = cust.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: queryArgs,
  });

  const invoices = result.rows.map((row) => ({
    id: Number(row.id),
    invoiceNumber: String(row.invoice_number),
    customerName: String(row.customer_name),
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    remaining: Number(row.remaining),
    paymentStatus: String(row.payment_status),
    orderStatus: String(row.order_status),
    createdAt: String(row.created_at),
  }));

  return c.json({
    success: true,
    data: invoices,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/v1/invoices/:id
invoicesRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = getDbClient(c.env);

  const invoiceResult = await db.execute({
    sql: `
      SELECT i.*, cust.name as customer_name 
      FROM invoices i 
      JOIN customers cust ON i.customer_id = cust.id 
      WHERE i.id = ?
    `,
    args: [id],
  });

  if (invoiceResult.rows.length === 0) {
    throw new NotFoundError('الفاتورة غير موجودة');
  }

  const invoiceRow = invoiceResult.rows[0]!;

  const itemsResult = await db.execute({
    sql: 'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC',
    args: [id],
  });

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
      createdAt: String(invoiceRow.created_at),
      updatedAt: String(invoiceRow.updated_at),
    },
  });
});

// POST /api/v1/invoices (Atomic Creation + Financial Recalculation + Idempotency)
invoicesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createInvoiceSchema.parse(body);
  const db = getDbClient(c.env);

  // 1. Check Idempotency Key
  const idempotencyKey = data.idempotencyKey || c.req.header('x-idempotency-key');
  if (idempotencyKey) {
    const existing = await db.execute({
      sql: 'SELECT id FROM invoices WHERE idempotency_key = ?',
      args: [idempotencyKey],
    });
    if (existing.rows.length > 0) {
      // Return existing invoice ID directly
      const existingId = Number(existing.rows[0]!.id);
      return c.json({ success: true, data: { id: existingId, idempotencyReturned: true } }, 200);
    }
  }

  // 2. Validate Customer Exists
  const customerResult = await db.execute({
    sql: 'SELECT id FROM customers WHERE id = ? AND is_active = 1',
    args: [data.customerId],
  });
  if (customerResult.rows.length === 0) {
    throw new BusinessRuleError('الزبون غير موجود أو غير نشط');
  }

  // 3. Recalculate Line Items & Subtotal
  let calculatedSubtotal = 0;
  const processedItems = data.items.map((item) => {
    const { lineSubtotal, lineTotal } = calculateLineItem(item);
    calculatedSubtotal += lineTotal;
    return { ...item, lineSubtotal, lineTotal };
  });

  // 4. Calculate Invoice-level Discount & Final Total
  let invoiceDiscountAmount = 0;
  if (data.discountType === 'FIXED') {
    invoiceDiscountAmount = Math.min(calculatedSubtotal, data.discountValue);
  } else if (data.discountType === 'PERCENTAGE') {
    invoiceDiscountAmount = Math.round((calculatedSubtotal * data.discountValue) / 10_000);
    invoiceDiscountAmount = Math.min(calculatedSubtotal, invoiceDiscountAmount);
  }

  const finalTotal = calculatedSubtotal - invoiceDiscountAmount;

  // 5. Check Initial Payment
  const initialPayment = data.initialPaymentAmount || 0;
  if (initialPayment > finalTotal) {
    throw new BusinessRuleError('مبلغ الدفعة الأولى أكبر من إجمالي الفاتورة غير مسموح به');
  }

  const remaining = finalTotal - initialPayment;
  let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
  if (remaining === 0 && finalTotal > 0) {
    paymentStatus = 'PAID';
  } else if (initialPayment > 0) {
    paymentStatus = 'PARTIALLY_PAID';
  }

  // 6. Generate Invoice Number (Sequential: INV-100001)
  const countRes = await db.execute('SELECT COUNT(*) as count FROM invoices');
  const seq = Number(countRes.rows[0]?.count || 0) + 1;
  const invoiceNumber = `INV-${String(seq).padStart(6, '0')}`;

  // 7. Execute Multi-Statement Transaction
  const tx = await db.transaction('write');
  try {
    const invRes = await tx.execute({
      sql: `
        INSERT INTO invoices (
          invoice_number, customer_id, subtotal, discount_type, discount_value,
          total, amount_paid, remaining, payment_status, order_status, notes, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
        RETURNING id, created_at
      `,
      args: [
        invoiceNumber,
        data.customerId,
        calculatedSubtotal,
        data.discountType,
        data.discountValue,
        finalTotal,
        initialPayment,
        remaining,
        paymentStatus,
        data.notes || null,
        idempotencyKey || null,
      ],
    });

    const invoiceId = Number(invRes.rows[0]!.id);

    for (const item of processedItems) {
      await tx.execute({
        sql: `
          INSERT INTO invoice_items (
            invoice_id, product_id, product_name_snapshot, unit_name_snapshot,
            quantity, unit_price, discount_type, discount_value, line_subtotal, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          invoiceId,
          item.productId || null,
          item.productNameSnapshot,
          item.unitNameSnapshot,
          item.quantity,
          item.unitPrice,
          item.discountType,
          item.discountValue,
          item.lineSubtotal,
          item.lineTotal,
        ],
      });
    }

    if (initialPayment > 0) {
      await tx.execute({
        sql: `
          INSERT INTO payments (invoice_id, amount, payment_method, notes)
          VALUES (?, ?, 'CASH', 'الدفعة الأولى عند إنشاء الفاتورة')
        `,
        args: [invoiceId, initialPayment],
      });
    }

    await tx.commit();

    return c.json(
      {
        success: true,
        data: {
          id: invoiceId,
          invoiceNumber,
          total: finalTotal,
          amountPaid: initialPayment,
          remaining,
          paymentStatus,
        },
      },
      201
    );
  } catch (err) {
    await tx.rollback();
    throw err;
  }
});

// POST /api/v1/invoices/:id/payments (Add Subsequent Payment)
invoicesRoutes.post('/:id/payments', async (c) => {
  const invoiceId = Number(c.req.param('id'));
  const body = await c.req.json();
  const data = createPaymentSchema.parse(body);
  const db = getDbClient(c.env);

  const idempotencyKey = data.idempotencyKey || c.req.header('x-idempotency-key');
  if (idempotencyKey) {
    const existing = await db.execute({
      sql: 'SELECT id FROM payments WHERE idempotency_key = ?',
      args: [idempotencyKey],
    });
    if (existing.rows.length > 0) {
      return c.json({ success: true, data: { id: Number(existing.rows[0]!.id), idempotencyReturned: true } });
    }
  }

  const invoiceResult = await db.execute({
    sql: 'SELECT * FROM invoices WHERE id = ?',
    args: [invoiceId],
  });
  if (invoiceResult.rows.length === 0) {
    throw new NotFoundError('الفاتورة غير موجودة');
  }

  const invoice = invoiceResult.rows[0]!;
  if (String(invoice.order_status) === 'CANCELLED') {
    throw new BusinessRuleError('لا يمكن تسديد دفعة لفاتورة ملغاة');
  }

  const currentRemaining = Number(invoice.remaining);
  if (currentRemaining <= 0) {
    throw new BusinessRuleError('الفاتورة مدفوعة بالكامل بالفعل');
  }

  if (data.amount > currentRemaining) {
    throw new BusinessRuleError(`مبلغ الدفعة أكبر من المبلغ المتبقي (${currentRemaining / 100} شيكل)`);
  }

  const newAmountPaid = Number(invoice.amount_paid) + data.amount;
  const newRemaining = Number(invoice.total) - newAmountPaid;

  let newPaymentStatus: 'PARTIALLY_PAID' | 'PAID' = 'PARTIALLY_PAID';
  if (newRemaining === 0) {
    newPaymentStatus = 'PAID';
  }

  const tx = await db.transaction('write');
  try {
    const payRes = await tx.execute({
      sql: `
        INSERT INTO payments (invoice_id, amount, payment_method, notes, idempotency_key)
        VALUES (?, ?, ?, ?, ?) RETURNING id, created_at
      `,
      args: [invoiceId, data.amount, data.paymentMethod, data.notes || null, idempotencyKey || null],
    });

    await tx.execute({
      sql: `
        UPDATE invoices 
        SET amount_paid = ?, remaining = ?, payment_status = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
      args: [newAmountPaid, newRemaining, newPaymentStatus, invoiceId],
    });

    await tx.commit();

    return c.json(
      {
        success: true,
        data: {
          paymentId: Number(payRes.rows[0]!.id),
          invoiceId,
          amount: data.amount,
          newAmountPaid,
          newRemaining,
          paymentStatus: newPaymentStatus,
        },
      },
      201
    );
  } catch (err) {
    await tx.rollback();
    throw err;
  }
});

// GET /api/v1/invoices/:id/payments (Payment History)
invoicesRoutes.get('/:id/payments', async (c) => {
  const invoiceId = Number(c.req.param('id'));
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: 'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC',
    args: [invoiceId],
  });

  const payments = result.rows.map((row) => ({
    id: Number(row.id),
    invoiceId: Number(row.invoice_id),
    amount: Number(row.amount),
    paymentMethod: String(row.payment_method),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
  }));

  return c.json({
    success: true,
    data: payments,
  });
});

export default invoicesRoutes;
