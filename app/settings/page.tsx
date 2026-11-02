import React from 'react';
import { getSettings } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';
import SettingsHubView from '@/components/settings/SettingsHubView';

export const revalidate = 0; // Dynamic server rendering to fetch fresh settings parameters

export default async function SettingsPage() {
  const settings = await getSettings();
  const admin = await getCurrentUser();

  return <SettingsHubView settings={settings} adminEmail={admin?.email || ''} />;
}
