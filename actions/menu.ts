'use server';

import { revalidatePath } from 'next/cache';
import { createMenuItem, updateMenuItem, softDeleteMenuItem } from '@/queries/menu';
import { menuItemSchema, MenuItemInput } from '@/schemas/menu';
import { getCurrentUser } from '@/lib/auth';

export async function saveMenuItemAction(id: number | null, data: MenuItemInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = menuItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid item data. Please double check prices and selections.' };
  }

  try {
    if (id) {
      await updateMenuItem(id, parsed.data);
    } else {
      await createMenuItem(parsed.data);
    }
    revalidatePath('/menu');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save menu item.' };
  }
}

export async function deleteMenuItemAction(id: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await softDeleteMenuItem(id);
    revalidatePath('/menu');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete menu item.' };
  }
}
