import { query } from '@/db';

export interface RestaurantTable {
  id: number;
  table_number: string;
  capacity: number;
  status: 'Available' | 'Dirty' | 'Occupied';
  active_order_id?: number;
  customer_name?: string;
  grand_total?: number;
  elapsed_minutes?: number;
}

/**
 * Initializes the tables schema and default seeds if they do not exist yet.
 */
export async function initTablesSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS restaurant_tables (
        id SERIAL PRIMARY KEY,
        table_number VARCHAR(50) UNIQUE NOT NULL,
        capacity INT DEFAULT 4,
        status VARCHAR(50) DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed defaults if empty
  const countRes = await query('SELECT COUNT(*) FROM restaurant_tables');
  if (parseInt(countRes.rows[0].count) === 0) {
    await query(`
      INSERT INTO restaurant_tables (table_number, capacity) VALUES
      ('T-1', 2),
      ('T-2', 2),
      ('T-3', 4),
      ('T-4', 4),
      ('T-5', 6),
      ('T-6', 6),
      ('T-7', 8),
      ('T-8', 8)
    `);
  }
}

/**
 * Gets all tables, joining with active orders to resolve status dynamically.
 */
export async function getTables(): Promise<RestaurantTable[]> {
  await initTablesSchema();

  // Find active orders ('Pending' or 'Preparing') of type 'Dine-In'
  // And resolve table status. If there is an active order, status is 'Occupied'.
  // Otherwise, use the table's stored status (Available or Dirty).
  const sql = `
    SELECT 
      t.id,
      t.table_number,
      t.capacity,
      CASE 
        WHEN o.id IS NOT NULL THEN 'Occupied'
        ELSE t.status
      END as status,
      o.id as active_order_id,
      o.customer_name,
      o.grand_total,
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.created_at))/60 as elapsed_minutes
    FROM restaurant_tables t
    LEFT JOIN orders o ON LOWER(t.table_number) = LOWER(o.table_number) 
      AND o.status IN ('Pending', 'Preparing')
    ORDER BY t.table_number ASC
  `;

  const res = await query(sql);
  return res.rows.map(row => ({
    id: row.id,
    table_number: row.table_number,
    capacity: row.capacity,
    status: row.status as any,
    active_order_id: row.active_order_id || undefined,
    customer_name: row.customer_name || undefined,
    grand_total: row.grand_total ? Number(row.grand_total) : undefined,
    elapsed_minutes: row.elapsed_minutes ? Math.floor(row.elapsed_minutes) : undefined,
  }));
}
