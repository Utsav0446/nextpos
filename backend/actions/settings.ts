'use server';

import { revalidatePath } from 'next/cache';
import { updateSettings, clearSettingsCache } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';

import { SettingsInput } from '@/schemas/settings';

export async function saveSettingsAction(data: SettingsInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  if (!data.restaurant_name || data.restaurant_name.trim() === '') {
    return { error: 'Restaurant name cannot be blank.' };
  }

  try {
    // Clear stale cache before saving so next read gets fresh data
    clearSettingsCache();

    await updateSettings(data);

    // Clear again after save to ensure fresh data on next read
    clearSettingsCache();

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save settings.' };
  }
}

export async function resetTokenNoAction() {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const { supabase } = await import('@/db');
    await supabase.from('restaurant_settings').update({ updated_at: new Date().toISOString() }).eq('id', 1);
    clearSettingsCache();
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to reset token number.' };
  }
}
