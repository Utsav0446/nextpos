import { query } from '@/db';
import { AuditLog } from '@/types';

export async function getAuditLogs(limit: number = 20): Promise<AuditLog[]> {
  const sql = 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1';
  const result = await query(sql, [limit]);
  return result.rows;
}

export async function addAuditLog(action: string, details?: string): Promise<void> {
  const sql = 'INSERT INTO audit_logs (action, details) VALUES ($1, $2)';
  await query(sql, [action, details || null]);
}
