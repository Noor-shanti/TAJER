import { describe, expect, it } from 'vitest';
import {
  calculateDiscountAmount,
  calculateLineSubtotal,
  derivePaymentStatus,
  validatePaymentAmount,
} from './calculations';

describe('Financial Business Logic & Money Precision Tests', () => {
  describe('calculateLineSubtotal', () => {
    it('should correctly calculate subtotal for whole quantities and prices', () => {
      // 2 cartons * 74.00 ILS (7400 agorot) = 148.00 ILS (14800 agorot)
      const result = calculateLineSubtotal(2000, 7400);
      expect(result).toBe(14800);
    });

    it('should correctly calculate subtotal for fractional quantity (0.5 carton)', () => {
      // 0.5 carton (500 minor) * 74.00 ILS (7400 agorot) = 37.00 ILS (3700 agorot)
      const result = calculateLineSubtotal(500, 7400);
      expect(result).toBe(3700);
    });

    it('should correctly calculate subtotal for fractional price and fractional quantity', () => {
      // 1.5 cartons (1500 minor) * 10.25 ILS (1025 agorot) = 15.375 => rounded to 15.38 ILS (1538 agorot)
      const result = calculateLineSubtotal(1500, 1025);
      expect(result).toBe(1538);
    });

    it('should return 0 for zero or negative quantity', () => {
      expect(calculateLineSubtotal(0, 7400)).toBe(0);
      expect(calculateLineSubtotal(-500, 7400)).toBe(0);
    });
  });

  describe('calculateDiscountAmount', () => {
    it('should calculate FIXED discount in agorot correctly', () => {
      // Subtotal 100.00 ILS (10000 agorot), fixed discount 5.00 ILS (500 agorot) => discount = 500 agorot
      const discount = calculateDiscountAmount(10000, 'FIXED', 500);
      expect(discount).toBe(500);
    });

    it('should cap FIXED discount to not exceed subtotal', () => {
      // Subtotal 10.00 ILS (1000 agorot), fixed discount 20.00 ILS (2000 agorot) => discount capped at 1000
      const discount = calculateDiscountAmount(1000, 'FIXED', 2000);
      expect(discount).toBe(1000);
    });

    it('should calculate PERCENTAGE discount in basis points (10% = 1000 bps)', () => {
      // Subtotal 200.00 ILS (20000 agorot), 10% discount (1000 bps) => 20.00 ILS (2000 agorot)
      const discount = calculateDiscountAmount(20000, 'PERCENTAGE', 1000);
      expect(discount).toBe(2000);
    });
  });

  describe('derivePaymentStatus', () => {
    it('should return UNPAID when amount paid is 0', () => {
      expect(derivePaymentStatus(10000, 0)).toBe('UNPAID');
    });

    it('should return PARTIALLY_PAID when amount paid is less than total', () => {
      expect(derivePaymentStatus(10000, 5000)).toBe('PARTIALLY_PAID');
    });

    it('should return PAID when amount paid equals or exceeds total', () => {
      expect(derivePaymentStatus(10000, 10000)).toBe('PAID');
      expect(derivePaymentStatus(10000, 12000)).toBe('PAID');
    });
  });

  describe('validatePaymentAmount (Overpayment Guard)', () => {
    it('should approve valid partial payment', () => {
      const res = validatePaymentAmount(5000, 2000);
      expect(res.isValid).toBe(true);
    });

    it('should reject payment greater than remaining balance', () => {
      // Remaining = 50.00 ILS (5000 agorot), Payment attempted = 60.00 ILS (6000 agorot)
      const res = validatePaymentAmount(5000, 6000);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('أكبر من المبلغ المتبقي');
    });
  });
});
