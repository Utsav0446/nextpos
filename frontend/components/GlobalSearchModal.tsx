'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ShoppingBag, Utensils, Wallet } from 'lucide-react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

export function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ menu: any[]; orders: any[]; expenses: any[] }>({
    menu: [],
    orders: [],
    expenses: [],
  });

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Bind command/control K shortcut to open search modal
  useKeyboardShortcut({ key: 'k', ctrl: true }, () => setIsOpen((prev) => !prev));
  useKeyboardShortcut({ key: 'Escape' }, () => setIsOpen(false));

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };
    window.addEventListener('toggle-global-search', handleToggle);
    return () => window.removeEventListener('toggle-global-search', handleToggle);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ menu: [], orders: [], expenses: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim() === '') {
      setResults({ menu: [], orders: [], expenses: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Failed to execute API search', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  if (!isOpen) return null;

  const hasResults = 
    (results.menu?.length ?? 0) > 0 || 
    (results.orders?.length ?? 0) > 0 || 
    (results.expenses?.length ?? 0) > 0;

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[15vh]">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
        onClick={() => setIsOpen(false)} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-150 flex flex-col">
        {/* Search Bar Input */}
        <div className="flex items-center px-4.5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <Search className="w-5 h-5 text-zinc-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search food menu, order numbers, expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none text-[13px]"
          />
          {loading && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0 ml-3" />}
        </div>

        {/* Results List */}
        <div className="max-h-[50vh] overflow-y-auto p-4 flex flex-col gap-4">
          {!query && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
              Type to lookup orders, menu items, or expenses. Press <kbd className="bg-zinc-50 dark:bg-zinc-850 px-1 py-0.5 border dark:border-zinc-700 rounded text-[10px]">Esc</kbd> to close.
            </p>
          )}

          {query && !loading && !hasResults && (
            <p className="text-xs text-zinc-400 text-center py-6">
              No results found matching &ldquo;{query}&rdquo;
            </p>
          )}

          {results.menu && results.menu.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Menu Items</h4>
              <div className="flex flex-col gap-1">
                {results.menu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo('/menu')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left w-full transition-colors text-xs text-zinc-650 dark:text-zinc-300 active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-2">
                      <Utensils className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-medium text-zinc-850 dark:text-zinc-200">{item.name}</span>
                      <span className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                        {item.category_name}
                      </span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{parseFloat(item.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.orders && results.orders.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Orders</h4>
              <div className="flex flex-col gap-1">
                {results.orders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => navigateTo('/orders')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left w-full transition-colors text-xs text-zinc-650 dark:text-zinc-300 active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">#{ord.id}</span>
                      <span>{ord.customer_name || 'Walk-in'}</span>
                      {ord.table_number && (
                        <span className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                          Table {ord.table_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        ord.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                        ord.status === 'Cancelled' ? 'bg-red-50 dark:bg-red-950/20 text-red-500' :
                        'bg-amber-50 dark:bg-amber-950/20 text-amber-500'
                      }`}>
                        {ord.status}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{parseFloat(ord.grand_total).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.expenses && results.expenses.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Expenses</h4>
              <div className="flex flex-col gap-1">
                {results.expenses.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => navigateTo('/expenses')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left w-full transition-colors text-xs text-zinc-650 dark:text-zinc-300 active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-semibold text-zinc-850 dark:text-zinc-200">{exp.category}</span>
                      <span className="truncate max-w-[280px]">{exp.reason}</span>
                    </div>
                    <span className="font-semibold text-red-650 dark:text-red-400 shrink-0">
                      -₹{parseFloat(exp.amount).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
