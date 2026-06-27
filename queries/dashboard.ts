import { query } from '@/db';
import { DashboardStats } from '@/types';

export async function getDashboardStats(): Promise<DashboardStats> {
  // 1. Aggregate Sales & Order Counts
  const statsSql = `
    SELECT
      COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE AND status = 'Completed' THEN grand_total ELSE 0 END), 0) as today_sales,
      COALESCE(SUM(CASE WHEN created_at::date = (CURRENT_DATE - INTERVAL '1 day')::date AND status = 'Completed' THEN grand_total ELSE 0 END), 0) as yesterday_sales,
      COALESCE(SUM(CASE WHEN created_at >= (CURRENT_DATE - INTERVAL '7 days') AND status = 'Completed' THEN grand_total ELSE 0 END), 0) as last_7_days_sales,
      COALESCE(SUM(CASE WHEN created_at >= (CURRENT_DATE - INTERVAL '30 days') AND status = 'Completed' THEN grand_total ELSE 0 END), 0) as last_30_days_sales,
      
      COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today_orders,
      COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_orders
    FROM orders
  `;
  
  const statsRes = await query(statsSql);
  const row = statsRes.rows[0];

  const todaySales = Number(row?.today_sales ?? 0);
  const yesterdaySales = Number(row?.yesterday_sales ?? 0);
  const last7DaysSales = Number(row?.last_7_days_sales ?? 0);
  const last30DaysSales = Number(row?.last_30_days_sales ?? 0);
  
  const todayOrdersCount = parseInt(row?.today_orders ?? 0);
  const pendingOrdersCount = parseInt(row?.pending_orders ?? 0);
  const completedOrdersCount = parseInt(row?.completed_orders ?? 0);
  const cancelledOrdersCount = parseInt(row?.cancelled_orders ?? 0);

  // 2. Average Order Value (AOV)
  const aovSql = `
    SELECT COALESCE(AVG(grand_total), 0) as aov 
    FROM orders 
    WHERE status = 'Completed'
  `;
  const aovRes = await query(aovSql);
  const averageOrderValue = Number(aovRes.rows[0]?.aov ?? 0);

  // 3. Top Selling Items
  const topItemsSql = `
    SELECT name, SUM(quantity) as quantity, SUM(total_price) as revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'Completed'
    GROUP BY name
    ORDER BY quantity DESC
    LIMIT 5
  `;
  const topItemsRes = await query(topItemsSql);
  const topSellingItems = topItemsRes.rows.map(r => ({
    name: r.name,
    quantity: parseInt(r.quantity),
    revenue: Number(r.revenue),
  }));

  // 4. Best Performing Category
  const bestCategorySql = `
    SELECT c.name, SUM(oi.quantity) as quantity
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'Completed'
    GROUP BY c.name
    ORDER BY quantity DESC
    LIMIT 1
  `;
  const bestCategoryRes = await query(bestCategorySql);
  const bestCategory = bestCategoryRes.rows[0]?.name || 'No Sales Yet';

  // 5. Weekly Sales Graph (Last 7 days series)
  const weeklyGraphSql = `
    SELECT d.date::date as date, COALESCE(SUM(o.grand_total), 0) as sales
    FROM generate_series((CURRENT_DATE - INTERVAL '6 days')::date, CURRENT_DATE::date, '1 day'::interval) d(date)
    LEFT JOIN orders o ON o.created_at::date = d.date::date AND o.status = 'Completed'
    GROUP BY d.date
    ORDER BY d.date ASC
  `;
  const weeklyRes = await query(weeklyGraphSql);
  const salesGraphData = weeklyRes.rows.map(r => {
    const d = new Date(r.date);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      sales: Number(r.sales)
    };
  });

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
  const sql = `
    SELECT 
      -- Income vs Expense comparison (This Month)
      (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE status = 'Completed' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)) as month_revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)) as month_expenses,
      
      -- Order Count comparison (This Month vs Last Month)
      (SELECT COUNT(*) FROM orders WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)) as cur_month_orders,
      (SELECT COUNT(*) FROM orders WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) as prev_month_orders
  `;
  const res = await query(sql);
  const row = res.rows[0];
  
  return {
    monthRevenue: Number(row?.month_revenue ?? 0),
    monthExpenses: Number(row?.month_expenses ?? 0),
    monthProfit: Number(row?.month_revenue ?? 0) - Number(row?.month_expenses ?? 0),
    curMonthOrders: parseInt(row?.cur_month_orders ?? 0),
    prevMonthOrders: parseInt(row?.prev_month_orders ?? 0)
  };
}
