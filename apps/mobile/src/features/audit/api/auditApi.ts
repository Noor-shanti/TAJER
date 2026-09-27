import type { ApiSuccessResponse, AuditLog } from '@merchant/shared';
import { apiClient } from '../../../services/api/client';

export const auditApi = {
  async getLogs(entityType: 'CUSTOMER' | 'PRODUCT' | 'INVOICE', entityId: number): Promise<ApiSuccessResponse<AuditLog[]>> {
    return apiClient(`/audit-logs/${entityType}/${entityId}`);
  },
};
