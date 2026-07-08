'use server';

import { revalidatePath } from 'next/cache';
import { 
  createSupplier, updateSupplier, deleteSupplier,
  createInventoryItem, updateInventoryItem, deleteInventoryItem,
  createPurchaseRecord 
} from '@/queries/inventory';
import { 
  supplierSchema, SupplierInput, 
  inventoryItemSchema, InventoryItemInput, 
  purchaseRecordSchema, PurchaseRecordInput 
} from '@/schemas/inventory';
import { getCurrentUser } from '@/lib/auth';

export async function saveSupplierAction(id: number | null, data: SupplierInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) return { error: 'Invalid supplier fields.' };

  try {
    if (id) {
      await updateSupplier(id, parsed.data);
    } else {
      await createSupplier(parsed.data);
    }
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save supplier.' };
  }
}

export async function deleteSupplierAction(id: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await deleteSupplier(id);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete supplier.' };
  }
}

export async function saveInventoryItemAction(id: number | null, data: InventoryItemInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = inventoryItemSchema.safeParse(data);
  if (!parsed.success) return { error: 'Invalid inventory item input parameters.' };

  try {
    if (id) {
      await updateInventoryItem(id, parsed.data);
    } else {
      await createInventoryItem(parsed.data);
    }
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save inventory item.' };
  }
}

export async function deleteInventoryItemAction(id: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await deleteInventoryItem(id);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete inventory item.' };
  }
}

export async function recordPurchaseAction(data: PurchaseRecordInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = purchaseRecordSchema.safeParse(data);
  if (!parsed.success) return { error: 'Invalid purchase inputs. Quantities and prices must be positive.' };

  try {
    await createPurchaseRecord(parsed.data);
    revalidatePath('/inventory');
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to record inventory purchase.' };
  }
}
