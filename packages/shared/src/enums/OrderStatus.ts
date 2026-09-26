/**
 * Order lifecycle status.
 * Payment status is tracked separately in PaymentStatus.
 *
 * DRAFT      → Being built on mobile (in-memory only, not saved to DB)
 * CONFIRMED  → Saved and active (default when merchant confirms)
 * COMPLETED  → Fully delivered and paid
 * CANCELLED  → Cancelled; kept for historical record
 */
export const OrderStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
