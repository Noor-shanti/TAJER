import type { ApiSuccessResponse, CustomerSummary } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  notes?: string;
}

export const customersApi = {
  async getCustomers(search = '', page = 1): Promise<ApiSuccessResponse<CustomerSummary[]>> {
    return await apiClient<ApiSuccessResponse<CustomerSummary[]>>('/customers', {
      params: { search, page, limit: 20 },
    });
  },

  async getCustomerById(id: number): Promise<ApiSuccessResponse<CustomerSummary>> {
    return await apiClient<ApiSuccessResponse<CustomerSummary>>(`/customers/${id}`);
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<ApiSuccessResponse<CustomerSummary>> {
    return await apiClient<ApiSuccessResponse<CustomerSummary>>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
