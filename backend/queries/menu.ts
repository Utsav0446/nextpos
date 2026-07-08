import { supabase } from '@/db';
import { MenuItem } from '@/types';

interface GetMenuItemsOptions {
  search?: string;
  categoryId?: number;
  limit?: number;
  offset?: number;
  includeUnavailable?: boolean;
}

export async function getMenuItems(options: GetMenuItemsOptions = {}): Promise<MenuItem[]> {
  const { search, categoryId, limit, offset, includeUnavailable = true } = options;

  let req = supabase
    .from('menu_items')
    .select(`
      *,
      category:categories!inner(name, name_gu, name_hi, deleted_at)
    `)
    .is('deleted_at', null)
    .is('category.deleted_at', null);

  if (!includeUnavailable) {
    req = req.eq('is_available', true);
  }

  if (categoryId) {
    req = req.eq('category_id', categoryId);
  }

  if (search) {
    req = req.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  req = req.order('name', { foreignTable: 'categories', ascending: true })
            .order('name', { ascending: true });

  if (limit !== undefined && offset !== undefined) {
    req = req.range(offset, offset + limit - 1);
  }

  const { data, error } = await req;
  if (error) throw error;

  return (data || []).map((m: any) => ({
    ...m,
    category_name: m.category?.name,
    category_name_gu: m.category?.name_gu,
    category_name_hi: m.category?.name_hi,
  }));
}

export async function countMenuItems(options: Omit<GetMenuItemsOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const { search, categoryId, includeUnavailable = true } = options;

  let req = supabase
    .from('menu_items')
    .select(`
      *,
      category:categories!inner(deleted_at)
    `, { count: 'exact', head: true })
    .is('deleted_at', null)
    .is('category.deleted_at', null);

  if (!includeUnavailable) {
    req = req.eq('is_available', true);
  }

  if (categoryId) {
    req = req.eq('category_id', categoryId);
  }

  if (search) {
    req = req.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { count, error } = await req;
  if (error) throw error;
  return count || 0;
}

export async function getMenuItemById(id: number): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(name, name_gu, name_hi, deleted_at)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data || (data.category && data.category.deleted_at !== null)) return null;

  return {
    ...data,
    category_name: data.category?.name,
    category_name_gu: data.category?.name_gu,
    category_name_hi: data.category?.name_hi,
  };
}

export async function createMenuItem(item: {
  category_id: number;
  name: string;
  name_gu: string;
  name_hi: string;
  description?: string;
  description_gu?: string;
  description_hi?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  preparation_time?: number;
  allow_spice: boolean;
  allow_prep: boolean;
  allow_notes: boolean;
  allow_texture: boolean;
  default_spice: string;
  default_prep: string;
  default_texture: string;
  show_popup: boolean;
}): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      category_id: item.category_id,
      name: item.name,
      name_gu: item.name_gu,
      name_hi: item.name_hi,
      description: item.description || null,
      description_gu: item.description_gu || null,
      description_hi: item.description_hi || null,
      price: item.price,
      image_url: item.image_url || null,
      is_available: item.is_available ?? true,
      is_veg: item.is_veg ?? true,
      preparation_time: item.preparation_time || null,
      allow_spice: item.allow_spice ?? true,
      allow_prep: item.allow_prep ?? true,
      allow_notes: item.allow_notes ?? true,
      allow_texture: item.allow_texture ?? false,
      default_spice: item.default_spice || 'Regular',
      default_prep: item.default_prep || 'Regular',
      default_texture: item.default_texture || 'Regular',
      show_popup: item.show_popup ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMenuItem(
  id: number,
  item: {
    category_id: number;
    name: string;
    name_gu: string;
    name_hi: string;
    description?: string;
    description_gu?: string;
    description_hi?: string;
    price: number;
    image_url?: string;
    is_available: boolean;
    is_veg: boolean;
    preparation_time?: number;
    allow_spice: boolean;
    allow_prep: boolean;
    allow_notes: boolean;
    allow_texture: boolean;
    default_spice: string;
    default_prep: string;
    default_texture: string;
    show_popup: boolean;
  }
): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      category_id: item.category_id,
      name: item.name,
      name_gu: item.name_gu,
      name_hi: item.name_hi,
      description: item.description || null,
      description_gu: item.description_gu || null,
      description_hi: item.description_hi || null,
      price: item.price,
      image_url: item.image_url || null,
      is_available: item.is_available,
      is_veg: item.is_veg,
      preparation_time: item.preparation_time || null,
      allow_spice: item.allow_spice,
      allow_prep: item.allow_prep,
      allow_notes: item.allow_notes,
      allow_texture: item.allow_texture,
      default_spice: item.default_spice,
      default_prep: item.default_prep,
      default_texture: item.default_texture,
      show_popup: item.show_popup,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function softDeleteMenuItem(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('menu_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw error;
  return true;
}
