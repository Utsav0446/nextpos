import { query, pool } from '@/db';
import { InventoryItem, Supplier, PurchaseRecord } from '@/types';

// ==========================================
// SUPPLIERS
// ==========================================

export async function getSuppliers(): Promise<Supplier[]> {
  const sql = 'SELECT * FROM suppliers ORDER BY name ASC';
  const result = await query(sql);
  return result.rows;
}

export async function getSupplierById(id: number): Promise<Supplier | null> {
  const sql = 'SELECT * FROM suppliers WHERE id = $1';
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

export async function createSupplier(supplier: {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): Promise<Supplier> {
  const sql = `
    INSERT INTO suppliers (name, contact_name, phone, email, address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(sql, [
    supplier.name,
    supplier.contact_name || null,
    supplier.phone || null,
    supplier.email || null,
    supplier.address || null,
  ]);
  return result.rows[0];
}

export async function updateSupplier(
  id: number,
  supplier: {
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }
): Promise<Supplier | null> {
  const sql = `
    UPDATE suppliers
    SET name = $1, contact_name = $2, phone = $3, email = $4, address = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const result = await query(sql, [
    supplier.name,
    supplier.contact_name || null,
    supplier.phone || null,
    supplier.email || null,
    supplier.address || null,
    id,
  ]);
  return result.rows[0] || null;
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const sql = 'DELETE FROM suppliers WHERE id = $1';
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
}

// ==========================================
// INVENTORY
// ==========================================

export async function getInventoryItems(options: { search?: string; limit?: number; offset?: number } = {}): Promise<InventoryItem[]> {
  const { search, limit, offset } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT i.*, s.name as supplier_name
    FROM inventory i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE 1=1
  `;

  if (search) {
    sql += ` AND i.name ILIKE $${paramCount}`;
    params.push(`%${search}%`);
    paramCount++;
  }

  sql += ` ORDER BY i.name ASC`;

  if (limit !== undefined && offset !== undefined) {
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return result.rows;
}

export async function countInventoryItems(search?: string): Promise<number> {
  const params: any[] = [];
  let sql = 'SELECT COUNT(*) FROM inventory WHERE 1=1';

  if (search) {
    sql += ` AND name ILIKE $1`;
    params.push(`%${search}%`);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
}

export async function getInventoryItemById(id: number): Promise<InventoryItem | null> {
  const sql = `
    SELECT i.*, s.name as supplier_name
    FROM inventory i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.id = $1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

export async function createInventoryItem(item: {
  name: string;
  stock_quantity: number;
  unit: string;
  low_stock_threshold: number;
  supplier_id?: number | null;
}): Promise<InventoryItem> {
  const sql = `
    INSERT INTO inventory (name, stock_quantity, unit, low_stock_threshold, supplier_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(sql, [
    item.name,
    item.stock_quantity,
    item.unit,
    item.low_stock_threshold,
    item.supplier_id || null,
  ]);
  return result.rows[0];
}

export async function updateInventoryItem(
  id: number,
  item: {
    name: string;
    stock_quantity: number;
    unit: string;
    low_stock_threshold: number;
    supplier_id?: number | null;
  }
): Promise<InventoryItem | null> {
  const sql = `
    UPDATE inventory
    SET name = $1, stock_quantity = $2, unit = $3, low_stock_threshold = $4, 
        supplier_id = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const result = await query(sql, [
    item.name,
    item.stock_quantity,
    item.unit,
    item.low_stock_threshold,
    item.supplier_id || null,
    id,
  ]);
  return result.rows[0] || null;
}

export async function deleteInventoryItem(id: number): Promise<boolean> {
  const sql = 'DELETE FROM inventory WHERE id = $1';
  const result = await query(sql, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const sql = `
    SELECT i.*, s.name as supplier_name
    FROM inventory i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.stock_quantity <= i.low_stock_threshold
    ORDER BY i.name ASC
  `;
  const result = await query(sql);
  return result.rows;
}

// ==========================================
// PURCHASE RECORDS (TRANSACTION-BASED)
// ==========================================

export async function getPurchaseRecords(options: { limit?: number; offset?: number } = {}): Promise<PurchaseRecord[]> {
  const { limit, offset } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT p.*, i.name as inventory_name, s.name as supplier_name
    FROM purchase_history p
    JOIN inventory i ON p.inventory_id = i.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.purchase_date DESC, p.created_at DESC
  `;

  if (limit !== undefined && offset !== undefined) {
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return result.rows;
}

export async function countPurchaseRecords(): Promise<number> {
  const sql = 'SELECT COUNT(*) FROM purchase_history';
  const result = await query(sql);
  return parseInt(result.rows[0].count);
}

export async function createPurchaseRecord(record: {
  inventory_id: number;
  supplier_id?: number | null;
  quantity: number;
  unit_price: number;
  purchase_date: string;
}): Promise<PurchaseRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const totalCost = record.quantity * record.unit_price;

    // 1. Insert purchase record
    const insertSql = `
      INSERT INTO purchase_history (inventory_id, supplier_id, quantity, unit_price, total_cost, purchase_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const recordResult = await client.query(insertSql, [
      record.inventory_id,
      record.supplier_id || null,
      record.quantity,
      record.unit_price,
      totalCost,
      record.purchase_date,
    ]);
    const savedRecord = recordResult.rows[0] as PurchaseRecord;

    // 2. Add purchased quantity to inventory stock
    const updateStockSql = `
      UPDATE inventory
      SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await client.query(updateStockSql, [record.quantity, record.inventory_id]);

    // 3. Log into Expenses (Purchasing ingredients counts as a food/vegetables expense)
    // Fetch ingredient details for logging details
    const ingredientNameRes = await client.query('SELECT name FROM inventory WHERE id = $1', [record.inventory_id]);
    const ingredientName = ingredientNameRes.rows[0]?.name || 'Ingredients';

    const expenseSql = `
      INSERT INTO expenses (category, amount, reason, notes, expense_date)
      VALUES ('Vegetables', $1, $2, $3, $4)
    `;
    await client.query(expenseSql, [
      totalCost,
      `Inventory Purchase: ${ingredientName}`,
      `Purchased ${record.quantity} units of ${ingredientName} at unit price of ${record.unit_price}`,
      record.purchase_date,
    ]);

    // 4. Log Audit Activity
    const auditSql = `
      INSERT INTO audit_logs (action, details)
      VALUES ($1, $2)
    `;
    await client.query(auditSql, [
      'PURCHASE_INVENTORY',
      `Purchased stock for ${ingredientName}. Cost: ${totalCost}`,
    ]);

    await client.query('COMMIT');
    return savedRecord;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
