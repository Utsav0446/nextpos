'use server';

import { query, pool } from '@/db';
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
      // Block edits on merged child tables
      const mergeCheck = await query('SELECT merged_with FROM restaurant_tables WHERE id = $1', [id]);
      if (mergeCheck.rows[0]?.merged_with) {
        return { error: 'Cannot edit a table that is part of a merged group. Unmerge first.' };
      }

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
        'UPDATE restaurant_tables SET table_number = $1, capacity = $2, original_capacity = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [tableNumber, capacity, id]
      );
    } else {
      // Create new table
      await query(
        'INSERT INTO restaurant_tables (table_number, capacity, original_capacity) VALUES ($1, $2, $2)',
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
    const currentRes = await query('SELECT table_number, merged_with FROM restaurant_tables WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return { error: 'Table not found.' };
    }

    // Block deletion of merged child tables
    if (currentRes.rows[0].merged_with) {
      return { error: 'Cannot delete a table that is part of a merged group. Unmerge first.' };
    }

    // Block deletion if this is a merge primary (has children)
    const childCheck = await query('SELECT id FROM restaurant_tables WHERE merged_with = $1', [id]);
    if (childCheck.rows.length > 0) {
      return { error: 'Cannot delete a merged group primary table. Unmerge first.' };
    }

    // Block deletion of split child tables
    const splitCheck = await query('SELECT split_from FROM restaurant_tables WHERE id = $1', [id]);
    if (splitCheck.rows[0]?.split_from) {
      return { error: 'Cannot delete a split table. Rejoin it first.' };
    }

    // Block deletion if this is a split primary (has children)
    const splitChildCheck = await query('SELECT id FROM restaurant_tables WHERE split_from = $1', [id]);
    if (splitChildCheck.rows.length > 0) {
      return { error: 'Cannot delete a split table. Rejoin it first.' };
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
    // Block status changes on merged child tables
    const mergeCheck = await query('SELECT merged_with FROM restaurant_tables WHERE id = $1', [id]);
    if (mergeCheck.rows[0]?.merged_with) {
      return { error: 'Cannot change status of a merged child table. Use the primary table instead.' };
    }

    await query('UPDATE restaurant_tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      status,
      id,
    ]);

    // If this is a merge primary, propagate status to all children
    await query('UPDATE restaurant_tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE merged_with = $2', [
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

    // Check if destination table exists and is not a merged child
    const tableCheck = await query(
      'SELECT id, merged_with FROM restaurant_tables WHERE LOWER(table_number) = LOWER($1)',
      [targetTableNum]
    );
    if (tableCheck.rows.length === 0) {
      return { error: `Table '${targetTableNum}' does not exist.` };
    }
    if (tableCheck.rows[0].merged_with) {
      return { error: `Table '${targetTableNum}' is part of a merged group and cannot receive orders directly.` };
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

/**
 * Merges multiple tables into a group. The first ID is the primary, the rest become children.
 * All tables must be Available and not already in a merged group.
 */
export async function mergeTablesAction(primaryTableId: number, childTableIds: number[]) {
  if (!childTableIds.length) {
    return { error: 'Select at least one table to merge with.' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const allIds = [primaryTableId, ...childTableIds];

    // 1. Fetch all tables being merged
    const tablesRes = await client.query(
      `SELECT id, table_number, capacity, original_capacity, status, merged_with 
       FROM restaurant_tables WHERE id = ANY($1) FOR UPDATE`,
      [allIds]
    );

    if (tablesRes.rows.length !== allIds.length) {
      throw new Error('One or more selected tables were not found.');
    }

    // 2. Validate all are Available and not already merged
    for (const row of tablesRes.rows) {
      if (row.status !== 'Available') {
        throw new Error(`Table '${row.table_number}' is not Available. Only available tables can be merged.`);
      }
      if (row.merged_with) {
        throw new Error(`Table '${row.table_number}' is already part of a merged group.`);
      }
      // Check it's not already a primary of another group
      const existingChildren = await client.query(
        'SELECT id FROM restaurant_tables WHERE merged_with = $1',
        [row.id]
      );
      if (existingChildren.rows.length > 0) {
        throw new Error(`Table '${row.table_number}' is already the primary of a merged group.`);
      }
    }

    // Also check no table has an active order
    for (const row of tablesRes.rows) {
      const orderCheck = await client.query(
        "SELECT id FROM orders WHERE LOWER(table_number) = LOWER($1) AND status IN ('Pending', 'Preparing')",
        [row.table_number]
      );
      if (orderCheck.rows.length > 0) {
        throw new Error(`Table '${row.table_number}' has an active order and cannot be merged.`);
      }
    }

    // 3. Calculate combined capacity
    const totalCapacity = tablesRes.rows.reduce((sum: number, r: any) => sum + (r.original_capacity || r.capacity), 0);

    // 4. Set merged_with on child tables
    for (const childId of childTableIds) {
      await client.query(
        'UPDATE restaurant_tables SET merged_with = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [primaryTableId, childId]
      );
    }

    // 5. Update primary table capacity to combined total
    await client.query(
      'UPDATE restaurant_tables SET capacity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [totalCapacity, primaryTableId]
    );

    // 6. Log audit
    const primaryRow = tablesRes.rows.find((r: any) => r.id === primaryTableId);
    const childNumbers = tablesRes.rows
      .filter((r: any) => childTableIds.includes(r.id))
      .map((r: any) => r.table_number);
    
    await client.query(
      'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
      ['MERGE_TABLES', `Merged ${primaryRow.table_number} + ${childNumbers.join(', ')} (Combined capacity: ${totalCapacity})`]
    );

    await client.query('COMMIT');

    revalidatePath('/tables');
    return { success: true };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { error: err.message || 'Failed to merge tables.' };
  } finally {
    client.release();
  }
}

/**
 * Unmerges a group of tables, restoring them to their individual configurations.
 * The primary table must not have an active order.
 */
export async function unmergeTablesAction(primaryTableId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch primary table
    const primaryRes = await client.query(
      'SELECT id, table_number, original_capacity FROM restaurant_tables WHERE id = $1 FOR UPDATE',
      [primaryTableId]
    );
    if (primaryRes.rows.length === 0) {
      throw new Error('Primary table not found.');
    }
    const primary = primaryRes.rows[0];

    // 2. Check it actually has children
    const childrenRes = await client.query(
      'SELECT id, table_number FROM restaurant_tables WHERE merged_with = $1 FOR UPDATE',
      [primaryTableId]
    );
    if (childrenRes.rows.length === 0) {
      throw new Error('This table is not part of a merged group.');
    }

    // 3. Check no active orders on the primary
    const orderCheck = await client.query(
      "SELECT id FROM orders WHERE LOWER(table_number) = LOWER($1) AND status IN ('Pending', 'Preparing')",
      [primary.table_number]
    );
    if (orderCheck.rows.length > 0) {
      throw new Error('Cannot unmerge: the merged group has an active order. Complete or cancel it first.');
    }

    // 4. Clear merged_with on all children, set them Available
    await client.query(
      'UPDATE restaurant_tables SET merged_with = NULL, status = \'Available\', updated_at = CURRENT_TIMESTAMP WHERE merged_with = $1',
      [primaryTableId]
    );

    // 5. Restore primary table's original capacity
    await client.query(
      'UPDATE restaurant_tables SET capacity = original_capacity, status = \'Available\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [primaryTableId]
    );

    // 6. Log audit
    const childNumbers = childrenRes.rows.map((r: any) => r.table_number);
    await client.query(
      'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
      ['UNMERGE_TABLES', `Unmerged ${primary.table_number} from ${childNumbers.join(', ')}`]
    );

    await client.query('COMMIT');

    revalidatePath('/tables');
    return { success: true };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { error: err.message || 'Failed to unmerge tables.' };
  } finally {
    client.release();
  }
}

/**
 * Splits a table into two logical tables (e.g. T-1 becomes T-1A and T-1B) for table sharing.
 */
export async function splitTableForSharingAction(tableId: number, childCapacity?: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch table details
    const tableRes = await client.query(
      'SELECT id, table_number, capacity, original_capacity, status, merged_with, split_from FROM restaurant_tables WHERE id = $1 FOR UPDATE',
      [tableId]
    );

    if (tableRes.rows.length === 0) {
      throw new Error('Table not found.');
    }

    const table = tableRes.rows[0];

    // 2. Validate it's not already split or merged
    if (table.merged_with) {
      throw new Error('Cannot split a table that is part of a merged group. Unmerge it first.');
    }

    const mergeChildCheck = await client.query('SELECT id FROM restaurant_tables WHERE merged_with = $1', [tableId]);
    if (mergeChildCheck.rows.length > 0) {
      throw new Error('Cannot split a primary table of a merged group. Unmerge it first.');
    }

    if (table.split_from) {
      throw new Error('This table is already a split child.');
    }

    const splitChildCheck = await client.query('SELECT id FROM restaurant_tables WHERE split_from = $1', [tableId]);
    if (splitChildCheck.rows.length > 0) {
      throw new Error('This table is already split for multi-party seating.');
    }

    const originalCapacity = table.original_capacity || table.capacity;
    if (originalCapacity < 2) {
      throw new Error('Table must have a capacity of at least 2 seats to be split.');
    }

    // 3. Determine new names and capacities
    const originalNumber = table.table_number;
    const primaryNumber = `${originalNumber}A`;
    const childNumber = `${originalNumber}B`;

    let finalChildCapacity = childCapacity !== undefined ? Number(childCapacity) : Math.floor(originalCapacity / 2);
    if (isNaN(finalChildCapacity) || finalChildCapacity < 1 || finalChildCapacity >= originalCapacity) {
      finalChildCapacity = Math.max(1, Math.floor(originalCapacity / 2));
    }
    const primaryCapacity = originalCapacity - finalChildCapacity;

    // 4. Update primary table info
    await client.query(
      'UPDATE restaurant_tables SET table_number = $1, capacity = $2, original_capacity = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [primaryNumber, primaryCapacity, originalCapacity, tableId]
    );

    // 5. If table has any active order, transfer it to primary A table
    await client.query(
      "UPDATE orders SET table_number = $1 WHERE LOWER(table_number) = LOWER($2) AND status IN ('Pending', 'Preparing')",
      [primaryNumber, originalNumber]
    );

    // 6. Create the split child B table
    await client.query(
      'INSERT INTO restaurant_tables (table_number, capacity, original_capacity, status, split_from) VALUES ($1, $2, $3, $4, $5)',
      [childNumber, finalChildCapacity, originalCapacity, 'Available', tableId]
    );

    // 7. Log audit log
    await client.query(
      'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
      ['SPLIT_TABLE', `Split Table ${originalNumber} into ${primaryNumber} (capacity: ${primaryCapacity}) & ${childNumber} (capacity: ${finalChildCapacity})`]
    );

    await client.query('COMMIT');

    revalidatePath('/tables');
    revalidatePath('/orders');
    revalidatePath('/billing');
    return { success: true };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { error: err.message || 'Failed to split table.' };
  } finally {
    client.release();
  }
}

/**
 * Rejoins two split tables back into a single table (e.g. T-1A and T-1B back to T-1).
 */
export async function rejoinSplitTablesAction(primaryTableId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch primary table
    const primaryRes = await client.query(
      'SELECT id, table_number, capacity, original_capacity, status FROM restaurant_tables WHERE id = $1 FOR UPDATE',
      [primaryTableId]
    );
    if (primaryRes.rows.length === 0) {
      throw new Error('Primary table not found.');
    }
    const primary = primaryRes.rows[0];

    // 2. Fetch split children
    const childrenRes = await client.query(
      'SELECT id, table_number FROM restaurant_tables WHERE split_from = $1 FOR UPDATE',
      [primaryTableId]
    );
    if (childrenRes.rows.length === 0) {
      throw new Error('This table is not currently split.');
    }
    const child = childrenRes.rows[0];

    // 3. Verify no active orders on either table
    const activeOrdersRes = await client.query(
      "SELECT id, table_number FROM orders WHERE LOWER(table_number) IN (LOWER($1), LOWER($2)) AND status IN ('Pending', 'Preparing')",
      [primary.table_number, child.table_number]
    );
    if (activeOrdersRes.rows.length > 0) {
      throw new Error('Cannot rejoin: there are active orders on the split tables.');
    }

    // 4. Determine original table number
    let originalNumber = primary.table_number;
    if (originalNumber.endsWith('A')) {
      originalNumber = originalNumber.slice(0, -1);
    }

    // 5. Delete child B table
    await client.query(
      'DELETE FROM restaurant_tables WHERE id = $1',
      [child.id]
    );

    // 6. Restore primary table name and capacity
    const originalCapacity = primary.original_capacity || (primary.capacity * 2);
    await client.query(
      'UPDATE restaurant_tables SET table_number = $1, capacity = $2, status = \'Available\', updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [originalNumber, originalCapacity, primaryTableId]
    );

    // 7. Log audit log
    await client.query(
      'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
      ['REJOIN_TABLES', `Rejoined split tables ${primary.table_number} & ${child.table_number} back to ${originalNumber}`]
    );

    await client.query('COMMIT');

    revalidatePath('/tables');
    revalidatePath('/orders');
    revalidatePath('/billing');
    return { success: true };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { error: err.message || 'Failed to rejoin tables.' };
  } finally {
    client.release();
  }
}
