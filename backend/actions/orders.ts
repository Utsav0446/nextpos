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
