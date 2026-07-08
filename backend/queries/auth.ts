import { supabase } from '@/db';

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserById(id: number) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateAdminPassword(userId: number, newPasswordHash: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', userId);

  if (error) throw error;
  return true;
}

export async function updateAdminEmail(userId: number, newEmail: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ email: newEmail })
    .eq('id', userId);

  if (error) throw error;
  return true;
}
