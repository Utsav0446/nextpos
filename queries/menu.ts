import { query } from '@/db';
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
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT m.*, c.name as category_name 
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.deleted_at IS NULL AND c.deleted_at IS NULL
  `;

  if (!includeUnavailable) {
    sql += ` AND m.is_available = TRUE`;
  }

  if (categoryId) {
    sql += ` AND m.category_id = $${paramCount}`;
    params.push(categoryId);
    paramCount++;
  }

  if (search) {
    sql += ` AND (m.name ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  sql += ` ORDER BY c.name ASC, m.name ASC`;

  if (limit !== undefined && offset !== undefined) {
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return result.rows;
}

export async function countMenuItems(options: Omit<GetMenuItemsOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const { search, categoryId, includeUnavailable = true } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT COUNT(*) 
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.deleted_at IS NULL AND c.deleted_at IS NULL
  `;

  if (!includeUnavailable) {
    sql += ` AND m.is_available = TRUE`;
  }

  if (categoryId) {
    sql += ` AND m.category_id = $${paramCount}`;
    params.push(categoryId);
    paramCount++;
  }

  if (search) {
    sql += ` AND (m.name ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
}

export async function getMenuItemById(id: number): Promise<MenuItem | null> {
  const sql = `
    SELECT m.*, c.name as category_name 
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.id = $1 AND m.deleted_at IS NULL AND c.deleted_at IS NULL
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

export async function createMenuItem(item: {
  category_id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  preparation_time?: number;
}): Promise<MenuItem> {
  const sql = `
    INSERT INTO menu_items (
      category_id, name, description, price, image_url, is_available, is_veg, preparation_time
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING *
  `;
  const result = await query(sql, [
    item.category_id,
    item.name,
    item.description || null,
    item.price,
    item.image_url || null,
    item.is_available ?? true,
    item.is_veg ?? true,
    item.preparation_time || null,
  ]);
  return result.rows[0];
}

export async function updateMenuItem(
  id: number,
  item: {
    category_id: number;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_available: boolean;
    is_veg: boolean;
    preparation_time?: number;
  }
): Promise<MenuItem | null> {
  const sql = `
    UPDATE menu_items 
    SET category_id = $1, name = $2, description = $3, price = $4, image_url = $5, 
        is_available = $6, is_veg = $7, preparation_time = $8, updated_at = CURRENT_TIMESTAMP
    WHERE id = $9 AND deleted_at IS NULL
    RETURNING *
  `;
  const result = await query(sql, [
    item.category_id,
    item.name,
    item.description || null,
    item.price,
    item.image_url || null,
    item.is_available,
    item.is_veg,
    item.preparation_time || null,
    id,
  ]);
  return result.rows[0] || null;
}

export async function softDeleteMenuItem(id: number): Promise<boolean> {
  const sql = `
    UPDATE menu_items 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = $1 AND deleted_at IS NULL
  `;
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
}
