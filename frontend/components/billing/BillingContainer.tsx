'use client';

import React, { useState, useMemo } from 'react';
import { Order, RestaurantSettings, PaymentType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { completeOrderAction, deleteOrderAction } from '@/actions/orders';
import { formatCurrency, formatDate } from '@/utils/format';
import { Receipt, CreditCard, Landmark, DollarSign, CheckCircle2, Search, XCircle } from 'lucide-react';

interface BillingContainerProps {
  initialPendingOrders: Order[];
  settings: RestaurantSettings;
  preselectedOrderId?: number;
  preselectedTable?: string;
}

export default function BillingContainer({ 
  initialPendingOrders, 
  settings,
  preselectedOrderId,
  preselectedTable
}: BillingContainerProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialPendingOrders);
  
  // Group orders by table for Dine-In
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, any>();
    orders.forEach(o => {
      if (o.order_type === 'Dine-In' && o.table_number) {
        const key = `TABLE_${o.table_number}`;
        if (!groups.has(key)) {
          groups.set(key, { 
            id: key, 
            table_number: o.table_number,
            customer_name: o.customer_name,
            order_type: o.order_type,
            subtotal: Number(o.subtotal),
            tax: Number(o.tax),
            discount: Number(o.discount),
            grand_total: Number(o.grand_total),
            created_at: o.created_at,
            items: [...(o.items || [])],
            relatedOrders: [o],
            isGroup: true 
          });
        } else {
          const g = groups.get(key);
          g.relatedOrders.push(o);
          g.subtotal += Number(o.subtotal);
          g.tax += Number(o.tax);
          g.discount += Number(o.discount);
          g.grand_total += Number(o.grand_total);
          g.items.push(...(o.items || []));
          if (!g.customer_name && o.customer_name) g.customer_name = o.customer_name;
        }
      } else {
        groups.set(`ORDER_${o.id}`, { 
          id: `ORDER_${o.id}`,
          table_number: o.table_number,
          customer_name: o.customer_name,
          order_type: o.order_type,
          subtotal: Number(o.subtotal),
          tax: Number(o.tax),
          discount: Number(o.discount),
          grand_total: Number(o.grand_total),
          created_at: o.created_at,
          items: [...(o.items || [])],
          relatedOrders: [o],
          isGroup: false 
        });
      }
    });
    return Array.from(groups.values());
  }, [orders]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    if (preselectedTable) {
      return `TABLE_${preselectedTable}`;
    }
    if (preselectedOrderId) {
      // Find if it belongs to a table
      const match = initialPendingOrders.find(o => o.id === preselectedOrderId);
      if (match && match.order_type === 'Dine-In' && match.table_number) {
        return `TABLE_${match.table_number}`;
      }
      return `ORDER_${preselectedOrderId}`;
    }
    return groupedOrders.length > 0 ? groupedOrders[0].id : null;
  });
  
  // Search orders
  const [searchQuery, setSearchQuery] = useState(preselectedTable || '');

  // Payment State
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [extraDiscount, setExtraDiscount] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGroup = useMemo(() => {
    return groupedOrders.find((g) => g.id === selectedGroupId) || null;
  }, [groupedOrders, selectedGroupId]);

  // Calculations for modifications
  const billingSummary = useMemo(() => {
    if (!selectedGroup) return { subtotal: 0, tax: 0, discount: 0, grandTotal: 0, remaining: 0 };
    
    const subtotal = Number(selectedGroup.subtotal);
    const tax = Number(selectedGroup.tax);
    const currentDiscount = Number(selectedGroup.discount);
    
    // New total if discount is adjusted at checkout
    const newDiscount = Math.min(subtotal + tax, Number(extraDiscount) || 0);
    const grandTotal = Math.max(0, subtotal + tax - newDiscount);
    const paidVal = Number(amountPaid) || grandTotal;
    const remaining = Math.max(0, grandTotal - paidVal);

    return {
      subtotal,
      tax,
      discount: newDiscount,
      grandTotal,
      remaining,
      changeDue: paidVal > grandTotal ? paidVal - grandTotal : 0
    };
  }, [selectedGroup, extraDiscount, amountPaid]);

  // Set default paid value when group changes
  React.useEffect(() => {
    if (selectedGroup) {
      setExtraDiscount(String(selectedGroup.discount));
      setAmountPaid(String(selectedGroup.grand_total));
    }
  }, [selectedGroup]);

  const filteredGroups = useMemo(() => {
    return groupedOrders.filter(
      (g) =>
        g.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.customer_name && g.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.table_number && g.table_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [groupedOrders, searchQuery]);

  const handleCompleteBilling = async () => {
    if (!selectedGroup) return;
    
    setIsSubmitting(true);
    try {
      const orderIds = selectedGroup.relatedOrders.map((o: Order) => o.id);
      const { completeMultipleOrdersAction } = await import('@/actions/orders');

      const res = await completeMultipleOrdersAction(
        orderIds,
        paymentType,
        Number(amountPaid) || billingSummary.grandTotal,
        billingSummary.discount
      );

      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Billing completed successfully.`, 'success');


        
        // Remove completed orders from lists
        const updated = orders.filter((o) => !orderIds.includes(o.id));
        setOrders(updated);
        
        // Let the effect select the next group
        setSelectedGroupId(null);
      }
    } catch (err) {
      toast('Failed to close bill.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedGroup) return;
    if (!window.confirm(`Are you sure you want to cancel ${selectedGroup.isGroup ? 'all orders for Table ' + selectedGroup.table_number : 'Order #' + selectedGroup.relatedOrders[0].id}?`)) return;

    try {
      const orderIds = selectedGroup.relatedOrders.map((o: Order) => o.id);
      let successCount = 0;
      for (const id of orderIds) {
        const res = await deleteOrderAction(id);
        if (res.success) successCount++;
      }
      
      toast(`Cancelled ${successCount} order(s).`, 'info');
      const updated = orders.filter((o) => !orderIds.includes(o.id));
      setOrders(updated);
      setSelectedGroupId(null);
    } catch (err) {
      toast('Failed to delete order(s).', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* 1. ORDER SIDEBAR LIST */}
      <div className={`w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/20 flex flex-col shrink-0 ${
        selectedGroupId ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
            Pending Billing
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-3 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search active bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {filteredGroups.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-12">No active orders found.</p>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 select-none ${
                  selectedGroupId === group.id
                    ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950 shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-400'
                }`}
              >
                <div className="flex justify-between items-center font-bold">
                  <span>{group.isGroup ? `Table ${group.table_number}` : `Order #${group.relatedOrders[0].id}`}</span>
                  <span>{formatCurrency(group.grand_total, settings.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1.5 opacity-80">
                  <span>{group.order_type} {group.isGroup ? `(${group.relatedOrders.length} KOTs)` : (group.table_number ? `(T${group.table_number})` : '')}</span>
                  <span>{group.customer_name || 'Walk-In'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. ORDER BILL DETAILS */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-900 ${
        selectedGroupId ? 'flex' : 'hidden md:flex'
      }`}>
        {selectedGroup ? (
          <>
            {/* Left: Invoice items breakdown */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 border-r border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className="md:hidden flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-700 pb-1"
                  >
                    ← Back to Bills List
                  </button>
                  {settings.logo_url && (
                    <div className="mb-2">
                      <img 
                        src={settings.logo_url} 
                        alt="Logo" 
                        className="h-8 object-contain rounded-md max-w-[120px] border border-zinc-200 dark:border-zinc-800 p-1 bg-white"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                    {selectedGroup.isGroup ? `Table No: ${selectedGroup.table_number}` : `Order #${selectedGroup.relatedOrders[0].id}`}
                  </h2>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Placed: {formatDate(selectedGroup.created_at)}
                  </p>
                </div>
                <button
                  onClick={handleCancelOrder}
                  className="text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 font-semibold transition-colors"
                >
                  Cancel Order(s)
                </button>
              </div>

              {/* Items Table */}
              <div className="flex-col flex gap-3.5">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Items Summary</h4>
                <div className="flex flex-col gap-3">
                  {selectedGroup.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-850 dark:text-zinc-200">{item.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {item.quantity} x {formatCurrency(item.price, settings.currency)}
                        </p>
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(Number(item.price) * item.quantity, settings.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedGroup.relatedOrders.some((o: Order) => o.notes) && (
                <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl text-[10px] text-zinc-650 dark:text-zinc-400 leading-relaxed mt-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block mb-1">Kitchen Notes:</span>
                  {selectedGroup.relatedOrders.filter((o: Order) => o.notes).map((o: Order, i: number) => (
                    <div key={i} className="mb-1">{selectedGroup.isGroup && <span className="font-semibold">KOT {i+1}: </span>}{o.notes}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Payment collection inputs */}
            <div className="w-full md:w-[360px] p-6 bg-zinc-50/30 dark:bg-zinc-950/10 overflow-y-auto flex flex-col justify-between shrink-0">
              <div className="flex flex-col gap-6">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-widest">
                  Payment Collection
                </h3>

                {/* 1. Payment Type */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Method</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Cash', 'UPI'] as PaymentType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPaymentType(type)}
                        className={`py-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                          paymentType === type
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950 shadow-sm'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                        }`}
                      >
                        {type === 'Cash' && <DollarSign className="w-4 h-4" />}
                        {type === 'UPI' && <Landmark className="w-4 h-4" />}
                        <span>{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Modify Discount */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Discount Override</span>
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl">
                    <span className="text-xs text-zinc-400 font-bold">{settings.currency === 'USD' ? '$' : '₹'}</span>
                    <input
                      type="number"
                      min="0"
                      value={extraDiscount}
                      onChange={(e) => setExtraDiscount(e.target.value)}
                      className="w-full bg-transparent border-none text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-400"
                    />
                  </div>
                </div>

                {/* 3. Amount Paid input */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Amount Received</span>
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl">
                    <span className="text-xs text-zinc-400 font-bold">{settings.currency === 'USD' ? '$' : '₹'}</span>
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full bg-transparent border-none text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-400"
                    />
                  </div>
                </div>

                {/* Balance summary */}
                <div className="flex flex-col gap-2.5 border-t border-zinc-200/60 dark:border-zinc-800 pt-4 text-xs font-medium text-zinc-500">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-850 dark:text-zinc-250">{formatCurrency(billingSummary.subtotal, settings.currency)}</span>
                  </div>
                  {Number(billingSummary.tax) > 0 && (
                    <div className="flex justify-between items-center">
                      <span>GST ({settings.gst_percentage}%)</span>
                      <span className="font-bold text-zinc-855 dark:text-zinc-250">{formatCurrency(billingSummary.tax, settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>Discounts</span>
                    <span className="font-bold text-red-500">-{formatCurrency(billingSummary.discount, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold text-zinc-900 dark:text-zinc-100 mt-2 border-t border-zinc-100 dark:border-zinc-800/40 pt-2">
                    <span>Grand Total</span>
                    <span>{formatCurrency(billingSummary.grandTotal, settings.currency)}</span>
                  </div>
                  {(billingSummary.changeDue || 0) > 0 && (
                    <div className="flex justify-between items-center text-sm font-extrabold text-emerald-600 mt-1">
                      <span>Change Due</span>
                      <span>{formatCurrency(billingSummary.changeDue || 0, settings.currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 mt-6">
                <Button
                  onClick={handleCompleteBilling}
                  className="w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                  isLoading={isSubmitting}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedGroup?.order_type === 'Takeaway'
                    ? 'Collect Parcel Bill'
                    : 'Collect Receipt'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-zinc-400 gap-1.5">
            <Receipt className="w-12 h-12 stroke-[1.2] text-zinc-300 dark:text-zinc-700" />
            <h4 className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Pending Bills</h4>
            <p className="text-[10px]">All orders are completed and settled in the system.</p>
          </div>
        )}
      </div>

    </div>
  );
}
