import React from 'react';
import { getCategories } from '@/queries/categories';
import { getMenuItems } from '@/queries/menu';
import { getSettings } from '@/queries/settings';
import POSContainer from '@/components/orders/POSContainer';

export const revalidate = 0; // Dynamic server rendering to fetch real-time items list and status updates

interface POSPageProps {
  searchParams: Promise<{
    table?: string;
  }>;
}

export default async function POSPage({ searchParams }: POSPageProps) {
  const params = await searchParams;
  const preselectedTable = params.table || undefined;

  const categories = await getCategories();
  // Fetch menu items, including unavailable ones (the container grays them out)
  const menuItems = await getMenuItems({ includeUnavailable: true });
  const settings = await getSettings();

  return (
    <POSContainer
      categories={categories}
      menuItems={menuItems}
      taxPercentage={Number(settings.gst_percentage)}
      currencyCode={settings.currency}
      preselectedTable={preselectedTable}
    />
  );
}
