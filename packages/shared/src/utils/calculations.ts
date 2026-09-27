import { MAX_DISCOUNT_BASIS_POINTS, MONEY_SCALE, QUANTITY_SCALE } from '../constants';
import type { DiscountType } from '../enums/DiscountType';
import type { PaymentStatus } from '../enums/PaymentStatus';

/**
 * Calculates line subtotal for fractional quantity and unit price.
 * @param quantityMinor Quantity in minor units (scale 1000, 500 = 0.5)
 * @param unitPriceMinor Unit price in minor units (scale 100, 7400 = 74.00 ILS)
 * @returns Line subtotal in minor units (agorot)
 */
export function calculateLineSubtotal(quantityMinor: number, unitPriceMinor: number): number {
  if (quantityMinor <= 0 || unitPriceMinor < 0) return 0;
  return Math.round((quantityMinor * unitPriceMinor) / QUANTITY_SCALE);
}

/**
 * Calculates discount amount for line item or invoice.
 * @param subtotalMinor Amount before discount in minor units
 * @param discountType 'NONE' | 'FIXED' | 'PERCENTAGE'
 * @param discountValue Fixed amount in agorot OR percentage in basis points (1000 = 10%)
 */
export function calculateDiscountAmount(
  subtotalMinor: number,
  discountType: DiscountType,
  discountValue: number
): number {
  if (subtotalMinor <= 0 || discountType === 'NONE' || discountValue <= 0) {
    return 0;
  }

  if (discountType === 'FIXED') {
    return Math.min(subtotalMinor, discountValue);
  }

  if (discountType === 'PERCENTAGE') {
    const cappedPercentage = Math.min(MAX_DISCOUNT_BASIS_POINTS, discountValue);
    const discountAmount = Math.round((subtotalMinor * cappedPercentage) / MAX_DISCOUNT_BASIS_POINTS);
    return Math.min(subtotalMinor, discountAmount);
  }

  return 0;
}

/**
 * Derives payment status cleanly from total and amount paid.
 */
export function derivePaymentStatus(totalMinor: number, amountPaidMinor: number): PaymentStatus {
  if (totalMinor <= 0) return 'PAID';
  if (amountPaidMinor <= 0) return 'UNPAID';
  if (amountPaidMinor >= totalMinor) return 'PAID';
  return 'PARTIALLY_PAID';
}

/**
 * Validates if a new payment amount would exceed the remaining invoice balance.
 */
export function validatePaymentAmount(
  currentRemainingMinor: number,
  paymentAmountMinor: number
): { isValid: boolean; error?: string } {
  if (paymentAmountMinor <= 0) {
    return { isValid: false, error: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' };
  }
  if (paymentAmountMinor > currentRemainingMinor) {
    return {
      isValid: false,
      error: `مبلغ الدفعة أكبر من المبلغ المتبقي (${currentRemainingMinor / MONEY_SCALE} شيكل)`,
    };
  }
  return { isValid: true };
}
