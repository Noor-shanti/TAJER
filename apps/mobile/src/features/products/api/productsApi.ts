import type { ApiSuccessResponse, Product, ProductUnit } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export interface CreateProductPayload {
  name: string;
  unitId: number;
  currentPrice: number; // Minor units
  categoryId?: number;
}

export const productsApi = {
  async getProducts(search = '', page = 1): Promise<ApiSuccessResponse<Product[]>> {
    return await apiClient<ApiSuccessResponse<Product[]>>('/products', {
      params: { search, page, limit: 50 },
    });
  },

  async getUnits(): Promise<ApiSuccessResponse<ProductUnit[]>> {
    return await apiClient<ApiSuccessResponse<ProductUnit[]>>('/units');
  },

  async createProduct(payload: CreateProductPayload): Promise<ApiSuccessResponse<Product>> {
    return await apiClient<ApiSuccessResponse<Product>>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
