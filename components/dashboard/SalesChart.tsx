'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartProps {
  data: { date: string; sales: number }[];
  currencySymbol: string;
}

export default function SalesChart({ data, currencySymbol }: ChartProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
    
    // Watch for theme toggling
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return <div className="h-80 w-full bg-zinc-100/50 dark:bg-zinc-900/50 animate-pulse rounded-2xl" />;
  }

  const strokeColor = isDark ? '#f4f4f5' : '#18181b';
  const gridColor = isDark ? '#27272a' : '#f4f4f5';
  const fillColor = isDark ? '#ffffff' : '#000000';

  return (
    <div className="h-80 w-full pr-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={isDark ? 0.12 : 0.05} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="date" 
            stroke={isDark ? '#71717a' : '#a1a1aa'} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dy={8}
          />
          <YAxis 
            stroke={isDark ? '#71717a' : '#a1a1aa'} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dx={-8}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDark ? '#18181b' : '#ffffff', 
              borderRadius: '12px', 
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              fontSize: '11px',
              color: isDark ? '#f4f4f5' : '#18181b'
            }}
            itemStyle={{ color: isDark ? '#f4f4f5' : '#18181b' }}
            labelClassName="font-bold mb-0.5 text-zinc-500"
            formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(2)}`, 'Sales']}
          />
          <Area 
            type="monotone" 
            dataKey="sales" 
            stroke={strokeColor} 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorSales)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
