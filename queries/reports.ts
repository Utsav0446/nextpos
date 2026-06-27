import { query } from '@/db';
import { DailyReportRow } from '@/types';

/**
 * Returns a 7-day breakdown of orders, revenue, expenses, profit, AOV, and top selling item per day.
 */
export async function getSevenDayReport(): Promise<DailyReportRow[]> {
  const sql = `
    WITH day_series AS (
      SELECT generate_series((CURRENT_DATE - INTERVAL '6 days')::timestamp, CURRENT_DATE::timestamp, '1 day'::interval)::date as report_date
    ),
    day_orders AS (
      SELECT 
        created_at::date as order_date,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN grand_total ELSE 0 END), 0) as revenue,
        COALESCE(AVG(CASE WHEN status = 'Completed' THEN grand_total ELSE NULL END), 0) as average_order_val,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_orders
      FROM orders
      GROUP BY created_at::date
    ),
    day_expenses AS (
      SELECT 
        expense_date as exp_date,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      GROUP BY expense_date
    ),
    day_item_totals AS (
      SELECT 
        o.created_at::date as item_date,
        oi.name as top_item_name,
        SUM(oi.quantity) as quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'Completed'
      GROUP BY o.created_at::date, oi.name
    ),
    day_top_item AS (
      SELECT DISTINCT ON (item_date)
        item_date,
        top_item_name,
        quantity
      FROM day_item_totals
      ORDER BY item_date, quantity DESC
    )
    
    SELECT 
      ds.report_date::text as date,
      COALESCE(d_ord.total_orders, 0)::int as orders,
      COALESCE(d_ord.revenue, 0)::double precision as revenue,
      COALESCE(de.expenses, 0)::double precision as expenses,
      (COALESCE(d_ord.revenue, 0) - COALESCE(de.expenses, 0))::double precision as profit,
      COALESCE(d_ord.average_order_val, 0)::double precision as average_order_value,
      COALESCE(d_ord.cancelled_orders, 0)::int as cancelled_orders,
      COALESCE(dti.top_item_name, 'N/A') as top_item
    FROM day_series ds
    LEFT JOIN day_orders d_ord ON ds.report_date = d_ord.order_date
    LEFT JOIN day_expenses de ON ds.report_date = de.exp_date
    LEFT JOIN day_top_item dti ON ds.report_date = dti.item_date
    ORDER BY ds.report_date DESC
  `;
  const result = await query(sql);
  return result.rows;
}

/**
 * Returns aggregated financial summary reports for a specified date range.
 */
