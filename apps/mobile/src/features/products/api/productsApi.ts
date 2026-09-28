import type { ApiSuccessResponse, Category, Product, ProductUnit } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export interface CreateProductPayload {
  name: string;
  unitId: number;
  currentPrice: number; // Minor units
  categoryId?: number;
  stockQuantity: number;
  reorderLevel: number;
}

export type UpdateProductPayload = Partial<CreateProductPayload> & { isActive?: boolean };

export interface CreateCategoryPayload {
  name: string;
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

  async getCategories(): Promise<ApiSuccessResponse<Category[]>> {
    return await apiClient<ApiSuccessResponse<Category[]>>('/categories');
  },

  async createCategory(payload: CreateCategoryPayload): Promise<ApiSuccessResponse<Category>> {
    return await apiClient<ApiSuccessResponse<Category>>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createProduct(payload: CreateProductPayload): Promise<ApiSuccessResponse<Product>> {
    return await apiClient<ApiSuccessResponse<Product>>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProductById(id: number): Promise<ApiSuccessResponse<Product>> {
    return apiClient(`/products/${id}`);
  },

  async updateProduct(id: number, payload: UpdateProductPayload): Promise<ApiSuccessResponse<{ id: number }>> {
    return apiClient(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  async archiveProduct(id: number): Promise<ApiSuccessResponse<{ id: number }>> {
    return apiClient(`/products/${id}`, { method: 'DELETE' });
  },
};
