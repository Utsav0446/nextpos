import React from 'react';
import { getCategories } from '@/queries/categories';
import { getMenuItems } from '@/queries/menu';
import { getSettings } from '@/queries/settings';
import { getTables } from '@/queries/tables';
import POSContainer from '@/components/orders/POSContainer';

export const revalidate = 0; // Dynamic server rendering to fetch real-time items list and status updates

interface POSPageProps {
  searchParams: Promise<{
    table?: string;
    type?: string;
  }>;
}

export default async function POSPage({ searchParams }: POSPageProps) {
  const params = await searchParams;
  const preselectedTable = params.table || undefined;
  const preselectedType = params.type || undefined;

  const categories = await getCategories();
  // Fetch menu items, including unavailable ones (the container grays them out)
  const menuItems = await getMenuItems({ includeUnavailable: true });
  const settings = await getSettings();
  const tables = await getTables();

  return (
    <POSContainer
      categories={categories}
      menuItems={menuItems}
      tables={tables}
      taxPercentage={settings.enable_gst ? Number(settings.gst_percentage) : 0}
      currencyCode={settings.currency}
      preselectedTable={preselectedTable}
      preselectedType={preselectedType}
    />
  );
}