export async function getFinancialSummary(startDate: string, endDate: string) {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN grand_total ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN subtotal ELSE 0 END), 0) as total_subtotal,
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN tax ELSE 0 END), 0) as total_tax,
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN discount ELSE 0 END), 0) as total_discounts,
      COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders_count,
      COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_orders_count,
      COUNT(*) as total_orders_count
    FROM orders
    WHERE created_at::date >= $1 AND created_at::date <= $2
  `;
  const orderStats = await query(sql, [startDate, endDate]);
  const orderRow = orderStats.rows[0];

  const expenseSql = `
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE expense_date >= $1 AND expense_date <= $2
  `;
  const expenseStats = await query(expenseSql, [startDate, endDate]);
  const expenseRow = expenseStats.rows[0];

  const totalRevenue = Number(orderRow?.total_revenue ?? 0);
  const totalExpenses = Number(expenseRow?.total_expenses ?? 0);
  const netProfit = totalRevenue - totalExpenses;

  // Best categories sold
  const categoriesSql = `
    SELECT c.name as category_name, SUM(oi.quantity)::int as quantity, SUM(oi.total_price)::double precision as revenue
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'Completed' AND o.created_at::date >= $1 AND o.created_at::date <= $2
    GROUP BY c.name
    ORDER BY quantity DESC
  `;
  const categorySplit = await query(categoriesSql, [startDate, endDate]);

  // Popular items
  const popularItemsSql = `
    SELECT oi.name, SUM(oi.quantity)::int as quantity, SUM(oi.total_price)::double precision as revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'Completed' AND o.created_at::date >= $1 AND o.created_at::date <= $2
    GROUP BY oi.name
    ORDER BY quantity DESC
    LIMIT 10
  `;
  const popularItems = await query(popularItemsSql, [startDate, endDate]);

  return {
    revenue: totalRevenue,
    subtotal: Number(orderRow?.total_subtotal ?? 0),
    tax: Number(orderRow?.total_tax ?? 0),
    discounts: Number(orderRow?.total_discounts ?? 0),
    expenses: totalExpenses,
    profit: netProfit,
    completedOrders: parseInt(orderRow?.completed_orders_count ?? 0),
    cancelledOrders: parseInt(orderRow?.cancelled_orders_count ?? 0),
    totalOrders: parseInt(orderRow?.total_orders_count ?? 0),
    categoryPerformance: categorySplit.rows,
    popularItems: popularItems.rows,
  };
}

/**
 * Returns yearly breakdown of sales and expenses by month
 */
export async function getYearlyBreakdown(year: number) {
  const sql = `
    WITH months AS (
      SELECT generate_series(
        date_trunc('year', to_date($1::text, 'YYYY')),
        date_trunc('year', to_date($1::text, 'YYYY')) + INTERVAL '11 months',
        '1 month'::interval
      )::date as month_date
    ),
    monthly_sales AS (
      SELECT 
        date_trunc('month', created_at)::date as m_date,
        SUM(grand_total) as revenue
      FROM orders
      WHERE status = 'Completed' AND EXTRACT(YEAR FROM created_at) = $1
      GROUP BY date_trunc('month', created_at)
    ),
    monthly_expenses AS (
      SELECT 
        date_trunc('month', expense_date)::date as m_date,
        SUM(amount) as expenses
      FROM expenses
      WHERE EXTRACT(YEAR FROM expense_date) = $1
      GROUP BY date_trunc('month', expense_date)
    )
    
    SELECT 
      TO_CHAR(m.month_date, 'Month') as month,
      EXTRACT(MONTH FROM m.month_date)::int as month_num,
      COALESCE(ms.revenue, 0)::double precision as revenue,
      COALESCE(me.expenses, 0)::double precision as expenses,
      (COALESCE(ms.revenue, 0) - COALESCE(me.expenses, 0))::double precision as profit
    FROM months m
    LEFT JOIN monthly_sales ms ON m.month_date = ms.m_date
    LEFT JOIN monthly_expenses me ON m.month_date = me.m_date
    ORDER BY m.month_date ASC
  `;
  const result = await query(sql, [year]);
  return result.rows;
}

/**
 * Aggregates summary statistics and daily intervals for a specified period.
 */
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
        // default to week (7 days)
        start.setDate(end.getDate() - 6);
      }
      
      const getISOStringStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      startDateStr = getISOStringStr(start);
      endDateStr = getISOStringStr(end);
    }
  }

  // 1. Daily series breakdown query
  const sqlBreakdown = `
    WITH day_series AS (
      SELECT generate_series($1::timestamp, $2::timestamp, '1 day'::interval)::date as report_date
    ),
    day_orders AS (
      SELECT 
        created_at::date as order_date,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN grand_total ELSE 0 END), 0) as revenue
      FROM orders
      GROUP BY created_at::date
    ),
    day_expenses AS (
      SELECT 
        expense_date as exp_date,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      GROUP BY expense_date
    )
    SELECT 
      ds.report_date::text as date,
      COALESCE(d_ord.total_orders, 0)::int as orders,
      COALESCE(d_ord.revenue, 0)::double precision as sales,
      COALESCE(de.expenses, 0)::double precision as expenses,
      (COALESCE(d_ord.revenue, 0) - COALESCE(de.expenses, 0))::double precision as profit
    FROM day_series ds
    LEFT JOIN day_orders d_ord ON ds.report_date = d_ord.order_date
    LEFT JOIN day_expenses de ON ds.report_date = de.exp_date
    ORDER BY ds.report_date DESC
  `;

  const breakdownRes = await query(sqlBreakdown, [startDateStr, endDateStr]);
  const dailyBreakdown = breakdownRes.rows;

  // 2. Summary statistics query
  const sqlSummary = `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN grand_total ELSE 0 END), 0) as total_sales,
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN tax ELSE 0 END), 0) as total_tax,
      COUNT(CASE WHEN status = 'Completed' THEN 1 END) as orders_count,
      COALESCE(AVG(CASE WHEN status = 'Completed' THEN grand_total ELSE NULL END), 0) as avg_order_value
    FROM orders
    WHERE created_at::date >= $1 AND created_at::date <= $2
  `;
  const summaryRes = await query(sqlSummary, [startDateStr, endDateStr]);
  const sRow = summaryRes.rows[0];

  const sqlExpenseSummary = `
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE expense_date >= $1 AND expense_date <= $2
  `;
  const expenseSummaryRes = await query(sqlExpenseSummary, [startDateStr, endDateStr]);
  const eRow = expenseSummaryRes.rows[0];

  const totalSales = Number(sRow?.total_sales ?? 0);
  const totalExpenses = Number(eRow?.total_expenses ?? 0);
  const profit = totalSales - totalExpenses;
  const gstCollected = Number(sRow?.total_tax ?? 0);
  const ordersCount = parseInt(sRow?.orders_count ?? 0);
  const avgOrderValue = Number(sRow?.avg_order_value ?? 0);

  return {
    summary: {
      totalSales,
      totalExpenses,
      profit,
      gstCollected,
      ordersCount,
      avgOrderValue,
    },
    dailyBreakdown,
  };
}

