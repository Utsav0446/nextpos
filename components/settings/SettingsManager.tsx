'use client';

import React, { useState, useTransition } from 'react';
import { RestaurantSettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { saveSettingsAction } from '@/actions/settings';
import { changePasswordAction } from '@/actions/auth';
import { backupDatabaseAction, restoreDatabaseAction } from '@/actions/backup';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, SettingsInput } from '@/schemas/settings';
import { ShieldAlert, Database, Store, Lock, Download, UploadCloud } from 'lucide-react';

interface SettingsManagerProps {
  settings: RestaurantSettings;
}

export default function SettingsManager({ settings }: SettingsManagerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'restaurant' | 'security' | 'database'>('restaurant');

  // 1. Restaurant Settings Form
  const {
    register: registerSettings,
    handleSubmit: handleSubmitSettings,
    formState: { errors: settingsErrors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      restaurant_name: settings.restaurant_name,
      address: settings.address || '',
      phone: settings.phone || '',
      currency: settings.currency,
      gst_percentage: Number(settings.gst_percentage),
      gstin: settings.gstin || '',
    },
  });

  // 2. Change Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 3. Database Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Submit handlers
  const onSettingsSubmit = async (data: SettingsInput) => {
    const res = await saveSettingsAction(data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Restaurant parameters saved successfully.', 'success');
      window.location.reload();
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast('Please fill out all password fields.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('New password must be at least 6 characters long.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePasswordAction(currentPassword, newPassword);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast('Password updated successfully.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast('Failed to change password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await backupDatabaseAction();
      if (res.error) {
        toast(res.error, 'error');
        return;
      }

      if (res.backup && res.filename) {
        const blob = new Blob([res.backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('Database backup JSON exported.', 'success');
      }
    } catch (err) {
      toast('Failed to export backup.', 'error');
    }
  };

  const handleImportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast('Please select a valid backup JSON file.', 'error');
      return;
    }

    if (!window.confirm('WARNING: Importing this backup will overwrite ALL current database rows (orders, items, expenses, suppliers, inventory)! Do you want to proceed?')) {
      return;
    }

    setRestoreLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const res = await restoreDatabaseAction(text);
        if (res.error) {
          toast(res.error, 'error');
        } else {
          toast('Database restored from backup successfully.', 'success');
          setSelectedFile(null);
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        }
        setRestoreLoading(false);
      };
      reader.readAsText(selectedFile);
    } catch (err) {
      toast('Failed to parse and restore database backup.', 'error');
      setRestoreLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">System Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Manage billing rules, admin credentials, and offline data backups.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-850 pb-2">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            activeTab === 'restaurant'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <Store className="w-3.5 h-3.5" /> Restaurant Info
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> Password &amp; Auth
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            activeTab === 'database'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Backup &amp; Restore
        </button>
      </div>

      {/* 1. RESTAURANT SETTINGS */}
      {activeTab === 'restaurant' && (
        <form onSubmit={handleSubmitSettings(onSettingsSubmit)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 max-w-xl shadow-xs">
          <Input
            label="Restaurant Name"
            type="text"
            placeholder="e.g. Gastronomy Dosa Centre"
            error={settingsErrors.restaurant_name?.message}
            {...registerSettings('restaurant_name')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              type="tel"
              placeholder="+91 99999 77777"
              error={settingsErrors.phone?.message}
              {...registerSettings('phone')}
            />
            <Select
              label="Billing Currency"
              options={[
                { value: 'INR', label: 'Indian Rupee (₹)' },
                { value: 'USD', label: 'US Dollar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'GBP', label: 'British Pound (£)' },
              ]}
              error={settingsErrors.currency?.message}
              {...registerSettings('currency')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GST Percentage (%)"
              type="number"
              placeholder="5"
              error={settingsErrors.gst_percentage?.message}
              {...registerSettings('gst_percentage', { valueAsNumber: true })}
            />
            <Input
              label="GSTIN (Tax ID)"
              type="text"
              placeholder="27AAAAA1111A1Z1"
              error={settingsErrors.gstin?.message}
              {...registerSettings('gstin')}
            />
          </div>

          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Restaurant Address</label>
            <textarea
              placeholder="Physical street address printed on KOT receipts..."
              {...registerSettings('address')}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all h-20 resize-none"
            />
          </div>

          <Button type="submit" className="w-full mt-2 py-3 text-xs font-bold" isLoading={isPending}>
            Save Restaurant Configuration
          </Button>
        </form>
      )}

      {/* 2. PASSWORD SECURITY */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordChange} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 max-w-xl shadow-xs">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

          <Input
            label="New Password"
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button type="submit" className="w-full mt-2 py-3 text-xs font-bold" isLoading={passwordLoading}>
            Update Admin Password
          </Button>
        </form>
      )}

      {/* 3. DATABASE BACKUP & RESTORE */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Export card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Export Database</h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Export all categories, menu items, order history, purchase history, suppliers, and setting parameters into a single local JSON file. Keep it safe in case of database loss.
            </p>
            <Button onClick={handleExportBackup} className="w-full py-3 text-xs font-bold mt-auto">
              Download JSON Backup
            </Button>
          </div>

          {/* Import card */}
          <form onSubmit={handleImportBackup} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Restore Database</h3>
            </div>
            <p className="text-[11px] text-zinc-450 leading-relaxed flex gap-1 items-start bg-red-50 dark:bg-red-950/20 text-red-600 p-3 rounded-xl border border-red-200 dark:border-red-900/60 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              This action will delete and overwrite all database table contents currently configured! Double check before importing.
            </p>
            
            <div className="flex flex-col gap-1 mt-2">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-900 dark:file:bg-zinc-800 dark:file:text-zinc-100 hover:file:bg-zinc-200 cursor-pointer"
              />
            </div>

            <Button type="submit" className="w-full py-3 text-xs font-bold mt-auto" isLoading={restoreLoading} disabled={!selectedFile}>
              Upload &amp; Overwrite DB
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
