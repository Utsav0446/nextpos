import React from 'react';
import { getSettings } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';
import SettingsManager from '@/components/settings/SettingsManager';

export const revalidate = 0; // Dynamic server rendering to fetch fresh settings parameters

export default async function SettingsPage() {
  const settings = await getSettings();
  const admin = await getCurrentUser();

  return <SettingsManager settings={settings} adminEmail={admin?.email || ''} />;
}
