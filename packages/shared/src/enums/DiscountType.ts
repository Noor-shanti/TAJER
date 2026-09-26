/**
 * Discount type for both invoice-level and item-level discounts.
 *
 * NONE       → No discount applied
 * FIXED      → Fixed amount in minor units (agorot). e.g., 500 = 5.00 ILS off
 * PERCENTAGE → Percentage in basis points. e.g., 1000 = 10% off
 *
 * Using basis points for percentage avoids floating-point representation issues.
 * 100 basis points = 1%, 10000 basis points = 100% (maximum allowed)
 */
export const DiscountType = {
  NONE: 'NONE',
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
} as const;

export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];
