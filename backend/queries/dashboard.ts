import { supabase } from '@/db';
import { DashboardStats } from '@/types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfYesterday = yesterday.toISOString();
  
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const startOf7DaysAgo = sevenDaysAgo.toISOString();
  
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const startOf30DaysAgo = thirtyDaysAgo.toISOString();

  // 1. Fetch Orders in the last 30 days or pending
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, created_at, status, grand_total')
    .or(`created_at.gte.${startOf30DaysAgo},status.eq.Pending`);

  if (ordersError) throw ordersError;

  let todaySales = 0;
  let yesterdaySales = 0;
  let last7DaysSales = 0;
  let last30DaysSales = 0;

  let todayOrdersCount = 0;
  let pendingOrdersCount = 0;
  let completedOrdersCount = 0;
  let cancelledOrdersCount = 0;

  let aovSum = 0;
  let aovCount = 0;

  const todayStr = startOfToday.split('T')[0];
  const yesterdayStr = startOfYesterday.split('T')[0];

  (orders || []).forEach(o => {
    const orderDate = new Date(o.created_at);
    const orderDateStr = o.created_at.split('T')[0];
    const isCompleted = o.status === 'Completed';

    if (isCompleted) {
      if (orderDateStr === todayStr) {
        todaySales += Number(o.grand_total);
      } else if (orderDateStr === yesterdayStr) {
        yesterdaySales += Number(o.grand_total);
      }
      
      if (orderDate >= sevenDaysAgo) {
        last7DaysSales += Number(o.grand_total);
      }
      if (orderDate >= thirtyDaysAgo) {
        last30DaysSales += Number(o.grand_total);
        aovSum += Number(o.grand_total);
        aovCount++;
      }
    }

    if (orderDateStr === todayStr) {
      todayOrdersCount++;
      if (o.status === 'Completed') completedOrdersCount++;
      if (o.status === 'Cancelled') cancelledOrdersCount++;
    }

    if (o.status === 'Pending') {
      pendingOrdersCount++;
    }
  });

  const averageOrderValue = aovCount > 0 ? aovSum / aovCount : 0;

  // 2. Fetch today's completed order items to calculate top items & best category
  const { data: todayItems, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id, name, quantity, total_price, menu_item_id,
      order:orders!inner(id, created_at, status)
    `)
    .gte('order.created_at', startOfToday)
    .eq('order.status', 'Completed');

  if (itemsError) throw itemsError;

  // Aggregate Top Selling Items
  const itemMap: Record<string, { quantity: number; revenue: number }> = {};
  (todayItems || []).forEach((row: any) => {
    const name = row.name;
    const qty = parseInt(row.quantity);
    const rev = Number(row.total_price);
    
    if (!itemMap[name]) {
      itemMap[name] = { quantity: 0, revenue: 0 };
    }
    itemMap[name].quantity += qty;
    itemMap[name].revenue += rev;
  });

  const topSellingItems = Object.entries(itemMap)
    .map(([name, val]) => ({
      name,
      quantity: val.quantity,
      revenue: val.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Best Category today: we can join menu_items with categories
  let bestCategory = 'No Sales Today';
  const menuItemIds = (todayItems || []).map((row: any) => row.menu_item_id).filter(id => !!id);
  
  if (menuItemIds.length > 0) {
    const { data: menuWithCats, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, category:categories(name)')
      .in('id', menuItemIds);

    if (!menuErr && menuWithCats) {
      const catMap: Record<string, number> = {};
      (todayItems || []).forEach((row: any) => {
        const menuItem = menuWithCats.find(m => m.id === row.menu_item_id);
        const cat = menuItem?.category as any;
        const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
        if (catName) {
          catMap[catName] = (catMap[catName] || 0) + parseInt(row.quantity);
        }
      });
      
      const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      if (sortedCats.length > 0) {
        bestCategory = sortedCats[0][0];
      }
    }
  }

  const salesGraphData: { date: string; sales: number }[] = [];

  return {
    todaySales,
    yesterdaySales,
    last7DaysSales,
    last30DaysSales,
    todayOrdersCount,
    pendingOrdersCount,
    completedOrdersCount,
    cancelledOrdersCount,
    averageOrderValue,
    topSellingItems,
    bestCategory,
    salesGraphData
  };
}

export async function getDashboardComparisonStats() {
  const now = new Date();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  // 1. Current Month Revenue
  const { data: curRevenueData, error: revErr } = await supabase
    .from('orders')
    .select('grand_total')
    .eq('status', 'Completed')
    .gte('created_at', curMonthStart);

  if (revErr) throw revErr;
  const monthRevenue = (curRevenueData || []).reduce((acc, curr) => acc + Number(curr.grand_total), 0);

  // 2. Current Month Expenses
  const { data: curExpensesData, error: expErr } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', curMonthStart.split('T')[0]);

  if (expErr) throw expErr;
  const monthExpenses = (curExpensesData || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

  // 3. Current Month Order Count
  const { count: curMonthOrders, error: curOrdersErr } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', curMonthStart);

  if (curOrdersErr) throw curOrdersErr;

  // 4. Previous Month Order Count
  const { count: prevMonthOrders, error: prevOrdersErr } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', prevMonthStart)
    .lte('created_at', prevMonthEnd);

  if (prevOrdersErr) throw prevOrdersErr;

  return {
    monthRevenue,
    monthExpenses,
    monthProfit: monthRevenue - monthExpenses,
    curMonthOrders: curMonthOrders || 0,
    prevMonthOrders: prevMonthOrders || 0,
  };
}
