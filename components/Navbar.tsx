'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/actions/auth';
import { ThemeToggle } from './ThemeToggle';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Receipt, 
  ShoppingBag, 
  Wallet, 
  Warehouse, 
  BarChart3, 
  Settings, 
  LogOut,
  Search,
  TableProperties
} from 'lucide-react';
import { useToast } from './ui/Toast';

interface NavbarProps {
  adminEmail: string;
}

export function Navbar({ adminEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const res = await logoutAction();
      if (res.success) {
        toast('Logged out successfully.', 'success');
        router.push('/login');
      }
    } catch (err) {
      toast('Failed to log out.', 'error');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tables Layout', href: '/tables', icon: TableProperties },
    { name: 'POS Interface', href: '/orders', icon: ShoppingBag },
    { name: 'Billing', href: '/billing', icon: Receipt },
    { name: 'Menu Items', href: '/menu', icon: UtensilsCrossed },
    { name: 'Expenses Log', href: '/expenses', icon: Wallet },
    { name: 'Inventory Stock', href: '/inventory', icon: Warehouse },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30">
      <div className="flex flex-col flex-1">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-950 font-extrabold text-sm tracking-tighter">
            G
          </div>
          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 tracking-tight">Gastronomy POS</span>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User card */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-3 bg-zinc-50/40 dark:bg-zinc-900/20">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              window.dispatchEvent(new Event('toggle-global-search'));
            }}
            className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-400 rounded-xl text-xs text-left transition-all active:scale-[0.98]"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px]">Search...</span>
            <kbd className="ml-auto text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded border dark:border-zinc-700">⌘K</kbd>
          </button>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">Admin Account</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{adminEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
