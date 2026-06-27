'use server';

import { pool } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Backs up the entire database into a single JSON object.
 */
export async function backupDatabaseAction() {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const tables = [
    'users',
    'categories',
    'menu_items',
    'orders',
    'order_items',
    'expenses',
    'suppliers',
    'inventory',
    'purchase_history',
    'restaurant_settings',
    'audit_logs'
  ];

  try {
    const backupData: Record<string, any[]> = {};

    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = result.rows;
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    return { success: true, backup: jsonString, filename: `pos_backup_${new Date().toISOString().split('T')[0]}.json` };
  } catch (error: any) {
    console.error('Backup database error:', error);
    return { error: error.message || 'Failed to generate database backup.' };
  }
}

/**
 * Restores the entire database from a backup JSON payload.
 */
export async function restoreDatabaseAction(backupJsonStr: string) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  let data: Record<string, any[]>;
  try {
    data = JSON.parse(backupJsonStr);
  } catch (e) {
    return { error: 'Invalid backup file format. Must be valid JSON.' };
  }

  // Validate presence of core tables in backup
  const requiredTables = ['users', 'categories', 'menu_items', 'orders', 'restaurant_settings'];
  for (const table of requiredTables) {
    if (!data[table] || !Array.isArray(data[table])) {
      return { error: `Invalid backup. Missing data for table: ${table}` };
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Restoring database tables...');

    // 1. Truncate all tables in proper reverse foreign key order
    const truncateSql = `
      TRUNCATE TABLE 
        audit_logs,
        purchase_history,
        inventory,
        suppliers,
        expenses,
        order_items,
        orders,
        menu_items,
        categories,
        restaurant_settings,
        users
      RESTART IDENTITY CASCADE
    `;
    await client.query(truncateSql);

    // 2. Insert helper function
    const insertRow = async (tableName: string, row: Record<string, any>) => {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `
        INSERT INTO ${tableName} (${keys.join(', ')})
        VALUES (${placeholders})
      `;
      await client.query(sql, values);
    };

    // 3. Insert rows table-by-table in proper order
    // Order: users -> settings -> categories -> menu_items -> orders -> order_items -> expenses -> suppliers -> inventory -> purchase_history -> audit_logs
    const insertOrder = [
      'users',
      'restaurant_settings',
      'categories',
      'menu_items',
      'orders',
      'order_items',
      'expenses',
      'suppliers',
      'inventory',
      'purchase_history',
      'audit_logs'
    ];

    for (const table of insertOrder) {
      if (data[table] && Array.isArray(data[table])) {
        for (const row of data[table]) {
          await insertRow(table, row);
        }
      }
    }

    // 4. Log the restore event
    const auditSql = `
      INSERT INTO audit_logs (action, details)
      VALUES ($1, $2)
    `;
    await client.query(auditSql, [
      'RESTORE_DATABASE',
      `Database restored from backup by ${admin.email}`
    ]);

    await client.query('COMMIT');
    
    // Revalidate paths
    revalidatePath('/dashboard');
    revalidatePath('/menu');
    revalidatePath('/orders');
    revalidatePath('/inventory');
    revalidatePath('/expenses');
    revalidatePath('/settings');

    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Restore database error:', error);
    return { error: error.message || 'Failed to restore database from backup file.' };
  } finally {
    client.release();
  }
}
