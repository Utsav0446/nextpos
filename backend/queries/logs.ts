import { supabase } from '@/db';
import { AuditLog } from '@/types';

export async function getAuditLogs(limit: number = 20): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function addAuditLog(action: string, details?: string): Promise<void> {
  const { error } = await supabase
    .from('audit_logs')
    .insert({ action, details: details || null });

  if (error) throw error;
}
