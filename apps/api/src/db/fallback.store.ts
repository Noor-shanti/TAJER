// One shared in-memory store for local development when Turso is not configured.
// It keeps local screens consistent, but it is intentionally not a production database.
export const fallbackCustomers: any[] = [
  { id: 1, name: 'أحمد المحمود', phone: '0599123456', notes: 'زبون دائم', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: 'سارة خالد', phone: '0598765432', notes: 'محل السعادة', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const fallbackInvoices: any[] = [
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

export const fallbackAuditLogs: any[] = [];

export function addFallbackAuditLog(entityType: 'CUSTOMER' | 'PRODUCT' | 'INVOICE', entityId: number, action: string, description: string) {
  fallbackAuditLogs.unshift({ id: fallbackAuditLogs.length + 1, entityType, entityId, action, description, createdAt: new Date().toISOString() });
}

export function getFallbackCustomerRemaining(customerId: number) {
  return fallbackInvoices
    .filter((invoice) => invoice.customerId === customerId && invoice.orderStatus !== 'CANCELLED')
    .reduce((sum, invoice) => sum + Math.max(0, invoice.remaining || 0), 0);
}

export function getFallbackDebtSummary() {
  const openInvoices = fallbackInvoices.filter(
    (invoice) => invoice.remaining > 0 && invoice.orderStatus !== 'CANCELLED'
  );
  return {
    totalRemaining: openInvoices.reduce((sum, invoice) => sum + invoice.remaining, 0),
    activeCustomers: fallbackCustomers.filter((customer) => customer.isActive).length,
    openInvoices: openInvoices.length,
  };
}
