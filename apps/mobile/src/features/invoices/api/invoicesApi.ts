import type { ApiSuccessResponse, Invoice, InvoiceListItem, Payment, SalesReport } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export interface CreateInvoiceItemPayload {
  productId?: number;
  productNameSnapshot: string;
  unitNameSnapshot: string;
  quantity: number; // Scale 1000
  unitPrice: number; // Minor units
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
}

export interface CreateInvoicePayload {
  customerId: number;
  items: CreateInvoiceItemPayload[];
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  initialPaymentAmount: number; // Minor units
  notes?: string;
  idempotencyKey?: string;
}

export interface CreatePaymentPayload {
  amount: number; // Minor units
  paymentMethod: 'CASH' | 'TRANSFER' | 'OTHER';
  notes?: string;
  idempotencyKey?: string;
}

export const invoicesApi = {
  async getInvoices(search = '', page = 1): Promise<ApiSuccessResponse<InvoiceListItem[]>> {
    return await apiClient<ApiSuccessResponse<InvoiceListItem[]>>('/invoices', {
      params: { search, page, limit: 20 },
    });
  },

  async getInvoicesByCustomer(customerId: number): Promise<ApiSuccessResponse<InvoiceListItem[]>> {
    return await apiClient<ApiSuccessResponse<InvoiceListItem[]>>(`/invoices/customer/${customerId}`);
  },

  async getInvoiceById(id: number): Promise<ApiSuccessResponse<Invoice>> {
    return await apiClient<ApiSuccessResponse<Invoice>>(`/invoices/${id}`);
  },

  async getSalesReport(from: string, to: string): Promise<ApiSuccessResponse<SalesReport>> {
    return await apiClient<ApiSuccessResponse<SalesReport>>('/invoices/reports/sales', {
      params: { from, to },
    });
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<ApiSuccessResponse<{ id: number; invoiceNumber: string }>> {
    return await apiClient<ApiSuccessResponse<{ id: number; invoiceNumber: string }>>('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotencyKey,
    });
  },

  async addPayment(invoiceId: number, payload: CreatePaymentPayload): Promise<ApiSuccessResponse<Payment>> {
    return await apiClient<ApiSuccessResponse<Payment>>(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotencyKey,
    });
  },

  async updateOrderStatus(invoiceId: number, orderStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'): Promise<ApiSuccessResponse<{ id: number; orderStatus: string }>> {
    return await apiClient<ApiSuccessResponse<{ id: number; orderStatus: string }>>(`/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus }),
    });
  },
};
