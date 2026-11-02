import { supabase } from '@/db';
import { DailyReportRow } from '@/types';

const reportsCache = new Map<string, { data: any; expiry: number }>();

export function clearReportsCache() {
  reportsCache.clear();
}

function getDatesInRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  let curr = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  while (curr <= end) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export async function getSevenDayReport(): Promise<DailyReportRow[]> {
  const cacheKey = 'seven-day-report';
  const cached = reportsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const startStr = `${sevenDaysAgo.toISOString().split('T')[0]}T00:00:00.000Z`;

  const [ordersRes, expensesRes, itemsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at, status, grand_total')
      .gte('created_at', startStr),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', startStr.split('T')[0]),
    supabase
      .from('order_items')
      .select(`
        name, quantity,
        order:orders!inner(created_at, status)
      `)
      .gte('order.created_at', startStr)
      .eq('order.status', 'Completed')
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const orders = ordersRes.data || [];
  const expenses = expensesRes.data || [];
  const items = itemsRes.data || [];

  const datesList = getDatesInRange(sevenDaysAgo, now).reverse();

  const result: DailyReportRow[] = datesList.map(dateStr => {
    const dayOrders = orders.filter(o => o.created_at.split('T')[0] === dateStr);
    const dayCompletedOrders = dayOrders.filter(o => o.status === 'Completed');
    
    const totalOrders = dayOrders.length;
    const cancelledOrders = dayOrders.filter(o => o.status === 'Cancelled').length;
    
    const revenue = dayCompletedOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);
    const averageOrderValue = dayCompletedOrders.length > 0 ? revenue / dayCompletedOrders.length : 0;

    const dayExpenses = expenses
      .filter(e => e.expense_date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const dayItemsMap: Record<string, number> = {};
    items.forEach((item: any) => {
      if (item.order.created_at.split('T')[0] === dateStr) {
        dayItemsMap[item.name] = (dayItemsMap[item.name] || 0) + Number(item.quantity);
      }
    });

    const sortedItems = Object.entries(dayItemsMap).sort((a, b) => b[1] - a[1]);
    const topItem = sortedItems.length > 0 ? sortedItems[0][0] : 'N/A';

    return {
      date: dateStr,
      orders: totalOrders,
      revenue,
      expenses: dayExpenses,
      profit: revenue - dayExpenses,
      average_order_value: averageOrderValue,
      cancelled_orders: cancelledOrders,
      top_item: topItem
    };
  });

  reportsCache.set(cacheKey, { data: result, expiry: Date.now() + 5 * 60 * 1000 });
  return result;
}

export async function getFinancialSummary(startDate: string, endDate: string) {
  const cacheKey = `financial-summary:${startDate}:${endDate}`;
  const cached = reportsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const startStr = `${startDate}T00:00:00.000Z`;
  const endStr = `${endDate}T23:59:59.999Z`;

  const [ordersRes, expensesRes, itemsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('status, grand_total, subtotal, tax, discount')
      .gte('created_at', startStr)
      .lte('created_at', endStr),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate),
    supabase
      .from('order_items')
      .select(`
        name, quantity, total_price, menu_item_id,
        order:orders!inner(created_at, status)
      `)
      .gte('order.created_at', startStr)
      .lte('order.created_at', endStr)
      .eq('order.status', 'Completed')
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const orders = ordersRes.data || [];
  const expenses = expensesRes.data || [];
  const items = itemsRes.data || [];

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const cancelledOrdersCount = orders.filter(o => o.status === 'Cancelled').length;

  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const totalSubtotal = completedOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const totalTax = completedOrders.reduce((sum, o) => sum + Number(o.tax), 0);
  const totalDiscounts = completedOrders.reduce((sum, o) => sum + Number(o.discount), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const itemMap: Record<string, { quantity: number; revenue: number }> = {};
  items.forEach((row: any) => {
    const name = row.name;
    const qty = parseInt(row.quantity);
    const rev = Number(row.total_price);
    
    if (!itemMap[name]) {
      itemMap[name] = { quantity: 0, revenue: 0 };
    }
    itemMap[name].quantity += qty;
    itemMap[name].revenue += rev;
  });

  const popularItems = Object.entries(itemMap)
    .map(([name, val]) => ({
      name,
      quantity: val.quantity,
      revenue: val.revenue
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const categoryPerformance: { category_name: string; quantity: number; revenue: number }[] = [];
  const menuItemIds = items.map((row: any) => row.menu_item_id).filter(id => !!id);

  if (menuItemIds.length > 0) {
    const { data: menuWithCats, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, category:categories(name)')
      .in('id', menuItemIds);

    if (!menuErr && menuWithCats) {
      const catPerformanceMap: Record<string, { quantity: number; revenue: number }> = {};
      items.forEach((row: any) => {
        const menuItem = menuWithCats.find(m => m.id === row.menu_item_id);
        const catName = (menuItem?.category as any)?.name || 'Uncategorized';
        
        if (!catPerformanceMap[catName]) {
          catPerformanceMap[catName] = { quantity: 0, revenue: 0 };
        }
        catPerformanceMap[catName].quantity += parseInt(row.quantity);
        catPerformanceMap[catName].revenue += Number(row.total_price);
      });

      Object.entries(catPerformanceMap).forEach(([category_name, val]) => {
        categoryPerformance.push({
          category_name,
          quantity: val.quantity,
          revenue: val.revenue
        });
      });

      categoryPerformance.sort((a, b) => b.quantity - a.quantity);
    }
  }

  const res = {
    revenue: totalRevenue,
    subtotal: totalSubtotal,
    tax: totalTax,
    discounts: totalDiscounts,
    expenses: totalExpenses,
    profit: totalRevenue - totalExpenses,
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrdersCount,
    totalOrders: orders.length,
    categoryPerformance,
    popularItems,
  };

  reportsCache.set(cacheKey, { data: res, expiry: Date.now() + 5 * 60 * 1000 });
  return res;
}

export async function getYearlyBreakdown(year: number) {
  const cacheKey = `yearly-breakdown:${year}`;
  const cached = reportsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const startYear = `${year}-01-01T00:00:00.000Z`;
  const endYear = `${year}-12-31T23:59:59.999Z`;

  const [ordersRes, expensesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('grand_total, created_at')
      .eq('status', 'Completed')
      .gte('created_at', startYear)
      .lte('created_at', endYear),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', `${year}-01-01`)
      .lte('expense_date', `${year}-12-31`)
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const orders = ordersRes.data || [];
  const expenses = expensesRes.data || [];

  const monthsName = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const rows = monthsName.map((monthName, idx) => {
    const monthNum = idx + 1;

    const monthRevenue = orders
      .filter(o => new Date(o.created_at).getMonth() === idx)
      .reduce((sum, o) => sum + Number(o.grand_total), 0);

    const monthExpenses = expenses
      .filter(e => new Date(e.expense_date).getMonth() === idx)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      month: monthName,
      month_num: monthNum,
      revenue: monthRevenue,
      expenses: monthExpenses,
      profit: monthRevenue - monthExpenses
    };
  });

  reportsCache.set(cacheKey, { data: rows, expiry: Date.now() + 5 * 60 * 1000 });
  return rows;
}

export async function getReportData(
  period: string,
  customStart?: string,
  customEnd?: string
) {
  let startDateStr = customStart;
  let endDateStr = customEnd;

  if (period === 'week' || !startDateStr || !endDateStr) {
    if (!startDateStr || !endDateStr) {
      const end = new Date();
      const start = new Date();
      if (period === 'month') {
        start.setDate(end.getDate() - 29);
      } else {
        start.setDate(end.getDate() - 6);
      }
      
      const getISOStringStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      
      startDateStr = getISOStringStr(start);
      endDateStr = getISOStringStr(end);
    }
  }

  const cacheKey = `report-data:${period}:${startDateStr}:${endDateStr}`;
  const cached = reportsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const startStr = `${startDateStr}T00:00:00.000Z`;
  const endStr = `${endDateStr}T23:59:59.999Z`;

  const [ordersRes, expensesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('created_at, status, grand_total, order_type, tax')
      .gte('created_at', startStr)
      .lte('created_at', endStr),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', startDateStr)
      .lte('expense_date', endDateStr)
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const orders = ordersRes.data || [];
  const expenses = expensesRes.data || [];

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const datesList = getDatesInRange(startDate, endDate).reverse();

  const dailyBreakdown = datesList.map(dateStr => {
    const dayOrders = orders.filter(o => o.created_at.split('T')[0] === dateStr);
    const dayCompletedOrders = dayOrders.filter(o => o.status === 'Completed');

    const totalOrders = dayOrders.length;
    const sales = dayCompletedOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);
    const parcel_sales = dayCompletedOrders
      .filter(o => o.order_type === 'Takeaway')
      .reduce((sum, o) => sum + Number(o.grand_total), 0);
    const sitting_sales = dayCompletedOrders
      .filter(o => o.order_type === 'Dine-In')
      .reduce((sum, o) => sum + Number(o.grand_total), 0);

    const dayExpenses = expenses
      .filter(e => e.expense_date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      date: dateStr,
      orders: totalOrders,
      sales,
      parcel_sales,
      sitting_sales,
      expenses: dayExpenses,
      profit: sales - dayExpenses
    };
  });

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const totalTax = completedOrders.reduce((sum, o) => sum + Number(o.tax || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  const res = {
    summary: {
      totalSales,
      totalExpenses,
      profit: totalSales - totalExpenses,
      gstCollected: totalTax,
      ordersCount: completedOrders.length,
      avgOrderValue,
    },
    dailyBreakdown,
  };

  reportsCache.set(cacheKey, { data: res, expiry: Date.now() + 5 * 60 * 1000 });
  return res;
}
