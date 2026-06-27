import { query } from '@/db';
import { Category } from '@/types';

export async function getCategories(): Promise<Category[]> {
  const sql = `
    SELECT * FROM categories 
    WHERE deleted_at IS NULL 
    ORDER BY name ASC
  `;
  const result = await query(sql);
  return result.rows;
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const sql = `
    SELECT * FROM categories 
    WHERE id = $1 AND deleted_at IS NULL
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

export async function createCategory(name: string, description?: string): Promise<Category> {
  const sql = `
    INSERT INTO categories (name, description) 
    VALUES ($1, $2) 
    RETURNING *
  `;
  const result = await query(sql, [name, description || null]);
  return result.rows[0];
}

export async function updateCategory(id: number, name: string, description?: string): Promise<Category | null> {
  const sql = `
    UPDATE categories 
    SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 AND deleted_at IS NULL
    RETURNING *
  `;
  const result = await query(sql, [name, description || null, id]);
  return result.rows[0] || null;
}

export async function softDeleteCategory(id: number): Promise<boolean> {
  // Check if there are any active menu items in this category
  const checkSql = `
    SELECT COUNT(*) FROM menu_items 
    WHERE category_id = $1 AND deleted_at IS NULL
  `;
  const checkRes = await query(checkSql, [id]);
  const count = parseInt(checkRes.rows[0].count);
  if (count > 0) {
    throw new Error('Cannot delete category because it has active food items.');
  }

  const sql = `
    UPDATE categories 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = $1 AND deleted_at IS NULL
  `;
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
}
