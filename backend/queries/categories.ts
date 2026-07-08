import { supabase } from '@/db';
import { Category } from '@/types';

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCategory(
  name: string,
  description?: string,
  name_hi?: string,
  name_gu?: string,
  description_hi?: string,
  description_gu?: string
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      description: description || null,
      name_hi: name_hi || null,
      name_gu: name_gu || null,
      description_hi: description_hi || null,
      description_gu: description_gu || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: number,
  name: string,
  description?: string,
  name_hi?: string,
  name_gu?: string,
  description_hi?: string,
  description_gu?: string
): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      name,
      description: description || null,
      name_hi: name_hi || null,
      name_gu: name_gu || null,
      description_hi: description_hi || null,
      description_gu: description_gu || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function softDeleteCategory(id: number): Promise<boolean> {
  // Check if there are any active menu items in this category
  const { count, error: checkError } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)
    .is('deleted_at', null);

  if (checkError) throw checkError;
  if (count && count > 0) {
    throw new Error('Cannot delete category because it has active food items.');
  }

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw error;
  return true;
}
