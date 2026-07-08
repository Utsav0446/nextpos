'use client';

import React, { useState } from 'react';
import { Order, RestaurantSettings } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { printBillAction } from '@/actions/print';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Printer, 
  Eye, 
  X, 
  Calendar, 
  ShoppingBag, 
  Utensils, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Search
} from 'lucide-react';

interface DashboardRecentOrdersProps {
  initialOrders: Order[];
  settings: RestaurantSettings;
}

export function DashboardRecentOrders({ initialOrders, settings }: DashboardRecentOrdersProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPrinting, setIsPrinting] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePrint = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPrinting(orderId);
    try {
      const res = await printBillAction(orderId);
      if (res.error) {
        toast(`Printing failed: ${res.error}`, 'error');
      } else {
        toast('Thermal print job fired successfully.', 'success');
      }
    } catch (err) {
      toast('Failed to trigger print job.', 'error');
    } finally {
      setIsPrinting(null);
    }
  };

  const handleBrowserPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Filter orders based on search term (ID or Customer Name)
  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      order.id.toString().includes(term) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(term)) ||
      (order.table_number && order.table_number.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col h-[520px]">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-zinc-550 dark:text-zinc-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
              Orders History (Past 7 Days)
            </CardTitle>
          </div>
          
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search by Order ID, table, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-550 focus:outline-none focus:ring-1.5 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto px-6 py-0">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-zinc-400 gap-1.5">
              <ShoppingBag className="w-10 h-10 stroke-[1.2] text-zinc-300 dark:text-zinc-700" />
              <h4 className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Orders Found</h4>
              <p className="text-[10px]">There are no orders matching your search or in the past 7 days.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredOrders.map((order) => {
                const totalItemsQty = order.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                const itemsSummary = order.items?.map(it => `${it.quantity}x ${it.name}`).join(', ') || 'No items';

                return (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 px-2 -mx-2 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-50">
                          Order #{order.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 ${
                          order.order_type === 'Takeaway'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30'
                        }`}>
                          {order.order_type === 'Takeaway' ? (
                            <>
                              <ShoppingBag className="w-2.5 h-2.5" /> Parcel
                            </>
                          ) : (
                            <>
                              <Utensils className="w-2.5 h-2.5" /> Dine In {order.table_number ? `(T${order.table_number})` : ''}
                            </>
                          )}
                        </span>
                        {order.token_no && (
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[8px] font-bold text-zinc-600 dark:text-zinc-400">
                            Token #{order.token_no}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase flex items-center gap-0.5 ${
                          order.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {order.status === 'Completed' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          {order.status}
                        </span>
                      </div>

                      {/* Items ordered info */}
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium truncate max-w-lg">
                        <span className="font-bold text-zinc-700 dark:text-zinc-350">{totalItemsQty} items: </span>
                        {itemsSummary}
                      </p>

                      <p className="text-[9px] text-zinc-400">
                        {new Date(order.created_at).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {order.customer_name && ` • Customer: ${order.customer_name}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(order.grand_total, settings.currency)}
                      </span>
                      
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all"
                          title="View Bill"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isPrinting === order.id}
                          onClick={(e) => handlePrint(order.id, e)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all disabled:opacity-50"
                          title="Print Receipt"
                        >
                          <Printer className={`w-3.5 h-3.5 ${isPrinting === order.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill View Dialog Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Bill Invoice Summary
                </h3>
                <p className="text-[10px] text-zinc-400">Order #{selectedOrder.id} • {selectedOrder.order_type}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Receipt Style Preview */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-medium text-zinc-650 dark:text-zinc-350">
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/40 dark:bg-zinc-950/20 flex flex-col items-center gap-1 text-center font-mono">
                {settings.logo_url && (
                  <img 
                    src={settings.logo_url} 
                    alt="Logo" 
                    className="h-10 object-contain mb-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">{settings.restaurant_name}</h4>
                <p className="text-[9px] text-zinc-400 max-w-[240px] leading-relaxed">{settings.address}</p>
                {settings.phone && <p className="text-[9px] text-zinc-400">Tel: {settings.phone}</p>}
                {settings.gstin && <p className="text-[9px] text-zinc-400">GSTIN: {settings.gstin}</p>}

                <div className="w-full border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2" />

                <div className="w-full flex justify-between text-[9px] text-zinc-400">
                  <span>Bill No: #{selectedOrder.id}</span>
                  <span>Type: {selectedOrder.order_type}</span>
                </div>
                <div className="w-full flex justify-between text-[9px] text-zinc-400 mt-0.5">
                  <span>Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                  <span>Table: {selectedOrder.table_number || 'N/A'}</span>
                </div>
                {selectedOrder.token_no && (
                  <div className="w-full text-center mt-1 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 py-1 rounded">
                    TOKEN NUMBER: {selectedOrder.token_no}
                  </div>
                )}

                <div className="w-full border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2" />

                {/* Items Grid */}
                <div className="w-full flex flex-col gap-1.5 text-left text-[10px] font-mono">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <span className="flex-1 pr-4">{item.name}</span>
                      <span className="shrink-0">{item.quantity} x {formatCurrency(Number(item.price), settings.currency)}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2" />

                {/* Calculations */}
                <div className="w-full flex flex-col gap-1 text-[9px] text-zinc-400 font-mono">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(Number(selectedOrder.subtotal), settings.currency)}</span>
                  </div>
                  {Number(selectedOrder.tax) > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({settings.gst_percentage}%)</span>
                      <span>{formatCurrency(Number(selectedOrder.tax), settings.currency)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Discount</span>
                      <span>-{formatCurrency(Number(selectedOrder.discount), settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] font-extrabold text-zinc-900 dark:text-zinc-50 border-t border-dashed border-zinc-200 dark:border-zinc-850 pt-1.5 mt-1">
                    <span>GRAND TOTAL</span>
                    <span>{formatCurrency(Number(selectedOrder.grand_total), settings.currency)}</span>
                  </div>
                </div>

                {selectedOrder.payment_type && (
                  <>
                    <div className="w-full border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2" />
                    <p className="font-bold text-[9px] uppercase tracking-wide">Paid via {selectedOrder.payment_type}</p>
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-950/20">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print (Browser)
              </button>
              <button
                type="button"
                disabled={isPrinting === selectedOrder.id}
                onClick={(e) => handlePrint(selectedOrder.id, e)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print (Thermal)
              </button>
            </div>
          </div>
        </div>
      )}

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
              <span>Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</span>
              <span>Table: {selectedOrder.table_number || 'N/A'}</span>
            </div>
            {selectedOrder.token_no && (
              <div className="text-center font-bold border border-black py-0.5 mt-1 text-[9px]">
                TOKEN NO: {selectedOrder.token_no}
              </div>
            )}
          </div>

          <table className="w-full text-left py-3 border-b border-dashed border-black text-[9px] font-mono">
            <thead>
              <tr className="border-b border-dashed border-black">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-right">Qty x Price</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pr-2">{item.name}</td>
                  <td className="py-1 text-right">{item.quantity} x {formatCurrency(Number(item.price), settings.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-1 py-3 border-b border-dashed border-black text-[9px] font-mono">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(selectedOrder.subtotal), settings.currency)}</span>
            </div>
            {Number(selectedOrder.tax) > 0 && (
              <div className="flex justify-between">
                <span>GST ({settings.gst_percentage}%)</span>
                <span>{formatCurrency(Number(selectedOrder.tax), settings.currency)}</span>
              </div>
            )}
            {Number(selectedOrder.discount) > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(Number(selectedOrder.discount), settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-extrabold border-t border-dashed border-black pt-1.5 mt-1">
              <span>GRAND TOTAL</span>
              <span>{formatCurrency(Number(selectedOrder.grand_total), settings.currency)}</span>
            </div>
          </div>

          <div className="text-center pt-3 flex flex-col gap-0.5 opacity-90">
            {selectedOrder.payment_type && (
              <p className="font-bold">Paid via {selectedOrder.payment_type}</p>
            )}
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
          aside, main, header, footer, button, nav, .fixed {
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
