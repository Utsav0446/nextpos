'use server';

import { revalidatePath } from 'next/cache';
import { updateSettings } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';

export async function saveSettingsAction(data: {
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  printer_name?: string | null;
}) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  if (!data.restaurant_name || data.restaurant_name.trim() === '') {
    return { error: 'Restaurant name cannot be blank.' };
  }

  try {
    await updateSettings(data);
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    revalidatePath('/billing');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save settings.' };
  }
}
