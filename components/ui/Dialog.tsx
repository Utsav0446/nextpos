import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose}
      />
      
      {/* Modal dialogue box */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800/80">
          <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Scrollable Container */}
        <div className="px-6 py-5 overflow-y-auto max-h-[75vh]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
