// Enums
export { OrderStatus } from './enums/OrderStatus';
export type { OrderStatus as OrderStatusType } from './enums/OrderStatus';

export { PaymentStatus } from './enums/PaymentStatus';
export type { PaymentStatus as PaymentStatusType } from './enums/PaymentStatus';

export { DiscountType } from './enums/DiscountType';
export type { DiscountType as DiscountTypeValue } from './enums/DiscountType';

export { PaymentMethod } from './enums/PaymentMethod';
export type { PaymentMethod as PaymentMethodValue } from './enums/PaymentMethod';

// Constants
export {
  PAGINATION,
  MONEY_SCALE,
  QUANTITY_SCALE,
  MAX_DISCOUNT_BASIS_POINTS,
  INVOICE_NUMBER_PREFIX,
} from './constants/index';

// Calculations
export {
  calculateLineSubtotal,
  calculateDiscountAmount,
  derivePaymentStatus,
  validatePaymentAmount,
} from './utils/calculations';

// Types
export type {
  PaginationMeta,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  Customer,
  CustomerSummary,
  CustomerDebtSummary,
  Category,
  ProductUnit,
  Product,
  StockMovement,
  InvoiceItem,
  Invoice,
  InvoiceListItem,
  SalesReport,
  SalesReportItem,
  AuditLog,
  Payment,
} from './types/api.types';
