/**
 * Pagination defaults and limits.
 * Shared between API (enforcement) and mobile (request formation).
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Money scale factor.
 * All monetary values are stored as integers in minor units (agorot).
 * 1 ILS = 100 agorot → MONEY_SCALE = 100
 *
 * Example: 74.50 ILS → 7450 stored in DB
 */
export const MONEY_SCALE = 100 as const;

/**
 * Quantity scale factor.
 * Quantities are stored as integers scaled by 1000.
 * Supports up to 3 decimal places of precision.
 *
 * Example: 0.5 carton → 500 stored in DB
 * Example: 1.25 carton → 1250 stored in DB
 */
export const QUANTITY_SCALE = 1000 as const;

/**
 * Maximum percentage discount allowed (100%).
 * Stored as basis points: 10000 = 100%
 */
export const MAX_DISCOUNT_BASIS_POINTS = 10_000 as const;

/**
 * Invoice number prefix.
 * Format: INV-000001
 */
export const INVOICE_NUMBER_PREFIX = 'INV' as const;
