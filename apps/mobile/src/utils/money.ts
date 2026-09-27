import { MONEY_SCALE } from '@merchant/shared';

/**
 * Format minor units (agorot) into human-readable Arabic ILS formatted string.
 * Example: 7400 agorot => "74.00 ₪"
 * Example: 50 agorot => "0.50 ₪"
 */
export function formatMoney(minorUnits: number): string {
  if (isNaN(minorUnits)) return '0.00 ₪';
  const majorUnits = minorUnits / MONEY_SCALE;
  return `${majorUnits.toFixed(2)} ₪`;
}

/**
 * Convert human user decimal string input into minor units integer (agorot).
 * Example: "74.5" => 7450
 * Example: "0.5" => 50
 */
export function parseMoneyInput(input: string): number {
  const clean = input.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * MONEY_SCALE);
}
