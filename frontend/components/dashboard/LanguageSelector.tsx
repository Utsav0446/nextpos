'use client';

import React from 'react';
import { useLanguage, Language } from '@/context/LanguageContext';
import { Globe, Check } from 'lucide-react';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const options: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'gu', label: 'Gujarati', flag: '🇮🇳' },
    { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-850/60 shadow-sm w-full md:w-auto md:min-w-[320px]">
      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
        <Globe className="w-3.5 h-3.5 text-zinc-400" />
        Site Language / ભાષા / भाषा
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {options.map((opt) => {
          const isActive = language === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLanguage(opt.value)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all relative ${
                isActive
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 shadow-sm'
                  : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850/50 text-zinc-650 dark:text-zinc-400'
              }`}
            >
              <span>{opt.label}</span>
              {isActive && (
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
