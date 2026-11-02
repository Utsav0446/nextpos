'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RestaurantSettings, DashboardStats } from '@/types';
import { formatCurrency } from '@/utils/format';
import { useToast } from '@/components/ui/Toast';
import {
  Package,
  Armchair,
  BarChart3,
  TableProperties,
  BookOpen,
  Settings,
  RefreshCw,
  Menu,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface HomeDashboardProps {
  settings: RestaurantSettings;
  stats: DashboardStats;
  recentOrdersCount: number;
}

export default function HomeDashboard({ settings, stats, recentOrdersCount }: HomeDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    toast('Syncing system data...', 'info');
    setTimeout(() => {
      setIsSyncing(false);
      toast('System data synced successfully.', 'success');
      window.location.reload();
    }, 800);
  };

  const navTiles = [
    {
      id: 'parcel',
      title: 'Parcel',
      subtitle: 'Takeaway & Express Orders',
      icon: Package,
      href: '/orders?type=Takeaway',
      badge: `${stats.pendingOrdersCount} Active`,
      bgColor: 'bg-[#963E38] hover:bg-[#85342E]',
    },
    {
      id: 'sittings',
      title: 'Sittings',
      subtitle: 'Dine-In Table Management',
      icon: Armchair,
      href: '/tables',
      badge: 'Live Tables',
      bgColor: 'bg-[#963E38] hover:bg-[#85342E]',
    },
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'Sales & Revenue Analytics',
      icon: BarChart3,
      href: '/reports',
      badge: 'Analytics',
      bgColor: 'bg-[#963E38] hover:bg-[#85342E]',
    },
    {
      id: 'tables',
      title: 'All Tables',
      subtitle: 'Table Occupancy Grid',
      icon: TableProperties,
      href: '/tables',
      badge: 'Grid View',
      bgColor: 'bg-[#963E38] hover:bg-[#85342E]',
    },
    {
      id: 'menus',
      title: 'Menus',
      subtitle: 'Category & Item Manager',
      icon: BookOpen,
      href: '/menu',
      badge: 'Menu Book',
      bgColor: 'bg-[#963E38] hover:bg-[#85342E]',
    },
    {
      id: 'kitchen',
      title: 'Kitchen (KOT)',
      subtitle: 'Live Kitchen Display',
      icon: UtensilsCrossed,
      href: '/kitchen',
      badge: 'Live Display',
      bgColor: 'bg-[#963E38] hover:bg-[#85342E]',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FDF9F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-200">
      {/* TOP HEADER BAR */}
      <header className="bg-[#963E38] text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xl font-black tracking-tight flex items-center gap-2 hover:opacity-90">
            <span className="bg-white/10 px-2.5 py-1 rounded-xl border border-white/20">POS-e-token</span>
          </Link>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Live Sync Status Dot */}
          <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 absolute" />
            <span className="ml-2 text-[11px] font-medium hidden sm:inline">Online</span>
          </div>

          {/* Quick Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95"
            title="Sync Data"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings Button */}
          <Link
            href="/settings"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95"
            title="System Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white md:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MOBILE NAV DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#85342E] text-white px-6 py-4 flex flex-col gap-3 shadow-lg border-b border-white/10 animate-in slide-in-from-top-2 duration-150">
          <Link href="/orders?type=Takeaway" className="py-2 font-bold text-sm flex items-center justify-between">
            <span>📦 Parcel Orders</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/tables" className="py-2 font-bold text-sm flex items-center justify-between">
            <span>🪑 Table Sittings</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/reports" className="py-2 font-bold text-sm flex items-center justify-between">
            <span>📊 Sales Reports</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/menu" className="py-2 font-bold text-sm flex items-center justify-between">
            <span>📖 Menu Manager</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/settings" className="py-2 font-bold text-sm flex items-center justify-between">
            <span>⚙️ Settings Hub</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
        {/* WELCOME BANNER */}
        <div className="flex flex-col gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#963E38] dark:text-amber-400 tracking-tight">
            Welcome, {settings.restaurant_name} <span className="text-zinc-600 dark:text-zinc-400 text-lg md:text-xl font-normal">(Main Branch)</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 font-semibold flex items-center gap-1.5 mt-0.5">
            <span>🏢</span> {settings.restaurant_name} POS Terminal
          </p>
        </div>

        {/* 6 LARGE TERRACOTTA ACTION TILES (3 COLUMNS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 md:gap-8">
          {navTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.id}
                href={tile.href}
                className={`${tile.bgColor} text-white rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center text-center gap-4 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group min-h-[170px] md:min-h-[210px] relative overflow-hidden`}
              >
                {/* Background decorative shine */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl group-hover:bg-white/10 transition-all" />

                {/* Big White Icon Container */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-200 shadow-inner">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 stroke-[2.2]" />
                </div>

                {/* Label */}
                <div className="flex flex-col items-center">
                  <h3 className="text-base md:text-lg font-bold tracking-wide uppercase">
                    {tile.title}
                  </h3>
                  <span className="text-[10px] md:text-xs text-white/80 font-medium mt-0.5 hidden sm:block">
                    {tile.subtitle}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* REAL-TIME STATS STRIP BELOW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {/* Revenue */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today&apos;s Revenue</span>
              <span className="text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">
                {formatCurrency(stats.todaySales, settings.currency)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Active Parcel & Orders */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active Pending Orders</span>
              <span className="text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">
                {stats.pendingOrdersCount} Orders
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* Total Placed Today */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Orders Today</span>
              <span className="text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">
                {stats.todayOrdersCount} Orders
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
