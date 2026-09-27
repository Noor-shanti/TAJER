import { Hono } from 'hono';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { fallbackAuditLogs } from '../db/fallback.store';
import { BusinessRuleError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';

const auditRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
auditRoutes.use('*', authMiddleware);

auditRoutes.get('/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType').toUpperCase();
  const entityId = Number(c.req.param('entityId'));
  if (!['CUSTOMER', 'PRODUCT', 'INVOICE'].includes(entityType) || !Number.isInteger(entityId) || entityId <= 0) {
    throw new BusinessRuleError('طلب سجل التغييرات غير صحيح');
  }

  try {
    const db = getDbClient(c.env);
    const result = await db.execute({
      sql: 'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC, id DESC LIMIT 50',
      args: [entityType, entityId],
    });
    return c.json({
      success: true,
      data: result.rows.map((row) => ({
        id: Number(row.id), entityType: String(row.entity_type), entityId: Number(row.entity_id),
        action: String(row.action), description: String(row.description), createdAt: String(row.created_at),
      })),
    });
  } catch (err) {
    if (!shouldUseLocalFallback(c.env)) throw err;
    return c.json({ success: true, data: fallbackAuditLogs.filter((log) => log.entityType === entityType && log.entityId === entityId) });
  }
});

export default auditRoutes;
