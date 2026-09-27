export type AuditEntityType = 'CUSTOMER' | 'PRODUCT' | 'INVOICE';

type SqlExecutor = {
  execute: (statement: { sql: string; args: Array<string | number | null> }) => Promise<unknown>;
};

export async function writeAuditLog(
  db: SqlExecutor,
  entityType: AuditEntityType,
  entityId: number,
  action: string,
  description: string
) {
  await db.execute({
    sql: 'INSERT INTO audit_logs (entity_type, entity_id, action, description) VALUES (?, ?, ?, ?)',
    args: [entityType, entityId, action, description],
  });
}
