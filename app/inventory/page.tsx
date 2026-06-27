import React from 'react';
import { getInventoryItems, getSuppliers, getPurchaseRecords } from '@/queries/inventory';
import { getSettings } from '@/queries/settings';
import InventoryManager from '@/components/inventory/InventoryManager';

export const revalidate = 0; // Dynamic server rendering to fetch real-time stocks and purchases logs

export default async function InventoryPage() {
  const items = await getInventoryItems();
  const suppliers = await getSuppliers();
  const purchases = await getPurchaseRecords();
  const settings = await getSettings();

  const currencySymbol = settings.currency === 'USD' ? '$' : 
                         settings.currency === 'EUR' ? '€' : 
                         settings.currency === 'GBP' ? '£' : '₹';

  return (
    <InventoryManager
      initialItems={items}
      initialSuppliers={suppliers}
      initialPurchases={purchases}
      currencySymbol={currencySymbol}
    />
  );
}
