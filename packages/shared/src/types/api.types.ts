import type { DiscountType } from '../enums/DiscountType';
import type { OrderStatus } from '../enums/OrderStatus';
import type { PaymentMethod } from '../enums/PaymentMethod';
import type { PaymentStatus } from '../enums/PaymentStatus';

// ─── Common ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Customer ──────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: number;
  name: string;
  phone: string | null;
  isActive: boolean;
  /** Total outstanding balance across all invoices, in minor units (agorot) */
  totalRemaining: number;
}

// ─── Category ──────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Product Unit ──────────────────────────────────────────────────────────

export interface ProductUnit {
  id: number;
  nameAr: string;  // كروز
  nameEn: string;  // Carton
  symbol: string;  // CARTON
  createdAt: string;
}

// ─── Product ───────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  unitId: number;
  unitNameAr: string;
  name: string;
  /** Current price in minor units (agorot). May differ from invoice snapshot price. */
  currentPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Invoice Item ──────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId: number | null;
  /** Snapshot: product name at time of sale — never changes */
  productNameSnapshot: string;
  /** Snapshot: unit name at time of sale — never changes */
  unitNameSnapshot: string;
  /** Quantity in minor units (scale 1000). 500 = 0.5 carton */
  quantity: number;
  /** Unit price in minor units (agorot). 7400 = 74.00 ILS */
  unitPrice: number;
  discountType: DiscountType;
  /** If FIXED: agorot. If PERCENTAGE: basis points (1000 = 10%) */
  discountValue: number;
  /** quantity × unitPrice (before discount), in agorot */
  lineSubtotal: number;
  /** lineSubtotal - item discount, in agorot */
  lineTotal: number;
  createdAt: string;
}

// ─── Invoice ───────────────────────────────────────────────────────────────

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  /** Sum of all lineTotal values, in agorot */
  subtotal: number;
  discountType: DiscountType;
  /** If FIXED: agorot. If PERCENTAGE: basis points */
  discountValue: number;
  /** Final total after invoice-level discount, in agorot */
  total: number;
  /** Sum of all payments, in agorot */
  amountPaid: number;
  /** total - amountPaid, in agorot */
  remaining: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListItem {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  total: number;
  amountPaid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

// ─── Payment ───────────────────────────────────────────────────────────────

export interface Payment {
  id: number;
  invoiceId: number;
  /** Amount in minor units (agorot) */
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
}
