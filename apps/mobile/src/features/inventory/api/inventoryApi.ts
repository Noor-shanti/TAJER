import type { ApiSuccessResponse, StockMovement } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export interface SetStockPayload {
  quantity: number;
  reorderLevel?: number;
  notes?: string;
}

export interface ReceiveStockPayload {
  quantity: number;
  notes?: string;
}

export const inventoryApi = {
  async setStock(productId: number, payload: SetStockPayload): Promise<ApiSuccessResponse<{ productId: number; stockQuantity: number; reorderLevel: number }>> {
    return apiClient(`/inventory/${productId}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async receiveStock(productId: number, payload: ReceiveStockPayload): Promise<ApiSuccessResponse<{ productId: number; stockQuantity: number }>> {
    return apiClient(`/inventory/${productId}/receive`, { method: 'POST', body: JSON.stringify(payload) });
  },
  async getMovements(productId: number): Promise<ApiSuccessResponse<StockMovement[]>> {
    return apiClient(`/inventory/${productId}/movements`);
  },
  async getLowStock(): Promise<ApiSuccessResponse<Array<{ id: number; name: string; unitNameAr: string; stockQuantity: number; reorderLevel: number }>>> {
    return apiClient('/inventory/low-stock');
  },
};
