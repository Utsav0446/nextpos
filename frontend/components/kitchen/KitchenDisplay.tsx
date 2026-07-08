'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Volume2, 
  VolumeX, 
  Clock, 
  Play, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  Utensils, 
  ArrowLeft,
  RefreshCw,
  ChefHat,
  Sparkles
} from 'lucide-react';
import { updateOrderStatusAction, getKitchenOrdersAction } from '@/actions/orders';
import { Order, OrderStatus } from '@/types';
import { useToast } from '../ui/Toast';

interface KitchenDisplayProps {
  initialOrders: Order[];
  settings: any;
}

export default function KitchenDisplay({ initialOrders, settings }: KitchenDisplayProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [completedHistory, setCompletedHistory] = useState<Order[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  
  // Track crossed-off items per order: Record<orderId, Record<itemId, boolean>>
  const [crossedItems, setCrossedItems] = useState<Record<number, Record<number, boolean>>>({});
  
  // Track action buttons loading state per order
  const [loadingOrders, setLoadingOrders] = useState<Record<number, boolean>>({});

  // We store a ref of the previous orders to check for new incoming orders
  const prevOrdersRef = useRef<Order[]>(initialOrders);
  const { toast } = useToast();
  const router = useRouter();

  // Play synthetic chime sound using Web Audio API
  const playChimeSound = () => {
    if (!isSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Double-tone chime: High followed by slightly higher
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        // Exponential decay envelope
        gainNode.gain.setValueAtTime(0.15, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playTone(587.33, now, 0.4); // D5
      playTone(880, now + 0.15, 0.6); // A5
    } catch (err) {
      console.error('Audio chime failed:', err);
    }
  };

  // Clock Timer
  useEffect(() => {
    setIsMounted(true);
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Fetch kitchen orders action wrapper
  const fetchOrders = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await getKitchenOrdersAction();
      if (res.success && res.orders) {
        const newOrders = res.orders;

        // Check if there are any new orders in the list that weren't there before
        const prevIds = new Set(prevOrdersRef.current.map(o => o.id));
        const hasNewOrder = newOrders.some(o => !prevIds.has(o.id));

        if (hasNewOrder) {
          playChimeSound();
          toast(`New order(s) received!`, 'success');
        }

        setOrders(newOrders);
        prevOrdersRef.current = newOrders;
      } else if (res.error) {
        console.error('Failed to poll kitchen orders:', res.error);
      }
    } catch (err) {
      console.error('Failed to poll kitchen orders:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Auto-polling interval: every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isSoundEnabled]);

  // Update order status logic
  const handleUpdateStatus = async (orderId: number, currentStatus: OrderStatus, nextStatus: OrderStatus) => {
    if (loadingOrders[orderId]) return;
    setLoadingOrders(prev => ({ ...prev, [orderId]: true }));
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      const res = await updateOrderStatusAction(orderId, nextStatus);
      if (res.success) {
        toast(`Order #${orderId} marked as ${nextStatus}`, 'success');
        
        // If transitioning to Completed, save in history for potential undo
        if (nextStatus === 'Completed' && targetOrder) {
          setCompletedHistory(prev => {
            if (prev.some(o => o.id === targetOrder.id)) return prev;
            return [targetOrder, ...prev.slice(0, 4)];
          });
        }

        // Fetch refreshed orders list
        await fetchOrders(true);
      } else {
        toast(res.error || 'Failed to update order status.', 'error');
      }
    } catch (err) {
      toast('Failed to update status.', 'error');
    } finally {
      setLoadingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Recall / Undo a completed order
  const handleRecallOrder = async (order: Order) => {
    if (loadingOrders[order.id]) return;
    setLoadingOrders(prev => ({ ...prev, [order.id]: true }));
    try {
      const res = await updateOrderStatusAction(order.id, 'Preparing');
      if (res.success) {
        toast(`Order #${order.id} recalled back to kitchen.`, 'success');
        // Remove from local history
        setCompletedHistory(prev => prev.filter(o => o.id !== order.id));
        // Refresh active list
        await fetchOrders(true);
      } else {
        toast(res.error || 'Failed to recall order.', 'error');
      }
    } catch (err) {
      toast('Failed to recall order.', 'error');
    } finally {
      setLoadingOrders(prev => ({ ...prev, [order.id]: false }));
    }
  };

  // Toggle item strike-off
  const toggleItemCross = (orderId: number, itemId: number) => {
    setCrossedItems(prev => {
      const orderCrosses = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...orderCrosses,
          [itemId]: !orderCrosses[itemId]
        }
      };
    });
  };

  // Helper: calculate live duration in minutes
  const getElapsedString = (createdAt: Date) => {
    const elapsedMs = currentTime.getTime() - new Date(createdAt).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
    return `${elapsedMins}m ${elapsedSecs.toString().padStart(2, '0')}s`;
  };

  const getTimerStyles = (createdAt: Date) => {
    const elapsedMs = currentTime.getTime() - new Date(createdAt).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);

    if (elapsedMins >= 12) {
      return {
        cardBorder: 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/20 dark:bg-rose-950/30',
        text: 'text-rose-500 animate-pulse font-extrabold',
        badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      };
    }
    if (elapsedMins >= 6) {
      return {
        cardBorder: 'border-amber-500/60 bg-amber-950/10 dark:bg-amber-950/20',
        text: 'text-amber-500 font-bold',
        badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      };
    }
    return {
      cardBorder: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
      text: 'text-zinc-500 dark:text-zinc-400 font-medium',
      badge: 'bg-zinc-150 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-700',
    };
  };

  // Split active orders into Pending vs Preparing
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none selection:bg-zinc-800">
      
      {/* 1. TOP HEADER BAR (KDS CONTROLS & META) */}
      <header className="shrink-0 bg-zinc-900 border-b border-zinc-800/80 px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
            title="Back to POS Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-600/90 text-white flex items-center justify-center shadow-lg shadow-orange-950/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5 uppercase">
                Kitchen Screen <span className="text-[10px] bg-orange-600/20 text-orange-400 border border-orange-600/30 rounded px-1 py-0.5 ml-1 normal-case tracking-normal">KDS LIVE</span>
              </h1>
              <p className="text-[10px] text-zinc-450">Gastronomy POS Systems</p>
            </div>
          </div>
        </div>

        {/* Real-time Digital Clock */}
        <div className="hidden md:flex items-center gap-2.5 bg-zinc-950 border border-zinc-800/75 px-4 py-2 rounded-2xl">
          <Clock className="w-4 h-4 text-orange-500 animate-none" />
          <span className="font-bold text-xs font-mono tracking-widest text-zinc-300">
            {isMounted ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--:-- --'}
          </span>
        </div>

        {/* System Stats & Toggle Controllers */}
        <div className="flex items-center gap-3">
          
          {/* Action Metrics counts */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-semibold mr-2 border-r border-zinc-800 pr-5">
            <span className="flex items-center gap-1.5 text-zinc-450">
              Active: <b className="text-zinc-200 font-extrabold">{orders.length}</b>
            </span>
            <span className="flex items-center gap-1.5 text-amber-450">
              Preparing: <b className="text-amber-400 font-extrabold">{preparingOrders.length}</b>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-450">
              Queue: <b className="text-zinc-300 font-extrabold">{pendingOrders.length}</b>
            </span>
          </div>

          {/* Sound Notification Toggler */}
          <button 
            onClick={() => {
              setIsSoundEnabled(!isSoundEnabled);
              toast(isSoundEnabled ? 'Chime sound disabled' : 'Chime sound enabled', 'success');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              isSoundEnabled 
                ? 'bg-zinc-800 hover:bg-zinc-750 text-emerald-400 border-zinc-700/60' 
                : 'bg-zinc-900 text-zinc-500 border-zinc-800/80'
            }`}
          >
            {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSoundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          {/* Refresh Button */}
          <button 
            onClick={() => fetchOrders(false)}
            disabled={isRefreshing}
            className="p-2 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-zinc-300 hover:text-white rounded-xl transition-all border border-zinc-700/60 flex items-center justify-center"
            title="Refresh KOT List"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. ORDER CARDS GRID (MAIN BODY) */}
      <main className="flex-1 p-6 overflow-y-auto bg-zinc-950/80 flex flex-col gap-6">
        
        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800/85 flex items-center justify-center text-zinc-650 mb-4 animate-bounce duration-1000">
              <Utensils className="w-9 h-9" />
            </div>
            <h2 className="font-extrabold text-lg text-zinc-300">Kitchen is Clean!</h2>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">No active Kitchen Order Tickets (KOT) pending. New orders placed at the front desk or tables will appear here automatically.</p>
            <button 
              onClick={() => {
                playChimeSound();
                toast('Triggered simulated system chime!', 'success');
              }}
              className="mt-6 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Test Bell Sound
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 items-start">
            {orders.map((order) => {
              const timer = getTimerStyles(order.created_at);
              const orderId = order.id;
              const hasNotes = order.notes && order.notes.trim() !== '';

              return (
                <div 
                  key={order.id} 
                  className={`flex flex-col rounded-2xl border transition-all shadow-xl overflow-hidden hover:shadow-2xl hover:scale-[1.01] ${timer.cardBorder}`}
                >
                  
                  {/* Card Header Info */}
                  <div className="p-4 border-b border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/60 flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      {/* Order Type Badge */}
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wide ${
                        order.order_type === 'Dine-In'
                          ? 'bg-blue-600/10 text-blue-400 border-blue-600/30'
                          : 'bg-purple-600/10 text-purple-400 border-purple-600/30'
                      }`}>
                        {order.order_type}
                      </span>

                      {/* Live Counter Timer */}
                      <div className="flex items-center gap-1">
                        <Clock className={`w-3.5 h-3.5 ${timer.text.includes('rose') ? 'text-rose-500' : 'text-zinc-500'}`} />
                        <span className={`text-xs font-mono font-bold tracking-tight ${timer.text}`}>
                          {isMounted ? getElapsedString(order.created_at) : '--m --s'}
                        </span>
                      </div>
                    </div>

                    {/* Table Name or Token ID */}
                    <div className="flex items-baseline justify-between mt-1">
                      <h3 className="font-black text-xl tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                        {order.order_type === 'Dine-In' && order.table_number ? (
                          <span>Table {order.table_number}</span>
                        ) : (
                          <span>Token #{order.token_no || order.id}</span>
                        )}
                      </h3>
                      
                      <span className="text-[10px] text-zinc-500 font-bold">
                        ID: #{order.id}
                      </span>
                    </div>

                    {/* Customer Info */}
                    {order.customer_name && order.customer_name !== 'Walk-in' && (
                      <p className="text-[11px] text-zinc-650 dark:text-zinc-400 mt-0.5 font-medium truncate">
                        Customer: <span className="text-zinc-800 dark:text-zinc-250 font-bold">{order.customer_name}</span>
                      </p>
                    )}
                  </div>

                  {/* 3. Notes Alert Banner */}
                  {hasNotes && (
                    <div className="px-4 py-2.5 bg-rose-500/10 dark:bg-rose-950/20 border-b border-rose-500/20 dark:border-rose-950/40 text-rose-650 dark:text-rose-400 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold leading-tight select-text">
                        {order.notes}
                      </p>
                    </div>
                  )}

                  {/* 4. Items List container */}
                  <div className="flex-1 p-4 flex flex-col gap-2 min-h-[140px] bg-zinc-50/10 dark:bg-zinc-950/40">
                    <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest mb-1">
                      KOT Items checklist
                    </span>
                    
                    <div className="flex flex-col gap-2.5">
                      {order.items?.map((item) => {
                        const isCrossed = crossedItems[orderId]?.[item.id] || false;
                        
                        // Parse name for options
                        const openParenIdx = item.name.indexOf('(');
                        let namePart = item.name;
                        let customPart = '';
                        if (openParenIdx !== -1) {
                          namePart = item.name.substring(0, openParenIdx).trim();
                          customPart = item.name.substring(openParenIdx).trim();
                          if (customPart.startsWith('(') && customPart.endsWith(')')) {
                            customPart = customPart.substring(1, customPart.length - 1).trim();
                          }
                        }

                        return (
                          <div 
                            key={item.id} 
                            onClick={() => toggleItemCross(orderId, item.id)}
                            className={`flex items-start gap-2.5 cursor-pointer py-1.5 px-2 rounded-xl transition-all active:scale-[0.98] ${
                              isCrossed 
                                ? 'bg-zinc-100 dark:bg-zinc-900/60 opacity-40 border border-zinc-200 dark:border-zinc-800/50' 
                                : 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                            }`}
                          >
                            {/* Checkbox indicator */}
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isCrossed 
                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                : 'border-zinc-350 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950'
                            }`}>
                              {isCrossed && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            {/* Qty & Item details */}
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className={`text-sm font-black font-mono shrink-0 ${
                                  isCrossed 
                                    ? 'text-zinc-400 line-through' 
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  {item.quantity}x
                                </span>
                                <span className={`text-xs font-bold text-zinc-900 dark:text-zinc-100 select-text leading-tight ${
                                  isCrossed ? 'line-through text-zinc-500' : ''
                                }`}>
                                  {namePart}
                                </span>
                              </div>
                              {customPart && (
                                <span className={`text-[10px] font-bold text-orange-655 dark:text-amber-500 pl-7 leading-tight select-text ${
                                  isCrossed ? 'line-through opacity-70' : ''
                                }`}>
                                  {customPart}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Bottom Action Controls */}
                  <div className="p-3 bg-zinc-50/30 dark:bg-zinc-900/40 border-t border-zinc-150 dark:border-zinc-800/60">
                    {order.status === 'Pending' ? (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Pending', 'Preparing')}
                        disabled={loadingOrders[order.id]}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-orange-600 hover:bg-orange-550 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all active:scale-[0.97]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> {loadingOrders[order.id] ? 'Updating...' : 'Start Cooking'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Preparing', 'Completed')}
                        disabled={loadingOrders[order.id]}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-550 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all active:scale-[0.97]"
                      >
                        <Check className="w-4 h-4 stroke-[3]" /> {loadingOrders[order.id] ? 'Updating...' : 'Done / Ready'}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. BOTTOM COLLAPSED HISTORY RECALL BAR */}
      {completedHistory.length > 0 && (
        <footer className="shrink-0 bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-zinc-200">Recently Prepared</h4>
                <p className="text-[9px] text-zinc-500">Recalls orders back to KDS view if closed by accident</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {completedHistory.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleRecallOrder(order)}
                  disabled={loadingOrders[order.id]}
                  className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-850 hover:border-zinc-700 disabled:opacity-50 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all active:scale-[0.97]"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {order.order_type === 'Dine-In' && order.table_number ? `T ${order.table_number}` : `Token #${order.token_no || order.id}`}
                  <span className="text-[9px] text-zinc-550">{loadingOrders[order.id] ? 'Recalling...' : 'Undo'}</span>
                </button>
              ))}
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
