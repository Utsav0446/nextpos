import React from 'react';
import { getKitchenOrders } from '@/queries/orders';
import { getSettings } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KitchenDisplay from '@/components/kitchen/KitchenDisplay';

export const revalidate = 0; // Kitchen screen relies on dynamic real-time data fetching

export default async function KitchenPage() {
  const admin = await getCurrentUser();
  if (!admin) {
    redirect('/login');
  }

  const initialOrders = await getKitchenOrders();
  const settings = await getSettings();

  return (
    <KitchenDisplay
      initialOrders={initialOrders}
      settings={settings}
    />
  );
}
