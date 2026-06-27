import React from 'react';
import { getSettings } from '@/queries/settings';
import SettingsManager from '@/components/settings/SettingsManager';

export const revalidate = 0; // Dynamic server rendering to fetch fresh settings parameters

export default async function SettingsPage() {
  const settings = await getSettings();

  return <SettingsManager settings={settings} />;
}
