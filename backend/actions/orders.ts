'use server';

import { revalidatePath } from 'next/cache';
import { createOrder, updateOrderStatus, completeOrderAndBill, deleteOrder, getKitchenOrders } from '@/queries/orders';
import { orderSchema, OrderInput } from '@/schemas/order';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus, PaymentType } from '@/types';

import { supabase } from '@/db';

export async function createOrderAction(data: OrderInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Order validation failed:', parsed.error.format());
    const firstError = parsed.error.issues[0]?.message || 'Invalid order structure.';
    return { error: `Validation Error: ${firstError}` };
  }

  // Table merge validation
  const orderData = parsed.data;
  if (orderData.order_type === 'Dine-In' && orderData.table_number) {
    try {
      const { data: tableRows, error: tableErr } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, merged_with')
        .ilike('table_number', orderData.table_number.trim());

      if (tableErr) throw tableErr;

      if (!tableRows || tableRows.length === 0) {
        return { error: `Table '${orderData.table_number}' does not exist.` };
      }

      const tableRow = tableRows[0];
      if (tableRow.merged_with) {
        // Find the primary table number to give a clear error message
        const { data: primaryRow, error: primaryErr } = await supabase
          .from('restaurant_tables')
          .select('table_number')
          .eq('id', tableRow.merged_with)
          .maybeSingle();

        if (primaryErr) throw primaryErr;
        const primaryName = primaryRow?.table_number || 'primary table';
        return { 
          error: `Table '${orderData.table_number}' is merged under table '${primaryName}'. Please place the order on table '${primaryName}' instead.` 
        };
      }
    } catch (dbErr: any) {
      console.error('Table validation DB error:', dbErr);
      return { error: 'Database verification failed during table check.' };
    }
  }

  try {
    const saved = await createOrder(orderData);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true, orderId: saved.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to place order.' };
  }
}

export async function updateOrderStatusAction(id: number, status: OrderStatus) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await updateOrderStatus(id, status);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    revalidatePath('/kitchen');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update order status.' };
  }
}

export async function completeOrderAction(
  id: number,
  paymentType: PaymentType,
  paidAmount: number,
  discount: number = 0
) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await completeOrderAndBill(id, paymentType, paidAmount, discount);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    revalidatePath('/billing');
    revalidatePath('/kitchen');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to complete billing for order.' };
  }
}

export async function completeMultipleOrdersAction(
  ids: number[],
  paymentType: PaymentType,
  paidAmount: number,
  discount: number = 0
) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const { completeMultipleOrdersAndBill } = await import('@/queries/orders');
    await completeMultipleOrdersAndBill(ids, paymentType, paidAmount, discount);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    revalidatePath('/billing');
    revalidatePath('/kitchen');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to complete billing for orders.' };
  }
}

export async function deleteOrderAction(id: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await deleteOrder(id);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    revalidatePath('/kitchen');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete order.' };
  }
}

export async function getKitchenOrdersAction() {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const orders = await getKitchenOrders();
    return { success: true, orders };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch kitchen orders.' };
  }
}

export async function getRelatedOrdersForBillAction(orderId: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const { getOrderById } = await import('@/queries/orders');
    const order = await getOrderById(orderId);
    if (!order) return { error: 'Order not found.' };

    if (order.order_type !== 'Dine-In' || !order.table_number) {
      return { success: true, orders: [order] };
    }

    let tableOrders = [];

    if (order.status === 'Completed') {
      // Fetch all completed orders for this table around the same completion time (grouped checkout)
      const orderDate = new Date(order.completed_at || order.created_at);
      const minDate = new Date(orderDate.getTime() - 60000).toISOString(); // 1 min before
      const maxDate = new Date(orderDate.getTime() + 60000).toISOString(); // 1 min after

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('table_number', order.table_number)
        .eq('status', 'Completed')
        .gte('completed_at', minDate)
        .lte('completed_at', maxDate)
        .order('token_no', { ascending: true });

      if (error) throw error;
      
      // If completed_at was null or query returned empty, fallback to the order itself
      if (!data || data.length === 0) {
        tableOrders = [order];
      } else {
        tableOrders = data;
      }
    } else {
      // Fetch all related non-completed orders for this table created today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('table_number', order.table_number)
        .neq('status', 'Completed')
        .neq('status', 'Cancelled')
        .gte('created_at', startOfDay.toISOString())
        .order('token_no', { ascending: true });

      if (error) throw error;
      tableOrders = data || [];
    }
    
    // Hydrate items for all fetched orders
    const hydratedOrders = await Promise.all(tableOrders.map(async (o) => {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
      return { ...o, items: items || [] };
    }));

    return { success: true, orders: hydratedOrders };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch related orders.' };
  }
}

export async function getRecentOrdersAction(limit = 30) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const { getOrders } = await import('@/queries/orders');
    const orders = await getOrders({ limit });
    
    // Hydrate order_items for each order
    const hydrated = await Promise.all(orders.map(async (o) => {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
      return { ...o, items: items || [] };
    }));

    return { success: true, orders: hydrated };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch recent orders.' };
  }
}

export async function getItemWiseSalesAction(dateStr?: string) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const start = `${targetDate}T00:00:00.000Z`;
    const end = `${targetDate}T23:59:59.999Z`;

    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', start)
      .lte('created_at', end);

    if (ordersErr) throw ordersErr;
    if (!orders || orders.length === 0) {
      return { success: true, items: [] };
    }

    const orderIds = orders.map(o => o.id);
    const { data: orderItems, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsErr) throw itemsErr;

    const aggMap = new Map<string, { name: string; qty: number; price: number; total: number }>();
    (orderItems || []).forEach(it => {
      const name = it.name;
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const lineTotal = Number(it.total_price) || (qty * price);

      if (!aggMap.has(name)) {
        aggMap.set(name, { name, qty: 0, price, total: 0 });
      }
      const existing = aggMap.get(name)!;
      existing.qty += qty;
      existing.total += lineTotal;
    });

    const itemsList = Array.from(aggMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, items: itemsList };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch item wise sales.' };
  }
}

export async function removeOrderItemAction(itemId: number, orderId: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const { error: delErr } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (delErr) throw delErr;

    const { data: remainingItems, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsErr) throw itemsErr;

    const newSubtotal = (remainingItems || []).reduce(
      (sum, item) => sum + (Number(item.price) * Number(item.quantity)), 
      0
    );

    if ((remainingItems || []).length === 0) {
      const { data: orderRow } = await supabase.from('orders').select('table_number').eq('id', orderId).maybeSingle();
      await supabase.from('orders').delete().eq('id', orderId);

      if (orderRow?.table_number) {
        const { data: activeOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('table_number', orderRow.table_number)
          .neq('status', 'Completed')
          .neq('status', 'Cancelled');

        if (!activeOrders || activeOrders.length === 0) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'Available', active_order_id: null })
            .eq('table_number', orderRow.table_number);
        }
      }
    } else {
      await supabase
        .from('orders')
        .update({ 
          subtotal: newSubtotal, 
          grand_total: newSubtotal,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);
    }

    revalidatePath('/tables');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('removeOrderItemAction error:', error);
    return { error: error.message || 'Failed to remove item.' };
  }
}
