'use server';

import { revalidatePath } from 'next/cache';
import { updateSettings } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';

import { SettingsInput } from '@/schemas/settings';

export async function saveSettingsAction(data: SettingsInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  if (!data.restaurant_name || data.restaurant_name.trim() === '') {
    return { error: 'Restaurant name cannot be blank.' };
  }

  try {
    await updateSettings(data);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save settings.' };
  }
}
