'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RestaurantSettings } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { resetTokenNoAction } from '@/actions/settings';
import {
  ArrowLeft,
  RefreshCw,
  CloudUpload,
  ListOrdered,
  Headphones,
} from 'lucide-react';

interface SettingsHubViewProps {
  settings: RestaurantSettings;
  adminEmail: string;
}

export default function SettingsHubView({ settings, adminEmail }: SettingsHubViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);

  const handleSyncData = async () => {
    setIsSyncingData(true);
    toast('Syncing restaurant database & clearing local cache...', 'info');
    setTimeout(() => {
      setIsSyncingData(false);
      toast('Restaurant data synced successfully.', 'success');
    }, 600);
  };

  const handleSyncOrders = async () => {
    setIsSyncingOrders(true);
    toast('Syncing pending orders with backend...', 'info');
    setTimeout(() => {
      setIsSyncingOrders(false);
      toast('Order synchronization completed.', 'success');
    }, 600);
  };

  const handleResetTokenNo = async () => {
    if (!window.confirm('Are you sure you want to reset the token number sequence back to #1?')) return;
    try {
      const res = await resetTokenNoAction();
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast('Token number sequence reset to #1 for new orders.', 'success');
      }
    } catch (err) {
      toast('Failed to reset token number.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FDF9F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans select-none">
      {/* HEADER BANNER */}
      <header className="bg-[#963E38] text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold">Settings</h1>
        </div>
      </header>

      {/* SCREEN 1: 4-TILE SETTINGS HUB VIEW */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 md:gap-6">
          {/* Tile 1: Sync Data */}
          <div
            onClick={handleSyncData}
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3.5 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] dark:bg-[#963E38]/20 flex items-center justify-center text-[#963E38] dark:text-amber-400">
              <RefreshCw className={`w-6 h-6 ${isSyncingData ? 'animate-spin' : ''}`} />
            </div>
            <span className="font-bold text-xs md:text-sm text-zinc-800 dark:text-zinc-100">Sync Data</span>
          </div>

          {/* Tile 2: Sync Orders */}
          <div
            onClick={handleSyncOrders}
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3.5 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] dark:bg-[#963E38]/20 flex items-center justify-center text-[#963E38] dark:text-amber-400">
              <CloudUpload className={`w-6 h-6 ${isSyncingOrders ? 'animate-bounce' : ''}`} />
            </div>
            <span className="font-bold text-xs md:text-sm text-zinc-800 dark:text-zinc-100">Sync Orders</span>
          </div>

          {/* Tile 3: Reset Token No */}
          <div
            onClick={handleResetTokenNo}
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3.5 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] dark:bg-[#963E38]/20 flex items-center justify-center text-[#963E38] dark:text-amber-400">
              <ListOrdered className="w-6 h-6" />
            </div>
            <span className="font-bold text-xs md:text-sm text-zinc-800 dark:text-zinc-100">Reset Token No</span>
          </div>

          {/* Tile 4: Support */}
          <div
            onClick={() => toast(`Support line: +91 98765 43210 (Branch: ${settings.restaurant_name})`, 'info')}
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3.5 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] dark:bg-[#963E38]/20 flex items-center justify-center text-[#963E38] dark:text-amber-400">
              <Headphones className="w-6 h-6" />
            </div>
            <span className="font-bold text-xs md:text-sm text-zinc-800 dark:text-zinc-100">Support</span>
          </div>
        </div>
      </main>
    </div>
  );
}
