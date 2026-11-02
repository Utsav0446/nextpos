import React from 'react';
import { getDashboardStats } from '@/queries/dashboard';
import { getSettings } from '@/queries/settings';
import { getRecentOrdersWithItems } from '@/queries/orders';
import HomeDashboard from '@/components/dashboard/HomeDashboard';

export const revalidate = 0; // Keep dashboard real-time

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const settings = await getSettings();
  const recentOrders = await getRecentOrdersWithItems(7);

  return (
    <HomeDashboard
      settings={settings}
      stats={stats}
      recentOrdersCount={recentOrders.length}
    />
  );
}
