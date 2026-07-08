import { supabase } from '@/db';
import { InventoryItem, Supplier, PurchaseRecord } from '@/types';

// ==========================================
// SUPPLIERS
// ==========================================

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getSupplierById(id: number): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createSupplier(supplier: {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: supplier.name,
      contact_name: supplier.contact_name || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: supplier.name,
      contact_name: supplier.contact_name || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ==========================================
// INVENTORY
// ==========================================

export async function getInventoryItems(options: { search?: string; limit?: number; offset?: number } = {}): Promise<InventoryItem[]> {
  const { search, limit, offset } = options;

  let req = supabase
    .from('inventory')
    .select(`
      *,
      supplier:suppliers(name)
    `);

  if (search) {
    req = req.ilike('name', `%${search}%`);
  }

  req = req.order('name', { ascending: true });

  if (limit !== undefined && offset !== undefined) {
    req = req.range(offset, offset + limit - 1);
  }

  const { data, error } = await req;
  if (error) throw error;

  return (data || []).map((i: any) => ({
    ...i,
    supplier_name: i.supplier?.name || null
  }));
}

export async function countInventoryItems(search?: string): Promise<number> {
  let req = supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  if (search) {
    req = req.ilike('name', `%${search}%`);
  }

  const { count, error } = await req;
  if (error) throw error;
  return count || 0;
}

export async function getInventoryItemById(id: number): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      supplier:suppliers(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    supplier_name: data.supplier?.name || null
  };
}

export async function createInventoryItem(item: {
  name: string;
  stock_quantity: number;
  unit: string;
  low_stock_threshold: number;
  supplier_id?: number | null;
}): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      name: item.name,
      stock_quantity: item.stock_quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
      supplier_id: item.supplier_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from('inventory')
    .update({
      name: item.name,
      stock_quantity: item.stock_quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
      supplier_id: item.supplier_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      supplier:suppliers(name)
    `);

  if (error) throw error;

  const lowStock = (data || [])
    .filter((i: any) => Number(i.stock_quantity) <= Number(i.low_stock_threshold))
    .map((i: any) => ({
      ...i,
      supplier_name: i.supplier?.name || null
    }));

  return lowStock.sort((a, b) => a.name.localeCompare(b.name));
}

// ==========================================
// PURCHASE RECORDS
// ==========================================

export async function getPurchaseRecords(options: { limit?: number; offset?: number } = {}): Promise<PurchaseRecord[]> {
  const { limit, offset } = options;

  let req = supabase
    .from('purchase_history')
    .select(`
      *,
      inventory:inventory(name),
      supplier:suppliers(name)
    `);

  req = req.order('purchase_date', { ascending: false })
            .order('created_at', { ascending: false });

  if (limit !== undefined && offset !== undefined) {
    req = req.range(offset, offset + limit - 1);
  }

  const { data, error } = await req;
  if (error) throw error;

  return (data || []).map((p: any) => ({
    ...p,
    inventory_name: p.inventory?.name || 'Unknown',
    supplier_name: p.supplier?.name || null
  }));
}

export async function countPurchaseRecords(): Promise<number> {
  const { count, error } = await supabase
    .from('purchase_history')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
}

export async function createPurchaseRecord(record: {
  inventory_id: number;
  supplier_id?: number | null;
  quantity: number;
  unit_price: number;
  purchase_date: string;
}): Promise<PurchaseRecord> {
  const totalCost = record.quantity * record.unit_price;

  // 1. Insert purchase record
  const { data: savedRecord, error: recordError } = await supabase
    .from('purchase_history')
    .insert({
      inventory_id: record.inventory_id,
      supplier_id: record.supplier_id || null,
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_cost: totalCost,
      purchase_date: record.purchase_date,
    })
    .select()
    .single();

  if (recordError) throw recordError;

  // 2. Fetch current stock to increment it
  const { data: item, error: fetchError } = await supabase
    .from('inventory')
    .select('name, stock_quantity')
    .eq('id', record.inventory_id)
    .single();

  if (fetchError) throw fetchError;

  const newStock = Number(item.stock_quantity) + record.quantity;

  // Update inventory stock
  const { error: updateStockError } = await supabase
    .from('inventory')
    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
    .eq('id', record.inventory_id);

  if (updateStockError) throw updateStockError;

  // 3. Log into Expenses
  const { error: expenseError } = await supabase
    .from('expenses')
    .insert({
      category: 'Vegetables',
      amount: totalCost,
      reason: `Inventory Purchase: ${item.name}`,
      notes: `Purchased ${record.quantity} units of ${item.name} at unit price of ${record.unit_price}`,
      expense_date: record.purchase_date,
    });

  if (expenseError) throw expenseError;

  // 4. Log Audit Activity
  await supabase
    .from('audit_logs')
    .insert({
      action: 'PURCHASE_INVENTORY',
      details: `Purchased stock for ${item.name}. Cost: ${totalCost}`,
    });

  return savedRecord;
}
