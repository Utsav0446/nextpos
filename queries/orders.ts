import { query, pool } from '@/db';
import { Order, OrderItem, OrderStatus, OrderType, PaymentType } from '@/types';

interface GetOrdersOptions {
  status?: OrderStatus;
  type?: OrderType;
  date?: string; // YYYY-MM-DD
  limit?: number;
  offset?: number;
  search?: string;
}

export async function getOrders(options: GetOrdersOptions = {}): Promise<Order[]> {
  const { status, type, date, limit, offset, search } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT * FROM orders 
    WHERE 1=1
  `;

  if (status) {
    sql += ` AND status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  if (type) {
    sql += ` AND order_type = $${paramCount}`;
    params.push(type);
    paramCount++;
  }

  if (date) {
    sql += ` AND created_at::date = $${paramCount}`;
    params.push(date);
    paramCount++;
  }

  if (search) {
    sql += ` AND (customer_name ILIKE $${paramCount} OR id::text = $${paramCount})`;
    params.push(search.includes('%') ? search : `%${search}%`);
    paramCount++;
  }

  sql += ` ORDER BY created_at DESC`;

  if (limit !== undefined && offset !== undefined) {
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return result.rows;
}

export async function countOrders(options: Omit<GetOrdersOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const { status, type, date, search } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT COUNT(*) FROM orders 
    WHERE 1=1
  `;

  if (status) {
    sql += ` AND status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  if (type) {
    sql += ` AND order_type = $${paramCount}`;
    params.push(type);
    paramCount++;
  }

  if (date) {
    sql += ` AND created_at::date = $${paramCount}`;
    params.push(date);
    paramCount++;
  }

  if (search) {
    sql += ` AND (customer_name ILIKE $${paramCount} OR id::text = $${paramCount})`;
    params.push(search.includes('%') ? search : `%${search}%`);
    paramCount++;
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
}

export async function getOrderById(id: number): Promise<Order | null> {
  const orderSql = 'SELECT * FROM orders WHERE id = $1';
  const orderResult = await query(orderSql, [id]);
  const order = orderResult.rows[0] as Order;

  if (!order) return null;

  const itemsSql = 'SELECT * FROM order_items WHERE order_id = $1';
  const itemsResult = await query(itemsSql, [id]);
  order.items = itemsResult.rows as OrderItem[];

  return order;
}

export async function createOrder(order: {
  customer_name?: string | null;
  table_number?: string | null;
  order_type: OrderType;
  notes?: string | null;
  items: { menu_item_id: number; name: string; quantity: number; price: number }[];
  discount: number;
  tax: number;
  subtotal: number;
  grand_total: number;
}): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert order
    const orderSql = `
      INSERT INTO orders (
        customer_name, table_number, order_type, subtotal, discount, tax, grand_total, remaining_amount, notes
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8) 
      RETURNING *
    `;
    const orderResult = await client.query(orderSql, [
      order.customer_name || null,
      order.table_number || null,
      order.order_type,
      order.subtotal,
      order.discount,
      order.tax,
      order.grand_total,
      order.notes || null,
    ]);
    const savedOrder = orderResult.rows[0] as Order;

    // 2. Insert order items
    const itemInsertSql = `
      INSERT INTO order_items (order_id, menu_item_id, name, quantity, price, total_price)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    for (const item of order.items) {
      const totalPrice = item.quantity * item.price;
      await client.query(itemInsertSql, [
        savedOrder.id,
        item.menu_item_id,
        item.name,
        item.quantity,
        item.price,
        totalPrice,
      ]);
    }

    // 3. Log Audit Activity
    const auditSql = `
      INSERT INTO audit_logs (action, details)
      VALUES ($1, $2)
    `;
    await client.query(auditSql, [
      'CREATE_ORDER',
      `Order #${savedOrder.id} created for ${order.order_type} table ${order.table_number || 'N/A'} total ${order.grand_total}`,
    ]);

    await client.query('COMMIT');
    savedOrder.items = order.items.map((it, idx) => ({
      id: idx,
      order_id: savedOrder.id,
      menu_item_id: it.menu_item_id,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      total_price: it.quantity * it.price,
    }));
    return savedOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<boolean> {
  let sql = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
  const params: any[] = [status, id];
  
  if (status === 'Completed') {
    sql += ', completed_at = CURRENT_TIMESTAMP';
  }
  
  sql += ' WHERE id = $2';
  
  const result = await query(sql, params);
  
  // Log activity
  await query(
    'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
    ['UPDATE_ORDER_STATUS', `Order #${id} status updated to ${status}`]
  );
  
  return (result.rowCount ?? 0) > 0;
}

export async function completeOrderAndBill(
  id: number,
  paymentType: PaymentType,
  paidAmount: number,
  discount: number = 0
): Promise<Order | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch order first
    const fetchSql = 'SELECT * FROM orders WHERE id = $1 FOR UPDATE';
    const orderRes = await client.query(fetchSql, [id]);
    const order = orderRes.rows[0];
    
    if (!order) {
      throw new Error('Order not found');
    }

    const subtotal = Number(order.subtotal);
    const tax = Number(order.tax);
    // Recalculate totals if discount is modified at billing
    const newGrandTotal = Math.max(0, subtotal + tax - discount);
    const remainingAmount = Math.max(0, newGrandTotal - paidAmount);

    const updateSql = `
      UPDATE orders 
      SET status = 'Completed',
          payment_type = $1,
          paid_amount = $2,
          discount = $3,
          grand_total = $4,
          remaining_amount = $5,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const updateRes = await client.query(updateSql, [
      paymentType,
      paidAmount,
      discount,
      newGrandTotal,
      remainingAmount,
      id,
    ]);

    const completedOrder = updateRes.rows[0] as Order;

    // Log Activity
    const auditSql = `
      INSERT INTO audit_logs (action, details)
      VALUES ($1, $2)
    `;
    await client.query(auditSql, [
      'COMPLETE_ORDER',
      `Order #${id} completed. Paid: ${paidAmount} via ${paymentType}`,
    ]);

    await client.query('COMMIT');
    return completedOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteOrder(id: number): Promise<boolean> {
  const sql = 'DELETE FROM orders WHERE id = $1';
  const result = await query(sql, [id]);
  
  await query(
    'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
    ['DELETE_ORDER', `Order #${id} deleted from database`]
  );
  
  return (result.rowCount ?? 0) > 0;
}
