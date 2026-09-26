/**
 * Payment status — derived from financial data, never manually set by client.
 *
 * UNPAID         → amount_paid = 0
 * PARTIALLY_PAID → 0 < amount_paid < total
 * PAID           → amount_paid = total (remaining = 0)
 */
export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
