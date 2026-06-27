import React from 'react';
import { getTables } from '@/queries/tables';
import { getSettings } from '@/queries/settings';
import TableGrid from '@/components/tables/TableGrid';

export const revalidate = 0; // Dynamic server rendering to fetch real-time table status updates

export default async function TablesPage() {
  const tables = await getTables();
  const settings = await getSettings();

  return (
    <TableGrid
      initialTables={tables}
      currencyCode={settings.currency}
    />
  );
}
