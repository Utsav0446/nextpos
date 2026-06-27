import { query } from '@/db';

export async function getUserByEmail(email: string) {
  const sql = 'SELECT * FROM users WHERE email = $1 LIMIT 1';
  const result = await query(sql, [email]);
  return result.rows[0] || null;
}

export async function getUserById(id: number) {
  const sql = 'SELECT id, email, created_at FROM users WHERE id = $1 LIMIT 1';
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

export async function updateAdminPassword(userId: number, newPasswordHash: string): Promise<boolean> {
  const sql = 'UPDATE users SET password_hash = $1 WHERE id = $2';
  const result = await query(sql, [newPasswordHash, userId]);
  return (result.rowCount ?? 0) > 0;
}
