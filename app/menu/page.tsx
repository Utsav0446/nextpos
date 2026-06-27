import React from 'react';
import { getCategories } from '@/queries/categories';
import { getMenuItems } from '@/queries/menu';
import { getSettings } from '@/queries/settings';
import MenuManager from '@/components/menu/MenuManager';

export const revalidate = 0; // Dynamic server rendering to fetch real-time category edits

export default async function MenuPage() {
  const categories = await getCategories();
  const menuItems = await getMenuItems({ includeUnavailable: true });
  const settings = await getSettings();

  const currencySymbol = settings.currency === 'USD' ? '$' : 
                         settings.currency === 'EUR' ? '€' : 
                         settings.currency === 'GBP' ? '£' : '₹';

  return (
    <MenuManager
      initialCategories={categories}
      initialMenuItems={menuItems}
      currencySymbol={currencySymbol}
    />
  );
}
