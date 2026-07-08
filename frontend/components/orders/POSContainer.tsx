'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Category, MenuItem, OrderType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createOrderAction } from '@/actions/orders';
import { printKOTAction } from '@/actions/print';
import { formatCurrency } from '@/utils/format';
import { Search, Plus, Minus, Trash2, ShoppingBag, User, TableProperties, HelpCircle, Utensils, ArrowRightLeft } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { RestaurantTable } from '@/queries/tables';
import { useLanguage } from '@/context/LanguageContext';

interface POSContainerProps {
  categories: Category[];
  menuItems: MenuItem[];
  tables?: RestaurantTable[];
  taxPercentage: number;
  currencyCode: string;
  preselectedTable?: string;
  preselectedType?: string;
  printKOTAutomatically?: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export default function POSContainer({ categories, menuItems, tables = [], taxPercentage, currencyCode, preselectedTable, preselectedType, printKOTAutomatically = true }: POSContainerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const currencySymbol = currencyCode === 'USD' ? '$' : 
                         currencyCode === 'EUR' ? '€' : 
                         currencyCode === 'GBP' ? '£' : '₹';

  const getItemName = (item: MenuItem) => {
    if (language === 'gu') return item.name_gu || item.name;
    if (language === 'hi') return item.name_hi || item.name;
    return item.name;
  };

  const getItemDescription = (item: MenuItem) => {
    if (language === 'gu') return item.description_gu || item.description || '';
    if (language === 'hi') return item.description_hi || item.description || '';
    return item.description || '';
  };

  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customization modal states
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [spiceLevel, setSpiceLevel] = useState<string>('Regular');
  const [prefLevel, setPrefLevel] = useState<string>('Regular');
  const [customNote, setCustomNote] = useState<string>('');
  const [dosaTexture, setDosaTexture] = useState<string>('Regular');

  // Order information
  const [orderType, setOrderType] = useState<OrderType>(
    (preselectedType as OrderType) || (preselectedTable ? 'Dine-In' : 'Dine-In')
  );
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState(preselectedType === 'Takeaway' ? '' : (preselectedTable || ''));
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'cart'>('menu');

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (item.name_gu && item.name_gu.toLowerCase().includes(searchQuery.toLowerCase())) || 
                        (item.name_hi && item.name_hi.toLowerCase().includes(searchQuery.toLowerCase()));
      const descMatch = (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) || 
                        (item.description_gu && item.description_gu.toLowerCase().includes(searchQuery.toLowerCase())) || 
                        (item.description_hi && item.description_hi.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSearch = nameMatch || descMatch;
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart operations
  const handleItemClick = (item: MenuItem) => {
    if (!item.is_available) {
      toast('Item is currently out of stock.', 'error');
      return;
    }

    if (item.show_popup === false) {
      const parts: string[] = [];
      const defaultSpice = item.default_spice || 'Regular';
      const defaultPrep = item.default_prep || 'Regular';
      const defaultTexture = item.default_texture || 'Regular';

      if (item.allow_spice && defaultSpice && defaultSpice !== 'Regular') {
        parts.push(defaultSpice);
      }
      if (item.allow_prep && defaultPrep && defaultPrep !== 'Regular' && defaultPrep !== 'Normal') {
        parts.push(defaultPrep);
      }
      if (item.allow_texture && defaultTexture && defaultTexture !== 'Regular') {
        parts.push(defaultTexture);
      }

      const itemNotes = parts.join(', ');

      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (i) => i.menuItem.id === item.id && (i.notes || '') === itemNotes
        );

        if (existingIndex > -1) {
          return prev.map((cartItem, idx) =>
            idx === existingIndex ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
          );
        }

        return [...prev, { menuItem: item, quantity: 1, notes: itemNotes }];
      });

      toast(`${getItemName(item)} added to cart`, 'success');
      return;
    }

