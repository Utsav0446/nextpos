import React from 'react';
import { getReportData } from '@/queries/reports';
import { getSettings } from '@/queries/settings';
import PeriodSelector from '@/components/reports/PeriodSelector';
import CSVExporter from '@/components/reports/CSVExporter';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency, formatDateOnly } from '@/utils/format';
import { DollarSign, Wallet, Percent, ShoppingBag, TrendingUp, HelpCircle } from 'lucide-react';

interface ReportsPageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export const revalidate = 0; // Dynamic server rendering to fetch fresh report intervals

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const period = (params.period as any) || 'week';
  const startDate = params.startDate || undefined;
  const endDate = params.endDate || undefined;

  const reportData = await getReportData(period, startDate, endDate);
  const settings = await getSettings();

  const { summary, dailyBreakdown } = reportData;

  const csvRows = dailyBreakdown.map((row: any) => ({
    Date: row.date,
    'Parcel Sales (Takeaway)': Number(row.parcel_sales || 0),
    'Sitting Sales (Dine-In)': Number(row.sitting_sales || 0),
    Revenue: Number(row.sales),
    Expenses: Number(row.expenses),
    'Net Profit': Number(row.profit),
    'Orders Count': Number(row.orders),
  }));

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Reports &amp; Audits</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Audit restaurant tax flows, revenue statistics, and ingredient cost overheads.</p>
        </div>
        <CSVExporter data={csvRows} fileName={`report_${period}_${new Date().toISOString().split('T')[0]}.csv`} />
      </div>

      {/* Date period selector card */}
      <PeriodSelector />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* KPI 1: Gross Sales */}
        <Card>
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Gross Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
                {formatCurrency(summary.totalSales, settings.currency)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                Total settlements collected in period
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Total Costs */}
        <Card>
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Expenses / Costs</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-red-500 leading-tight">
                {formatCurrency(summary.totalExpenses, settings.currency)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                Logged expenditures &amp; purchases
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Net Profit */}
        <Card>
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Net Profit</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={`text-xl font-extrabold leading-tight ${summary.profit >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-red-500'}`}>
                {formatCurrency(summary.profit, settings.currency)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                Revenue minus overheads margin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: GST Collected */}
        <Card>
          <CardContent className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400 dark:text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">GST Tax Collected</span>
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
                {formatCurrency(summary.gstCollected, settings.currency)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                GST value liability for periods
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats subrow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Settled Orders count</p>
            <p className="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 mt-0.5">{summary.ordersCount} Completed</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Average Ticket Value (AOV)</p>
            <p className="text-sm font-extrabold text-zinc-855 dark:text-zinc-100 mt-0.5">{formatCurrency(summary.avgOrderValue, settings.currency)} per order</p>
          </div>
        </Card>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Period Interval Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Settled Orders</th>
                <th className="px-6 py-4">Parcel Sales</th>
                <th className="px-6 py-4">Sitting Sales</th>
                <th className="px-6 py-4">Gross Revenue</th>
                <th className="px-6 py-4">Costs / Outflows</th>
                <th className="px-6 py-4 text-right">Net Profit / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-400">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    No accounting logs found for this period.
                  </td>
                </tr>
              ) : (
                dailyBreakdown.map((row: any, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-zinc-850 dark:text-zinc-200">
                      {formatDateOnly(row.date)}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-400">
                      {row.orders} orders
                    </td>
                    <td className="px-6 py-4.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(row.parcel_sales || 0, settings.currency)}
                    </td>
                    <td className="px-6 py-4.5 text-blue-600 dark:text-blue-400 font-semibold">
                      {formatCurrency(row.sitting_sales || 0, settings.currency)}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                      {formatCurrency(row.sales, settings.currency)}
                    </td>
                    <td className="px-6 py-4.5 text-red-500 font-semibold">
                      -{formatCurrency(row.expenses, settings.currency)}
                    </td>
                    <td className={`px-6 py-4.5 text-right font-extrabold ${row.profit >= 0 ? 'text-emerald-650' : 'text-red-550'}`}>
                      {formatCurrency(row.profit, settings.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
