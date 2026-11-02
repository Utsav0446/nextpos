import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import ProfileSettingsView from '@/components/settings/ProfileSettingsView';

export default async function ProfileSettingsPage() {
  const admin = await getCurrentUser();

  return (
    <ProfileSettingsView
      initialEmail={admin?.email || 'admin@pos.com'}
      initialFirstName="Only Dhosa"
      initialLastName=""
      initialMobile=""
    />
  );
}
