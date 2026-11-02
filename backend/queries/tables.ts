import { supabase } from '@/db';

export interface RestaurantTable {
  id: number;
  table_number: string;
  capacity: number;
  original_capacity: number;
  status: 'Available' | 'Dirty' | 'Occupied';
  active_order_id?: number;
  customer_name?: string;
  grand_total?: number;
  elapsed_minutes?: number;
  merged_with?: number | null;
  merged_children?: string[];
  merged_child_ids?: number[];
  is_merge_primary?: boolean;
  is_merge_child?: boolean;
  merge_primary_number?: string;
  split_from?: number | null;
  is_split_primary?: boolean;
  is_split_child?: boolean;
  split_child_number?: string;
  split_child_id?: number;
}

export async function getTables(): Promise<RestaurantTable[]> {
  // 1. Fetch all tables
  const { data: tablesData, error: tablesError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .order('table_number', { ascending: true });

  if (tablesError) throw tablesError;

  // 2. Fetch all active orders
  const { data: activeOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, grand_total, created_at')
    .in('status', ['Pending', 'Preparing'])
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;

  // Build a map of primary table IDs → child table numbers/ids
  const childrenMap = new Map<number, { numbers: string[]; ids: number[] }>();
  (tablesData || []).forEach(row => {
    if (row.merged_with) {
      const existing = childrenMap.get(row.merged_with) || { numbers: [], ids: [] };
      existing.numbers.push(row.table_number);
      existing.ids.push(row.id);
      childrenMap.set(row.merged_with, existing);
    }
  });

  // Build a map of split primary table IDs → child table numbers/ids
  const splitChildrenMap = new Map<number, { number: string; id: number }>();
  (tablesData || []).forEach(row => {
    if (row.split_from) {
      splitChildrenMap.set(row.split_from, { number: row.table_number, id: row.id });
    }
  });

  const now = new Date();

  const mappedTables = (tablesData || []).map(row => {
    // Find ALL active orders for this table
    const tableOrders = (activeOrders || []).filter(o => 
      o.table_number && o.table_number.trim().toLowerCase() === row.table_number.trim().toLowerCase()
    );

    // Sort by created_at ascending (oldest first) so we get the true start of the session
    tableOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const firstOrder = tableOrders.length > 0 ? tableOrders[0] : null;

    const children = childrenMap.get(row.id);
    const isMergePrimary = !!children && children.numbers.length > 0;
    const isMergeChild = !!row.merged_with;

    const splitChild = splitChildrenMap.get(row.id);
    const isSplitPrimary = !!splitChild;
    const isSplitChild = !!row.split_from;

    // Resolve merge_primary_number
    let merge_primary_number: string | undefined = undefined;
    if (row.merged_with) {
      const pt = (tablesData || []).find(t => t.id === row.merged_with);
      if (pt) merge_primary_number = pt.table_number;
    }

    // Resolve status
    let status = row.status;
    if (firstOrder) {
      status = 'Occupied';
    }

    let elapsed_minutes: number | undefined = undefined;
    if (firstOrder) {
      let createdAt = firstOrder.created_at;
      if (!createdAt.includes('Z') && !createdAt.includes('+')) {
        createdAt += 'Z';
      }
      const elapsedMs = now.getTime() - new Date(createdAt).getTime();
      elapsed_minutes = Math.max(0, Math.floor(elapsedMs / 60000));
    }

    // Calculate aggregated grand_total
    let totalGrandTotal = undefined;
    if (tableOrders.length > 0) {
      totalGrandTotal = tableOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
    }

    // Find the first non-null customer name
    const customerName = tableOrders.find(o => o.customer_name)?.customer_name;

    return {
      id: row.id,
      table_number: row.table_number,
      capacity: row.capacity,
      original_capacity: row.original_capacity || row.capacity,
      status: status as any,
      active_order_id: firstOrder?.id || undefined,
      customer_name: customerName || undefined,
      grand_total: totalGrandTotal,
      elapsed_minutes,
      merged_with: row.merged_with || null,
      merged_children: isMergePrimary ? children!.numbers : undefined,
      merged_child_ids: isMergePrimary ? children!.ids : undefined,
      is_merge_primary: isMergePrimary,
      is_merge_child: isMergeChild,
      merge_primary_number,
      split_from: row.split_from || null,
      is_split_primary: isSplitPrimary,
      is_split_child: isSplitChild,
      split_child_number: isSplitPrimary ? splitChild!.number : undefined,
      split_child_id: isSplitPrimary ? splitChild!.id : undefined,
    };
  });

  // Sort naturally (e.g. T-2 before T-10)
  return mappedTables.sort((a, b) => 
    a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' })
  );
}
