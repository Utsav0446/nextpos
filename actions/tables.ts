'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';

/**
 * Creates or updates a table configuration.
 */
export async function saveTableAction(
  id: number | null,
  data: { table_number: string; capacity: number }
) {
  try {
    const tableNumber = data.table_number.trim();
    const capacity = Number(data.capacity);

    if (!tableNumber) {
      return { error: 'Table number is required.' };
    }
    if (isNaN(capacity) || capacity <= 0) {
      return { error: 'Capacity must be greater than 0.' };
    }

    if (id) {
      // Check if table is occupied before renaming/changing it
      const currentRes = await query('SELECT table_number FROM restaurant_tables WHERE id = $1', [id]);
      if (currentRes.rows.length > 0) {
        const oldNum = currentRes.rows[0].table_number;
        const activeRes = await query(
          "SELECT id FROM orders WHERE LOWER(table_number) = LOWER($1) AND status IN ('Pending', 'Preparing')",
          [oldNum]
        );
        if (activeRes.rows.length > 0 && oldNum.toLowerCase() !== tableNumber.toLowerCase()) {
          return { error: 'Cannot rename a table that is currently occupied.' };
        }
      }

      // Update table
      await query(
        'UPDATE restaurant_tables SET table_number = $1, capacity = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [tableNumber, capacity, id]
      );
    } else {
      // Create new table
      await query(
        'INSERT INTO restaurant_tables (table_number, capacity) VALUES ($1, $2)',
        [tableNumber, capacity]
      );
    }

    revalidatePath('/tables');
    return { success: true };
  } catch (err: any) {
    if (err.code === '23505') {
      return { error: 'Table number already exists.' };
    }
    return { error: err.message || 'Failed to save table.' };
  }
}

/**
 * Deletes a table config.
 */
export async function deleteTableAction(id: number) {
  try {
    const currentRes = await query('SELECT table_number FROM restaurant_tables WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return { error: 'Table not found.' };
    }

    const tableNumber = currentRes.rows[0].table_number;
    // Prevent deletion if occupied
    const activeRes = await query(
      "SELECT id FROM orders WHERE LOWER(table_number) = LOWER($1) AND status IN ('Pending', 'Preparing')",
      [tableNumber]
    );
    if (activeRes.rows.length > 0) {
      return { error: 'Cannot delete an occupied table.' };
    }

    await query('DELETE FROM restaurant_tables WHERE id = $1', [id]);
    revalidatePath('/tables');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete table.' };
  }
}

/**
 * Sets a table's manual status (e.g. marking it Dirty or Available).
 */
export async function setTableStatusAction(id: number, status: 'Available' | 'Dirty') {
  try {
    await query('UPDATE restaurant_tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      status,
      id,
    ]);
    revalidatePath('/tables');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update table status.' };
  }
}

/**
 * Swaps / Moves an active dine-in order from one table to another.
 */
export async function moveTableAction(orderId: number, newTableNumber: string) {
  try {
    const targetTableNum = newTableNumber.trim();
    if (!targetTableNum) {
      return { error: 'Target table number is required.' };
    }

    // Check if destination table exists
    const tableCheck = await query('SELECT id FROM restaurant_tables WHERE LOWER(table_number) = LOWER($1)', [
      targetTableNum,
    ]);
    if (tableCheck.rows.length === 0) {
      return { error: `Table '${targetTableNum}' does not exist.` };
    }

    // Check if destination table has another active order
    const occupiedCheck = await query(
      "SELECT id FROM orders WHERE LOWER(table_number) = LOWER($1) AND status IN ('Pending', 'Preparing') AND id != $2",
      [targetTableNum, orderId]
    );
    if (occupiedCheck.rows.length > 0) {
      return { error: `Table '${targetTableNum}' is currently occupied by another order.` };
    }

    // Move order
    await query('UPDATE orders SET table_number = $1 WHERE id = $2', [targetTableNum, orderId]);
    
    revalidatePath('/tables');
    revalidatePath('/orders');
    revalidatePath('/billing');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to move table.' };
  }
}
