/**
 * Payment method options.
 * MVP: Cash only. TRANSFER and OTHER kept for future use.
 */
export const PaymentMethod = {
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
