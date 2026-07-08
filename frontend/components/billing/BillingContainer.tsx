'use client';

import React, { useState, useMemo } from 'react';
import { Order, RestaurantSettings, PaymentType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { completeOrderAction, deleteOrderAction } from '@/actions/orders';
import { printBillAction } from '@/actions/print';
import { formatCurrency, formatDate } from '@/utils/format';
import { Receipt, CreditCard, Landmark, DollarSign, Printer, CheckCircle2, Search, XCircle } from 'lucide-react';

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
  
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(() => {
    if (preselectedOrderId) return preselectedOrderId;
    if (preselectedTable) {
      const match = initialPendingOrders.find(
        (o) => o.table_number && o.table_number.toLowerCase() === preselectedTable.toLowerCase()
      );
      if (match) return match.id;
    }
    return initialPendingOrders.length > 0 ? initialPendingOrders[0].id : null;
  });
  
  // Search orders
  const [searchQuery, setSearchQuery] = useState(preselectedTable || '');

  // Payment State
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [extraDiscount, setExtraDiscount] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Calculations for modifications
  const billingSummary = useMemo(() => {
    if (!selectedOrder) return { subtotal: 0, tax: 0, discount: 0, grandTotal: 0, remaining: 0 };
    
    const subtotal = Number(selectedOrder.subtotal);
    const tax = Number(selectedOrder.tax);
    const currentDiscount = Number(selectedOrder.discount);
    
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
  }, [selectedOrder, extraDiscount, amountPaid]);

  // Set default paid value when order changes
  React.useEffect(() => {
    if (selectedOrder) {
      setExtraDiscount(String(selectedOrder.discount));
      setAmountPaid(String(selectedOrder.grand_total));
    }
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.id.toString().includes(searchQuery) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.table_number && o.table_number.includes(searchQuery))
    );
  }, [orders, searchQuery]);

  const handleCompleteBilling = async () => {
    if (!selectedOrder) return;
    
    setIsSubmitting(true);
    try {
      const res = await completeOrderAction(
        selectedOrder.id,
        paymentType,
        Number(amountPaid) || billingSummary.grandTotal,
        billingSummary.discount
      );

      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Order #${selectedOrder.id} billing completed successfully.`, 'success');

        // Trigger thermal receipt print job
        const printRes = await printBillAction(selectedOrder.id);
        if (printRes.error) {
          toast(`Billing completed, but print failed: ${printRes.error}`, 'error');
        } else {
          toast('Thermal print job fired successfully.', 'success');
        }
        
        // Remove completed order from lists
        const updated = orders.filter((o) => o.id !== selectedOrder.id);
        setOrders(updated);
        
        // Select next order if available
        setSelectedOrderId(updated.length > 0 ? updated[0].id : null);
        
        // Trigger browser print receipt copy
        setTimeout(() => {
          window.print();
        }, 100);
      }
    } catch (err) {
      toast('Failed to close bill.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Are you sure you want to cancel order #${selectedOrder.id}?`)) return;

    try {
      const res = await deleteOrderAction(selectedOrder.id);
      if (res.success) {
        toast('Order deleted.', 'info');
        const updated = orders.filter((o) => o.id !== selectedOrder.id);
        setOrders(updated);
        setSelectedOrderId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      toast('Failed to delete order.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* 1. ORDER SIDEBAR LIST */}
      <div className={`w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/20 flex flex-col shrink-0 ${
        selectedOrderId ? 'hidden md:flex' : 'flex'
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
          {filteredOrders.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-12">No active orders found.</p>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 select-none ${
                  selectedOrderId === order.id
                    ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950 shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-400'
                }`}
              >
                <div className="flex justify-between items-center font-bold">
                  <span>Order #{order.id}</span>
                  <span>{formatCurrency(order.grand_total, settings.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1.5 opacity-80">
                  <span>{order.order_type} {order.table_number ? `(T${order.table_number})` : ''}</span>
                  <span>{order.customer_name || 'Walk-In'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. ORDER BILL DETAILS */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-900 ${
        selectedOrderId ? 'flex' : 'hidden md:flex'
      }`}>
        {selectedOrder ? (
          <>
            {/* Left: Invoice items breakdown */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 border-r border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedOrderId(null)}
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
                    {selectedOrder.table_number ? `Table No: ${selectedOrder.table_number}` : `Order #${selectedOrder.id}`}
                  </h2>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Placed: {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                <button
                  onClick={handleCancelOrder}
                  className="text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 font-semibold transition-colors"
                >
                  Cancel Order
                </button>
              </div>

              {/* Items Table */}
              <div className="flex-col flex gap-3.5">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Items Summary</h4>
                <div className="flex flex-col gap-3">
                  {selectedOrder.items?.map((item, idx) => (
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
              {selectedOrder.notes && (
                <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl text-[10px] text-zinc-650 dark:text-zinc-400 leading-relaxed mt-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block mb-1">Kitchen Notes:</span>
                  {selectedOrder.notes}
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
                  {billingSummary.changeDue > 0 && (
                    <div className="flex justify-between items-center text-sm font-extrabold text-emerald-600 mt-1">
                      <span>Change Due</span>
                      <span>{formatCurrency(billingSummary.changeDue, settings.currency)}</span>
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
                  <CheckCircle2 className="w-4 h-4" /> Collect &amp; Print Receipt
                </Button>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 bg-white dark:bg-zinc-900"
                >
                  <Printer className="w-3.5 h-3.5" /> Re-Print Receipt (Ctrl+P)
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

      {/* 3. SIMULATED THERMAL PRINT ONLY TEMPLATE (HIDDEN ON SCREEN, VISIBLE ON Ctrl+P) */}
      {selectedOrder && (
        <div id="print-receipt" className="hidden font-mono text-[10px] leading-relaxed text-black p-4 w-[80mm] max-w-[80mm] bg-white border border-dashed border-gray-300">
          <div className="text-center flex flex-col items-center gap-1 border-b border-dashed border-black pb-3">
            {settings.logo_url && (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                className="h-10 object-contain mb-1.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
            <h2 className="text-xs font-extrabold uppercase tracking-tight">{settings.restaurant_name}</h2>
            <p className="text-[8px] whitespace-pre-wrap">{settings.address}</p>
            {settings.phone && <p className="text-[8px]">Tel: {settings.phone}</p>}
            {settings.gstin && <p className="text-[8px]">GSTIN: {settings.gstin}</p>}
          </div>

          <div className="flex flex-col gap-0.5 py-3 border-b border-dashed border-black">
            <div className="flex justify-between">
              <span>Bill No: #{selectedOrder.id}</span>
              <span>Type: {selectedOrder.order_type}</span>
            </div>
            <div className="flex justify-between">
              <span>Date: {formatDate(selectedOrder.created_at)}</span>
              {selectedOrder.table_number && <span>Table: {selectedOrder.table_number}</span>}
            </div>
            <p>Customer: {selectedOrder.customer_name || 'Walk-In'}</p>
          </div>

          {/* Items Header */}
          <div className="py-2 border-b border-dashed border-black flex flex-col gap-1">
            <div className="flex font-bold">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-16 text-right">Amt</span>
            </div>
            <div className="border-t border-dotted border-black/40 my-1" />
            {selectedOrder.items?.map((item, idx) => (
              <div key={idx} className="flex">
                <span className="flex-1 truncate">{item.name}</span>
                <span className="w-10 text-center">{item.quantity}</span>
                <span className="w-16 text-right">
                  {formatCurrency(Number(item.price) * item.quantity, settings.currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals calculations */}
          <div className="flex flex-col gap-0.5 py-3 border-b border-dashed border-black text-right">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(billingSummary.subtotal, settings.currency)}</span>
            </div>
            {Number(billingSummary.tax) > 0 && (
              <div className="flex justify-between">
                <span>GST ({settings.gst_percentage}%):</span>
                <span>{formatCurrency(billingSummary.tax, settings.currency)}</span>
              </div>
            )}
            {billingSummary.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(billingSummary.discount, settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-dotted border-black/40 mt-1">
              <span>Grand Total:</span>
              <span>{formatCurrency(billingSummary.grandTotal, settings.currency)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="py-3 text-center border-b border-dashed border-black">
            <p className="font-bold">Paid via {paymentType}</p>
            <p className="text-[8px] mt-0.5">Amount received: {formatCurrency(Number(amountPaid) || billingSummary.grandTotal, settings.currency)}</p>
            {billingSummary.changeDue > 0 && (
              <p className="font-bold text-[9px] mt-0.5">Balance Return: {formatCurrency(billingSummary.changeDue, settings.currency)}</p>
            )}
          </div>

          <div className="text-center pt-3 flex flex-col gap-0.5 opacity-90">
            <p className="font-bold uppercase tracking-wider text-[8px]">Thank you! Visit again!</p>
            <p className="text-[6px] italic">System generated copy</p>
          </div>
        </div>
      )}

      {/* Global CSS Inject to support print-layout Gating */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide main app shells, wrappers, navbars */
          body > :not(#print-receipt) {
            display: none !important;
          }
          aside, main, header, footer, button, nav {
            display: none !important;
          }
          #print-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