    setCustomizingItem(item);
    setSpiceLevel(item.default_spice || 'Regular');
    setPrefLevel(item.default_prep || 'Regular');
    setDosaTexture(item.default_texture || 'Regular');
    setCustomNote('');
  };

  const handleConfirmAddToCart = () => {
    if (!customizingItem) return;

    const parts: string[] = [];
    if (spiceLevel && spiceLevel !== 'Regular') {
      parts.push(spiceLevel);
    }
    if (prefLevel && prefLevel !== 'Regular' && prefLevel !== 'Normal') {
      parts.push(prefLevel);
    }
    if (dosaTexture && dosaTexture !== 'Regular') {
      parts.push(dosaTexture);
    }
    if (customNote.trim()) {
      parts.push(customNote.trim());
    }

    const itemNotes = parts.join(', ');

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.menuItem.id === customizingItem.id && i.notes === itemNotes
      );

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...prev, { menuItem: customizingItem, quantity: 1, notes: itemNotes }];
    });

    setCustomizingItem(null);
    toast(`${getItemName(customizingItem)} added to cart.`, 'success');
  };

  const updateQuantity = (itemId: number, itemNotes: string | undefined, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === itemId && i.notes === itemNotes) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (itemId: number, itemNotes: string | undefined) => {
    setCart((prev) => prev.filter((i) => !(i.menuItem.id === itemId && i.notes === itemNotes)));
    toast('Item removed from order.', 'info');
  };

  const clearOrder = () => {
    setCart([]);
    setCustomerName('');
    setTableNumber('');
    setNotes('');
    setDiscountAmount(0);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * Number(item.menuItem.price), 0);
  }, [cart]);

  const tax = useMemo(() => {
    return (subtotal * taxPercentage) / 100;
  }, [subtotal, taxPercentage]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + tax - discountAmount);
  }, [subtotal, tax, discountAmount]);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast('Please add items to the cart first.', 'error');
      return;
    }

    if (orderType === 'Dine-In' && !tableNumber) {
      toast('Please input a Table Number for Dine-In orders.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customer_name: customerName || 'Walk-in',
        table_number: orderType === 'Dine-In' ? tableNumber : null,
        order_type: orderType,
        notes: notes || null,
        items: cart.map((i) => ({
          menu_item_id: i.menuItem.id,
          name: i.notes ? `${getItemName(i.menuItem)} (${i.notes})` : getItemName(i.menuItem),
          quantity: i.quantity,
          price: Number(i.menuItem.price),
        })),
        discount: discountAmount,
        tax,
        subtotal,
        grand_total: grandTotal,
      };

      const res = await createOrderAction(orderPayload);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Order #${res.orderId} placed successfully.`, 'success');
        if (printKOTAutomatically && res.orderId) {
          const printRes = await printKOTAction(res.orderId);
          if (printRes.error) {
            toast(`Order placed, but print KOT failed: ${printRes.error}`, 'error');
          } else {
            toast('KOT print job fired successfully.', 'success');
          }
        }
        clearOrder();
        router.push('/tables');
      }
    } catch (error) {
      toast('Failed to save order.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
      {/* LEFT COLUMN: MENU ITEMS */}
      <div className={`flex-1 flex flex-col p-6 overflow-hidden bg-zinc-50/20 dark:bg-zinc-950/20 border-r border-zinc-150 dark:border-zinc-900 pb-[76px] lg:pb-6 ${
        activeMobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Search and Category filters */}
        <div className="flex flex-col gap-4 mb-6 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-100 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Categories list tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-400'
              }`}
            >
              {t('allCategories')}
            </button>
            {categories.map((cat) => {
              const categoryName = 
                language === 'gu' ? (cat.name_gu || cat.name) :
                language === 'hi' ? (cat.name_hi || cat.name) :
                cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-400'
                  }`}
                >
                  {categoryName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <HelpCircle className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Menu Items Found</p>
              <p className="text-[10px] mt-0.5">Try searching different terms or select another category tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md cursor-pointer transition-all duration-150 select-none active:scale-[0.98] ${
                    !item.is_available ? 'opacity-50 grayscale cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    {/* Header: veg badge & availability */}
                    <div className="flex justify-between items-center">
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                        item.is_veg 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' 
                          : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-550' : 'bg-red-550'}`} />
                      </span>
                      {!item.is_available && (
                        <span className="text-[9px] font-bold text-red-550 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-md">
                          Out of stock
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-extrabold text-zinc-850 dark:text-zinc-200 truncate leading-snug">
                      {getItemName(item)}
                    </h4>
                    {getItemDescription(item) && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                        {getItemDescription(item)}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2 border-t border-zinc-50 dark:border-zinc-800/40 pt-2 shrink-0">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(item.price, currencyCode)}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CART */}
      <div className={`w-full lg:w-[420px] bg-white dark:bg-zinc-900 flex flex-col justify-between shadow-lg overflow-y-auto lg:overflow-hidden shrink-0 border-t lg:border-t-0 border-zinc-200 dark:border-zinc-850 pb-[76px] lg:pb-0 ${
        activeMobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Cart Header & Order details */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-zinc-400" /> Current Order
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearOrder}
                className="text-[10px] text-zinc-400 hover:text-red-500 flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Cart
              </button>
            )}
          </div>

          {/* Dine-in vs Takeaway type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['Dine-In', 'Takeaway'] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                  orderType === type
                    ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950'
                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Customer / Table Fields */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-800/80 rounded-xl">
              <User className="w-3.5 h-3.5 text-zinc-450 shrink-0" />
              <input
                type="text"
                placeholder="Walk-In Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-transparent border-none text-[11px] text-zinc-800 dark:text-zinc-205 focus:outline-none placeholder-zinc-400"
              />
            </div>
            {orderType === 'Dine-In' ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-800/80 rounded-xl flex-1">
                <TableProperties className="w-3.5 h-3.5 text-zinc-450 shrink-0" />
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-transparent border-none text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-450 cursor-pointer h-7"
                  required
                >
                  <option value="" className="text-zinc-500 bg-white dark:bg-zinc-900">Select Table *</option>
                  {tables.map((table) => (
                    <option 
                      key={table.id} 
                      value={table.table_number}
                      className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900"
                    >
                      {table.table_number} ({table.status})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800/40 rounded-xl opacity-50 cursor-not-allowed">
                <TableProperties className="w-3.5 h-3.5 text-zinc-350 shrink-0" />
                <span className="text-[11px] text-zinc-400 select-none">N/A</span>
              </div>
            )}
          </div>
        </div>

        {/* Cart Item Rows */}
        <div className="lg:flex-1 lg:overflow-y-auto p-5 flex flex-col gap-4 h-auto lg:h-full shrink-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 gap-1.5 py-12">
              <ShoppingBag className="w-8 h-8 stroke-[1.2]" />
              <p className="text-xs font-bold text-zinc-650 dark:text-zinc-400">Order is empty</p>
              <p className="text-[10px] text-zinc-500">Tap items on the left to add to order.</p>
            </div>
          ) : (
            cart.map((item) => {
              const uniqueKey = `${item.menuItem.id}-${item.notes || ''}`;
              return (
                <div key={uniqueKey} className="flex justify-between items-center gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{getItemName(item.menuItem)}</p>
                    {item.notes && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5 font-bold flex items-center gap-1">
                        🌶️ {item.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 mt-0.5">{formatCurrency(item.menuItem.price, currencyCode)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.notes, -1)}
                        className="px-2.5 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.notes, 1)}
                        className="px-2.5 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.menuItem.id, item.notes)}
                      className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Calculations & Submit panel */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-4">
          <div className="flex flex-col gap-2 border-b border-zinc-150 dark:border-zinc-800/60 pb-3 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-zinc-500">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(subtotal, currencyCode)}</span>
            </div>

            {/* Discount Input */}
            <div className="flex justify-between items-center text-zinc-500">
              <span>Discount</span>
              <div className="flex items-center gap-1 max-w-[100px]">
                <span className="text-[10px] font-bold text-zinc-450">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full text-right bg-transparent border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Tax */}
            {taxPercentage > 0 && (
              <div className="flex justify-between items-center text-zinc-500">
                <span>GST ({taxPercentage}%)</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(tax, currencyCode)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-450">Grand Total</span>
            <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(grandTotal, currencyCode)}
            </span>
          </div>

          {/* Special notes */}
          <textarea
            placeholder="Add special cooking notes, allergies, table requests..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] text-zinc-700 dark:text-zinc-350 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-200 placeholder-zinc-400 h-12 resize-none"
          />

          {/* Action buttons */}
          <Button
            onClick={handlePlaceOrder}
            className="w-full py-3 font-semibold text-[13px]"
            isLoading={isSubmitting}
            disabled={cart.length === 0}
          >
            Place Kitchen Order (KOT)
          </Button>
        </div>
      </div>

      {/* FLOATING QUICK PLACE ORDER BANNER ON MOBILE */}
      {cart.length > 0 && activeMobileTab === 'menu' && (
        <div className="lg:hidden fixed bottom-[76px] left-4 right-4 z-40 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 p-3 rounded-2xl flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom duration-250">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Current Order</span>
            <span className="text-xs font-extrabold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items • {formatCurrency(grandTotal, currencyCode)}
            </span>
          </div>
          {orderType === 'Dine-In' && !tableNumber ? (
            <button
              onClick={() => setActiveMobileTab('cart')}
              className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-[0.97] transition-all flex items-center gap-1.5"
            >
              Review &amp; Place KOT <ShoppingBag className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-[0.97] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Placing...' : 'Place KOT'}
            </button>
          )}
        </div>
      )}

      {/* BOTTOM MOBILE TAB SWITCHER */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-2 flex gap-2">
        <button
          onClick={() => setActiveMobileTab('menu')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'menu'
              ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <Utensils className="w-4 h-4" /> Menu
        </button>
        <button
          onClick={() => setActiveMobileTab('cart')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
            activeMobileTab === 'cart'
              ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Cart
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* FOOD ITEM CUSTOMIZATION DIALOG */}
      <Dialog
        isOpen={customizingItem !== null}
        onClose={() => setCustomizingItem(null)}
        title={customizingItem ? `Customize: ${getItemName(customizingItem)}` : ''}
      >
        {customizingItem && (
          <div className="flex flex-col gap-5 text-xs">
            {/* Spice levels */}
            <div className="flex flex-col gap-2">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Spice Level</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {['Regular', 'Zero Spicy', 'Mild', 'Medium Spicy', 'Spicy', 'Extra Spicy'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSpiceLevel(level)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all text-center ${
                      spiceLevel === level
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {level.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Preparation Preferences */}
            <div className="flex flex-col gap-2">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Preparation Preference</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Regular', 'Normal', 'No Onion / Garlic', 'Jain', 'No Coriander', 'No Dhaniya'].map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setPrefLevel(pref)}
                    className={`py-2 rounded-xl text-[10px] font-bold border transition-all text-center ${
                      prefLevel === pref
                        ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {/* Dhosa Paper Style - shown smart depending on category/name */}
            {(() => {
              const categoryName = customizingItem.category_name?.toLowerCase() || '';
              const itemName = customizingItem.name?.toLowerCase() || '';
              const isDosa = categoryName.includes('dosa') || categoryName.includes('dhosa') ||
                             itemName.includes('dosa') || itemName.includes('dhosa') ||
                             (customizingItem.allow_texture ?? false);
              if (!isDosa) return null;

              return (
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Dhosa Paper style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Regular', 'Soft', 'Medium', 'Kadak'].map((texture) => (
                      <button
                        key={texture}
                        type="button"
                        onClick={() => setDosaTexture(texture)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all text-center ${
                          dosaTexture === texture
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                        }`}
                      >
                        {texture}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Custom Notes */}
            <div className="flex flex-col gap-2">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Custom Preparation Instructions</label>
              <input
                type="text"
                placeholder="e.g. Extra crispy, less oil, cut into two"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-400 focus:border-zinc-350"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <Button
                variant="outline"
                onClick={() => setCustomizingItem(null)}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAddToCart}
                className="flex-1 py-2.5 text-xs font-bold"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
