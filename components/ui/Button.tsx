import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-950 dark:focus:ring-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 shadow-sm',
    secondary: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100',
    outline: 'border border-zinc-200 hover:bg-zinc-55 text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm dark:bg-red-700 dark:hover:bg-red-800',
    ghost: 'hover:bg-zinc-100 text-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4.5 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
