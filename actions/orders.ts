'use server';

import { revalidatePath } from 'next/cache';
import { createOrder, updateOrderStatus, completeOrderAndBill, deleteOrder } from '@/queries/orders';
import { orderSchema, OrderInput } from '@/schemas/order';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus, PaymentType } from '@/types';

export async function createOrderAction(data: OrderInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Order validation failed:', parsed.error.format());
    const firstError = parsed.error.issues[0]?.message || 'Invalid order structure.';
    return { error: `Validation Error: ${firstError}` };
  }

  try {
    const saved = await createOrder(parsed.data);
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
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete order.' };
  }
}
