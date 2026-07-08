import React from 'react';
import { getDashboardStats, getDashboardComparisonStats } from '@/queries/dashboard';
import { getSettings } from '@/queries/settings';
import { getRecentOrdersWithItems } from '@/queries/orders';
import { getAuditLogs } from '@/queries/logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/utils/format';
import { LanguageSelector } from '@/components/dashboard/LanguageSelector';
import { DashboardRecentOrders } from '@/components/dashboard/DashboardRecentOrders';

import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Activity, 
  Calendar,
  Layers,
  Sparkles,
  TrendingDown
} from 'lucide-react';

export const revalidate = 0; // Disable static rendering caching for dashboard to keep metrics real-time

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const comparisons = await getDashboardComparisonStats();
  const settings = await getSettings();
  const auditLogs = await getAuditLogs(5);
  const recentOrders = await getRecentOrdersWithItems(7);


  // Calculate day-over-day growth percentage
  const yesterdaySales = stats.yesterdaySales || 1; // avoid divide-by-zero
  const salesGrowth = ((stats.todaySales - stats.yesterdaySales) / yesterdaySales) * 100;

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            Dashboard Overview <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time analytics for {settings.restaurant_name}.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <LanguageSelector />
          <div className="flex items-center justify-center gap-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-zinc-500">
            <Calendar className="w-3.5 h-3.5 mr-1 animate-none" />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* KPI 1: Today's Sales */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Today&apos;s Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
                {formatCurrency(stats.todaySales, settings.currency)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold">
                {salesGrowth >= 0 ? (
                  <span className="text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{salesGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {salesGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-zinc-400">vs yesterday ({formatCurrency(stats.yesterdaySales, settings.currency)})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Active Orders */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Active Orders</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
                {stats.pendingOrdersCount}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                {stats.todayOrdersCount} orders placed today ({stats.completedOrdersCount} completed)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Average Order Value */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Avg Order Value</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
                {formatCurrency(stats.averageOrderValue, settings.currency)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                Top food category: <span className="text-zinc-900 dark:text-zinc-100 font-bold">{stats.bestCategory}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Monthly Profit */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Monthly Profit</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={`text-xl font-extrabold leading-tight ${comparisons.monthProfit >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-red-500'}`}>
                {formatCurrency(comparisons.monthProfit, settings.currency)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                Sales: {formatCurrency(comparisons.monthRevenue, settings.currency)} | Costs: {formatCurrency(comparisons.monthExpenses, settings.currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders History Section */}
      <DashboardRecentOrders initialOrders={recentOrders} settings={settings} />

      {/* Bottom Row Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items panel */}
        <Card className="flex flex-col h-[340px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-6 py-0 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {stats.topSellingItems.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-16">No sales recorded today.</p>
            ) : (
              stats.topSellingItems.map((item, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-550 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-[10px] text-zinc-400 font-semibold">{item.quantity} Qty sold</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(item.revenue, settings.currency)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Activity log timeline */}
        <Card className="flex flex-col h-[340px]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">System Activity Logs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-6 py-0 flex flex-col gap-3">
            {auditLogs.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-16">No activities logged.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs">
                  {/* Timeline circle icon */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-950 dark:bg-zinc-50 shrink-0 mt-1.5" />
                    <div className="w-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800 my-1" />
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold mb-0.5">
                      <span className="uppercase text-zinc-600 dark:text-zinc-450 tracking-wider font-bold">{log.action}</span>
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                    <p className="text-zinc-650 dark:text-zinc-350 leading-relaxed text-[11px] font-medium break-words">
                      {log.details}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
