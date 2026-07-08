import { supabase } from '@/db';
import { Order, OrderItem, OrderStatus, OrderType, PaymentType } from '@/types';
import { clearReportsCache } from './reports';

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

  let req = supabase.from('orders').select('*');

  if (status) {
    req = req.eq('status', status);
  }
  if (type) {
    req = req.eq('order_type', type);
  }
  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    req = req.gte('created_at', start).lte('created_at', end);
  }
  if (search) {
    const numericId = parseInt(search, 10);
    const isNumeric = !isNaN(numericId) && numericId.toString() === search.trim();
    if (isNumeric) {
      req = req.or(`customer_name.ilike.%${search}%,id.eq.${numericId}`);
    } else {
      req = req.ilike('customer_name', `%${search}%`);
    }
  }

  req = req.order('created_at', { ascending: false });

  if (limit !== undefined && offset !== undefined) {
    req = req.range(offset, offset + limit - 1);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data || [];
}

export async function countOrders(options: Omit<GetOrdersOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const { status, type, date, search } = options;

  let req = supabase.from('orders').select('*', { count: 'exact', head: true });

  if (status) {
    req = req.eq('status', status);
  }
  if (type) {
    req = req.eq('order_type', type);
  }
  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    req = req.gte('created_at', start).lte('created_at', end);
  }
  if (search) {
    const numericId = parseInt(search, 10);
    const isNumeric = !isNaN(numericId) && numericId.toString() === search.trim();
    if (isNumeric) {
      req = req.or(`customer_name.ilike.%${search}%,id.eq.${numericId}`);
    } else {
      req = req.ilike('customer_name', `%${search}%`);
    }
  }

  const { count, error } = await req;
  if (error) throw error;
  return count || 0;
}

export async function getOrderById(id: number): Promise<Order | null> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (orderErr) throw orderErr;
  if (!order) return null;

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id);

  if (itemsErr) throw itemsErr;
  order.items = items || [];

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
  // Generate daily token number
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data: tokenData, error: tokenErr } = await supabase
    .from('orders')
    .select('token_no')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('token_no', { ascending: false })
    .limit(1);

  if (tokenErr) throw tokenErr;
  
  const tokenNo = tokenData && tokenData.length > 0 ? (tokenData[0].token_no || 0) + 1 : 1;

  // 1. Insert order
  const { data: savedOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_name: order.customer_name || null,
      table_number: order.table_number || null,
      order_type: order.order_type,
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax,
      grand_total: order.grand_total,
      remaining_amount: order.grand_total,
      notes: order.notes || null,
      token_no: tokenNo,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  // 2. Insert order items
  const itemsToInsert = order.items.map(item => ({
    order_id: savedOrder.id,
    menu_item_id: item.menu_item_id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    total_price: item.quantity * item.price,
  }));

  const { data: insertedItems, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemsToInsert)
    .select();

  if (itemsErr) throw itemsErr;

  // 3. Log Audit Activity
  await supabase
    .from('audit_logs')
    .insert({
      action: 'CREATE_ORDER',
      details: `Order #${savedOrder.id} created for ${order.order_type} table ${order.table_number || 'N/A'} total ${order.grand_total}`,
    });

  savedOrder.items = insertedItems || [];
  return savedOrder;
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<boolean> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'Completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;

  // Log activity
  await supabase
    .from('audit_logs')
    .insert({
      action: 'UPDATE_ORDER_STATUS',
      details: `Order #${id} status updated to ${status}`,
    });

  return true;
}

export async function completeOrderAndBill(
  id: number,
  paymentType: PaymentType,
  paidAmount: number,
  discount: number = 0
): Promise<Order | null> {
  // Fetch order first
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) {
    throw new Error('Order not found');
  }

  const subtotal = Number(order.subtotal);
  const tax = Number(order.tax);
  const newGrandTotal = Math.max(0, subtotal + tax - discount);
  const remainingAmount = Math.max(0, newGrandTotal - paidAmount);

  const { data: completedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'Completed',
      payment_type: paymentType,
      paid_amount: paidAmount,
      discount,
      grand_total: newGrandTotal,
      remaining_amount: remainingAmount,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (updateError) throw updateError;

  // Log Activity
  await supabase
    .from('audit_logs')
    .insert({
      action: 'COMPLETE_ORDER',
      details: `Order #${id} completed. Paid: ${paidAmount} via ${paymentType}`,
    });

  // If it is a Dine-In order with a table number, automatically mark that table and its merged children as 'Dirty'
  if (order.order_type === 'Dine-In' && order.table_number) {
    const { data: tableData, error: tableFetchErr } = await supabase
      .from('restaurant_tables')
      .select('id')
      .ilike('table_number', order.table_number.trim())
      .maybeSingle();

    if (!tableFetchErr && tableData) {
      const tableId = tableData.id;
      // Mark primary table as Dirty
      await supabase
        .from('restaurant_tables')
        .update({ status: 'Dirty', updated_at: new Date().toISOString() })
        .eq('id', tableId);

      // Mark all child tables merged under it as Dirty
      await supabase
        .from('restaurant_tables')
        .update({ status: 'Dirty', updated_at: new Date().toISOString() })
        .eq('merged_with', tableId);
    }
  }

  clearReportsCache();
  return completedOrder;
}

export async function deleteOrder(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await supabase
    .from('audit_logs')
    .insert({
      action: 'DELETE_ORDER',
      details: `Order #${id} deleted from database`,
    });

  clearReportsCache();
  return true;
}

export async function getRecentOrdersWithItems(days: number = 7): Promise<Order[]> {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const dateLimitStr = dateLimit.toISOString();

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', dateLimitStr)
    .order('created_at', { ascending: false });

  if (ordersErr) throw ordersErr;

  if (orders && orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsErr) throw itemsErr;

    orders.forEach(o => {
      o.items = (items || []).filter(item => item.order_id === o.id);
    });
  }

  return orders || [];
}

export async function getKitchenOrders(): Promise<Order[]> {
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['Pending', 'Preparing'])
    .order('created_at', { ascending: true });

  if (ordersErr) throw ordersErr;

  if (orders && orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsErr) throw itemsErr;

    orders.forEach(o => {
      o.items = (items || []).filter(item => item.order_id === o.id);
    });
  }

  return orders || [];
}
