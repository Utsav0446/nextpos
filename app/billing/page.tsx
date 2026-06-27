import React from 'react';
import { getOrders } from '@/queries/orders';
import { getSettings } from '@/queries/settings';
import BillingContainer from '@/components/billing/BillingContainer';

export const revalidate = 0; // Dynamic server rendering to fetch real-time orders list

interface BillingPageProps {
  searchParams: Promise<{
    orderId?: string;
    table?: string;
  }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;
  const preselectedOrderId = params.orderId ? parseInt(params.orderId) : undefined;
  const preselectedTable = params.table || undefined;

  const pendingOrders = await getOrders({ status: 'Pending' });
  const settings = await getSettings();

  return (
    <BillingContainer
      initialPendingOrders={pendingOrders}
      settings={settings}
      preselectedOrderId={preselectedOrderId}
      preselectedTable={preselectedTable}
    />
  );
}
