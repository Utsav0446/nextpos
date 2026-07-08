'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/actions/auth';
import { 
  LayoutDashboard,
  UtensilsCrossed, 
  Receipt, 
  ShoppingBag, 
  Wallet, 
  BarChart3, 
  Settings, 
  LogOut,
  Search,
  TableProperties
} from 'lucide-react';
import { useToast } from './ui/Toast';
import { ThemeToggle } from './ThemeToggle';
import { useLanguage } from '@/context/LanguageContext';

interface NavbarProps {
  adminEmail: string;
  logoUrl?: string | null;
}

export function Navbar({ adminEmail, logoUrl }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('sitting'), href: '/tables', icon: TableProperties },
    { name: t('parcel'), href: '/orders?type=Takeaway', icon: ShoppingBag },
    { name: t('billing'), href: '/billing', icon: Receipt },
    { name: t('menu'), href: '/menu', icon: UtensilsCrossed },
    { name: t('expenses'), href: '/expenses', icon: Wallet },
    { name: t('reports'), href: '/reports', icon: BarChart3 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 w-full bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-6 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 border border-zinc-200 dark:border-zinc-800" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-950 font-extrabold text-sm tracking-tighter">
              G
            </div>
          )}
          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 tracking-tight">Gastronomy POS</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Drawer / Sidebar */}
      <aside className={`fixed lg:sticky inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between shrink-0 h-screen transition-transform duration-200 transform lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:flex`}>
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 border border-zinc-200 dark:border-zinc-800" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-950 font-extrabold text-sm tracking-tighter">
                G
              </div>
            )}
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
                  onClick={() => setIsMobileMenuOpen(false)}
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
                setIsMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-400 rounded-xl text-xs text-left transition-all active:scale-[0.98]"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-[11px]">Search...</span>
              <kbd className="ml-auto text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded border dark:border-zinc-700">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">Admin Account</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{adminEmail}</p>
            </div>
            <ThemeToggle />
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
    </>
  );
}
