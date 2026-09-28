import { QUANTITY_SCALE } from '@merchant/shared';

/**
 * Format minor quantity units into decimal string for UI.
 * Example: 500 => "0.5"
 * Example: 1500 => "1.5"
 * Example: 1000 => "1"
 */
export function formatQuantity(minorQuantity: number): string {
  if (isNaN(minorQuantity)) return '0';
  const major = minorQuantity / QUANTITY_SCALE;
  return Number(major.toFixed(3)).toString();
}

/**
 * Parse human decimal input string into minor integer quantity.
 * Example: "0.5" => 500
 * Example: "1.5" => 1500
 */
export function parseQuantityInput(input: string): number {
  const clean = input.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * QUANTITY_SCALE);
}

/** Groups quantities by their real unit so cartons and pieces are never added together misleadingly. */
export function formatQuantitySummary(items: Array<{ quantity: number; unitName: string }>): string {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.unitName, (totals.get(item.unitName) || 0) + item.quantity);
  }
  return Array.from(totals.entries())
    .map(([unitName, quantity]) => `${formatQuantity(quantity)} ${unitName}`)
    .join(' + ');
}
