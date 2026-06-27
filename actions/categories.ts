'use server';

import { revalidatePath } from 'next/cache';
import { createCategory, updateCategory, softDeleteCategory } from '@/queries/categories';
import { categorySchema, CategoryInput } from '@/schemas/menu';
import { getCurrentUser } from '@/lib/auth';

export async function saveCategoryAction(id: number | null, data: CategoryInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid inputs. Check name length.' };
  }

  const { name, description } = parsed.data;

  try {
    if (id) {
      await updateCategory(id, name, description);
    } else {
      await createCategory(name, description);
    }
    revalidatePath('/menu');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    if (error.code === '23505') {
      return { error: 'A category with this name already exists.' };
    }
    return { error: error.message || 'Failed to save category.' };
  }
}

export async function deleteCategoryAction(id: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await softDeleteCategory(id);
    revalidatePath('/menu');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete category.' };
  }
}
