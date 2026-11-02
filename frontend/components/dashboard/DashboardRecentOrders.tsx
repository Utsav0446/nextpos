'use client';

import React, { useState } from 'react';
import { Order, RestaurantSettings } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

import { getRelatedOrdersForBillAction } from '@/actions/orders';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 

  Eye, 
  X, 
  Calendar, 
  ShoppingBag, 
  Utensils, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Search,
  Loader2
} from 'lucide-react';

interface DashboardRecentOrdersProps {
  initialOrders: Order[];
  settings: RestaurantSettings;
}

export function DashboardRecentOrders({ initialOrders, settings }: DashboardRecentOrdersProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [relatedOrders, setRelatedOrders] = useState<Order[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');



  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setIsLoadingRelated(true);
    setRelatedOrders([]);
    try {
      const res = await getRelatedOrdersForBillAction(order.id);
      if (res.error || !res.orders) {
        toast('Failed to load related orders.', 'error');
        setRelatedOrders([order]);
      } else {
        setRelatedOrders(res.orders as Order[]);
      }
    } catch (err) {
      setRelatedOrders([order]);
    } finally {
      setIsLoadingRelated(false);
    }
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
                        {new Date(String(order.created_at) + (String(order.created_at).includes('Z') || String(order.created_at).includes('+') ? '' : 'Z')).toLocaleString('en-US', { 
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
                          onClick={() => handleViewOrder(order)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all"
                          title="View Bill"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

                {isLoadingRelated ? (
                  <div className="flex flex-col items-center gap-2 my-8 text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px]">Loading orders...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-full flex flex-col gap-3 text-left text-[10px] font-mono">
                      {relatedOrders.map((o, index) => (
                        <div key={o.id} className="flex flex-col gap-1.5">
                          {relatedOrders.length > 1 && (
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded text-[9px] flex justify-between">
                              <span>KOT #{index + 1}</span>
                              <span className="text-zinc-500">{new Date(String(o.created_at) + (String(o.created_at).includes('Z') || String(o.created_at).includes('+') ? '' : 'Z')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          )}
                          {o.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start px-1">
                              <span className="flex-1 pr-4">{item.name}</span>
                              <span className="shrink-0">{item.quantity} x {formatCurrency(Number(item.price), settings.currency)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="w-full border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2" />

                    {/* Calculations */}
                    <div className="w-full flex flex-col gap-1 text-[9px] text-zinc-400 font-mono">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(relatedOrders.reduce((acc, o) => acc + Number(o.subtotal), 0), settings.currency)}</span>
                      </div>
                      {relatedOrders.reduce((acc, o) => acc + Number(o.tax), 0) > 0 && (
                        <div className="flex justify-between">
                          <span>GST ({settings.gst_percentage}%)</span>
                          <span>{formatCurrency(relatedOrders.reduce((acc, o) => acc + Number(o.tax), 0), settings.currency)}</span>
                        </div>
                      )}
                      {relatedOrders.reduce((acc, o) => acc + Number(o.discount), 0) > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span>Discount</span>
                          <span>-{formatCurrency(relatedOrders.reduce((acc, o) => acc + Number(o.discount), 0), settings.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11px] font-extrabold text-zinc-900 dark:text-zinc-50 border-t border-dashed border-zinc-200 dark:border-zinc-850 pt-1.5 mt-1">
                        <span>GRAND TOTAL</span>
                        <span>{formatCurrency(relatedOrders.reduce((acc, o) => acc + Number(o.grand_total), 0), settings.currency)}</span>
                      </div>
                    </div>
                  </>
                )}

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
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
