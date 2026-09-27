import type { ApiSuccessResponse, CustomerDebtSummary, CustomerSummary } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  notes?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload> & { isActive?: boolean };

export const customersApi = {
  async getCustomers(search = '', page = 1): Promise<ApiSuccessResponse<CustomerSummary[]>> {
    return await apiClient<ApiSuccessResponse<CustomerSummary[]>>('/customers', {
      params: { search, page, limit: 20 },
    });
  },

  async getCustomerById(id: number): Promise<ApiSuccessResponse<CustomerSummary>> {
    return await apiClient<ApiSuccessResponse<CustomerSummary>>(`/customers/${id}`);
  },

  async getDebtSummary(): Promise<ApiSuccessResponse<CustomerDebtSummary>> {
    return await apiClient<ApiSuccessResponse<CustomerDebtSummary>>('/customers/summary/debts');
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<ApiSuccessResponse<CustomerSummary>> {
    return await apiClient<ApiSuccessResponse<CustomerSummary>>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCustomer(id: number, payload: UpdateCustomerPayload): Promise<ApiSuccessResponse<{ id: number }>> {
    return apiClient(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  async archiveCustomer(id: number): Promise<ApiSuccessResponse<{ id: number }>> {
    return apiClient(`/customers/${id}`, { method: 'DELETE' });
  },
};
