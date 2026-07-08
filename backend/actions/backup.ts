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
    'restaurant_settings',
    'categories',
    'menu_items',
    'orders',
    'order_items',
    'expenses',
    'suppliers',
    'inventory',
    'purchase_history',
    'restaurant_tables',
    'audit_logs'
  ];

  try {
    const backupData: Record<string, any[]> = {};

    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
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
  const requiredTables = [
    'users',
    'categories',
    'menu_items',
    'orders',
    'restaurant_settings',
    'inventory',
    'purchase_history',
    'restaurant_tables'
  ];
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
        restaurant_tables,
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
      'restaurant_tables',
      'audit_logs'
    ];

    // Disable triggers on restaurant_tables to avoid self-referential foreign key constraint checks (merged_with / split_from) during restoration
    await client.query('ALTER TABLE restaurant_tables DISABLE TRIGGER ALL');

    for (const table of insertOrder) {
      if (data[table] && Array.isArray(data[table])) {
        for (const row of data[table]) {
          await insertRow(table, row);
        }
      }
    }

    // Re-enable triggers on restaurant_tables
    await client.query('ALTER TABLE restaurant_tables ENABLE TRIGGER ALL');

    // 4. Reset sequence identities for all serial tables to prevent primary key collisions in future inserts
    for (const table of insertOrder) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'), 
          COALESCE(MAX(id), 1), 
          MAX(id) IS NOT NULL
        ) FROM ${table}
      `);
    }

    // 5. Log the restore event
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
