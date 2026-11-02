'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Category, MenuItem, OrderType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createOrderAction } from '@/actions/orders';
import { formatCurrency } from '@/utils/format';
import { Search, Plus, Minus, Trash2, ShoppingBag, User, TableProperties, HelpCircle, Utensils, ArrowRightLeft, Edit2, X, ArrowLeft, Menu, ChevronDown } from 'lucide-react';
import Link from 'next/link';
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

}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  price?: number;
}

export default function POSContainer({ categories, menuItems, tables = [], taxPercentage, currencyCode, preselectedTable, preselectedType }: POSContainerProps) {
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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  
  // Customization modal states
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{ name: string; price: number } | null>(null);
  const [spiceLevel, setSpiceLevel] = useState<string>('Regular');
  const [prefLevel, setPrefLevel] = useState<string>('Regular');
  const [customNote, setCustomNote] = useState<string>('');
  const [dosaTexture, setDosaTexture] = useState<string>('Regular');
  const [customSelections, setCustomSelections] = useState<Record<string, string>>({});

  // Inline Cart Customization
  const [editingCartItem, setEditingCartItem] = useState<{ id: number; notes: string | undefined; quantity: number; menuItem: MenuItem } | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');

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

      // Channel Availability Filtering (Sitting vs Parcel)
      const matchesChannel = orderType === 'Dine-In'
        ? (item.allow_sitting !== false)
        : (item.allow_parcel !== false);

      return matchesCategory && matchesSearch && matchesChannel;
    });
  }, [menuItems, selectedCategory, searchQuery, orderType]);

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
      
      if (item.custom_options && item.custom_options.length > 0) {
        item.custom_options.forEach((opt) => {
          if (opt.defaultOption) {
            parts.push(opt.defaultOption);
          }
        });
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
    if (item.has_variants && item.variants && item.variants.length > 0) {
      setSelectedVariant(item.variants[0]);
    } else {
      setSelectedVariant(null);
    }
    setSpiceLevel(item.default_spice || 'Regular');
    setPrefLevel(item.default_prep || 'Regular');
    setDosaTexture(item.default_texture || 'Regular');
    setCustomNote('');
    
    // Initialize custom selections with defaults
    const initialSelections: Record<string, string> = {};
    if (item.custom_options) {
      item.custom_options.forEach(opt => {
        if (opt.defaultOption) {
          initialSelections[opt.name] = opt.defaultOption;
        } else if (opt.options.length > 0) {
          initialSelections[opt.name] = opt.options[0]; // fallback to first option
        }
      });
    }
    setCustomSelections(initialSelections);
  };

  const handleConfirmAddToCart = () => {
    if (!customizingItem) return;

    const parts: string[] = [];
    let itemPrice = Number(customizingItem.price);

    if (selectedVariant) {
      parts.push(selectedVariant.name);
      itemPrice = Number(selectedVariant.price);
    }

    if (spiceLevel && spiceLevel !== 'Regular') {
      parts.push(spiceLevel);
    }
    if (prefLevel && prefLevel !== 'Regular' && prefLevel !== 'Normal') {
      parts.push(prefLevel);
    }
    if (dosaTexture && dosaTexture !== 'Regular') {
      parts.push(dosaTexture);
    }
    
    // Add custom dynamic selections
    if (customizingItem.custom_options) {
      customizingItem.custom_options.forEach(opt => {
        const selected = customSelections[opt.name];
        if (selected) {
          parts.push(selected);
        }
      });
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

      return [...prev, { menuItem: customizingItem, quantity: 1, notes: itemNotes, price: itemPrice }];
    });

    setCustomizingItem(null);
    setSelectedVariant(null);
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

  const openCartItemNotesModal = (item: CartItem) => {
    setEditingCartItem({ id: item.menuItem.id, notes: item.notes, quantity: item.quantity, menuItem: item.menuItem });
    setEditingNotes(item.notes || '');
  };

  const handleSaveCartItemNotes = () => {
    if (!editingCartItem) return;
    const { id, notes: oldNotes, quantity, menuItem } = editingCartItem;
    const newNotes = editingNotes.trim();

    setCart((prev) => {
      // Remove the old item
      let updated = prev.filter(i => !(i.menuItem.id === id && i.notes === oldNotes));
      
      // Check if there is already an item with the new notes
      const existingIndex = updated.findIndex(i => i.menuItem.id === id && (i.notes || '') === newNotes);
      if (existingIndex > -1) {
        // Merge quantities
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
      } else {
        // Push as a new stack
        updated.push({ menuItem, quantity, notes: newNotes });
      }
      return updated;
    });

    setEditingCartItem(null);
    setEditingNotes('');
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
    return cart.reduce((sum, item) => sum + item.quantity * Number(item.price ?? item.menuItem.price), 0);
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
      const allItemNotes = cart
        .filter(i => i.notes)
        .map(i => `${getItemName(i.menuItem)}: ${i.notes}`)
        .join('\n');
      
      const combinedNotes = [notes, allItemNotes].filter(Boolean).join('\n\n');

      const orderPayload = {
        customer_name: customerName || 'Walk-in',
        table_number: orderType === 'Dine-In' ? tableNumber : null,
        order_type: orderType,
        status: 'Pending' as const,
        notes: combinedNotes || null,
        items: cart.map((i) => {
          const fullName = i.notes ? `${getItemName(i.menuItem)} (${i.notes})` : getItemName(i.menuItem);
          return {
            menu_item_id: i.menuItem.id,
            name: fullName.length > 150 ? fullName.substring(0, 147) + '...' : fullName,
            quantity: i.quantity,
            price: Number(i.price ?? i.menuItem.price),
          };
        }),
        discount: discountAmount,
        tax,
        subtotal,
        grand_total: grandTotal,
        paid_amount: 0,
      };

      const res = await createOrderAction(orderPayload);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Order #${res.orderId} placed successfully.`, 'success');
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#FDF9F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans select-none">
      {/* TERRACOTTA HEADER BAR MATCHING IMAGE 4 */}
      <header className="bg-[#8B3A36] text-white px-5 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight">
            {orderType === 'Takeaway' ? 'Parcel' : 'Dine-In'} - Offline (Sync)
          </h1>
        </div>

        <button
          onClick={() => {}}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      </header>

      {/* MAIN LAYOUT SPLIT */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* LEFT COLUMN: CATEGORIES & MENU ITEMS */}
        <div className="flex-1 flex flex-col gap-5 overflow-hidden">
          {/* CATEGORIES GRID MATCHING IMAGE 4 */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-3 rounded-2xl text-xs font-bold text-center border shadow-xs transition-all ${
                selectedCategory === 'all'
                  ? 'border-2 border-[#2196F3] bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {t('allCategories')}
            </button>
            {categories.map((cat) => {
              const categoryName =
                language === 'gu'
                  ? cat.name_gu || cat.name
                  : language === 'hi'
                  ? cat.name_hi || cat.name
                  : cat.name;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-2xl text-xs font-bold text-center border shadow-xs transition-all leading-snug truncate ${
                    isSelected
                      ? 'border-2 border-[#2196F3] bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50'
                  }`}
                  title={categoryName}
                >
                  {categoryName}
                </button>
              );
            })}
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs focus:outline-none"
            />
          </div>

          {/* MENU ITEMS GRID */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                <HelpCircle className="w-10 h-10 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Menu Items Found</p>
                <p className="text-[10px] mt-0.5">Try searching different terms or select another category card.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-150 select-none active:scale-[0.98] ${
                      !item.is_available ? 'opacity-50 grayscale cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className={`w-3 h-3 rounded-xs border flex items-center justify-center ${
                          item.is_veg ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {getItemName(item)}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center mt-1 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(item.price, currencyCode)}
                      </span>
                      <div className="w-5 h-5 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                        <Plus className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CART MATCHING IMAGE 4 */}
        <div className="w-full lg:w-[380px] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-sm overflow-hidden shrink-0 min-h-[460px]">
          {/* CART HEADER WITH PAYMENT SELECTOR */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Cart
            </h3>

            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / Online</option>
                <option value="Card">Card</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* CART ITEMS LIST */}
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto min-h-[220px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 gap-1 my-auto py-12">
                <ShoppingBag className="w-8 h-8 stroke-[1.2]" />
                <p className="text-xs font-bold text-zinc-650 dark:text-zinc-400">Cart is empty</p>
                <p className="text-[10px] text-zinc-400">Select items on the left to add to order.</p>
              </div>
            ) : (
              cart.map((item) => {
                const uniqueKey = `${item.menuItem.id}-${item.notes || ''}`;
                return (
                  <div key={uniqueKey} className="flex justify-between items-center gap-3 text-xs border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{getItemName(item.menuItem)}</p>
                      {item.notes && (
                        <p className="text-[10px] text-red-500 font-medium">🌶️ {item.notes}</p>
                      )}
                      <p className="text-[10px] text-zinc-400">{formatCurrency(item.price ?? item.menuItem.price, currencyCode)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, item.notes, -1)}
                          className="px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, item.notes, 1)}
                          className="px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.menuItem.id, item.notes)}
                        className="text-zinc-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* BOTTOM TOTAL & ACTION BAR MATCHING IMAGE 4 */}
          <div className="p-4 bg-[#FDF9F5] dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 rounded-b-3xl">
            <div className="flex justify-between items-center text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <span>Total:</span>
              <span>{formatCurrency(grandTotal, currencyCode)}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Trash button */}
              <button
                onClick={clearOrder}
                className="w-12 h-12 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white flex items-center justify-center shadow-sm transition-colors shrink-0"
                title="Clear Order"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Create Order button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-2 border-[#2196F3] text-[#2196F3] dark:text-sky-400 font-bold text-sm flex items-center justify-center shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Order...' : 'Create Order'}
              </button>
            </div>
          </div>
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
            
            {/* Custom Dynamic Categories */}
            {customizingItem.custom_options && customizingItem.custom_options.map((customCategory, idx) => (
              <div key={`custom-${idx}`} className="flex flex-col gap-2">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">{customCategory.name}</label>
                <div className="flex flex-wrap gap-2">
                  {customCategory.options.map((optName) => {
                    const isSelected = customSelections[customCategory.name] === optName;
                    return (
                      <button
                        key={optName}
                        type="button"
                        onClick={() => setCustomSelections(prev => ({...prev, [customCategory.name]: optName}))}
                        className={`py-2 px-3 min-w-[70px] rounded-xl text-[10px] font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                        }`}
                      >
                        {optName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

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

      {/* Inline Cart Customization Modal */}
      <Dialog isOpen={!!editingCartItem} onClose={() => setEditingCartItem(null)} title="Add Special Note">
        {editingCartItem && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Quick Options</label>
              <div className="flex flex-wrap gap-2">
                {['Zero Spice', 'Medium Spicy', 'Full Spicy', 'No Dhaniya', 'No Onion', 'No Garlic', 'No Oil', 'No Butter', 'Less Butter'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      setEditingNotes(prev => {
                        const parts = prev.split(',').map(s => s.trim()).filter(Boolean);
                        if (!parts.includes(chip)) parts.push(chip);
                        return parts.join(', ');
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Custom Note</label>
              <input
                type="text"
                placeholder="e.g. cut into two pieces..."
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-400 focus:border-zinc-400"
              />
            </div>
            <div className="flex gap-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <Button variant="outline" className="flex-1 py-2.5 text-xs" onClick={() => setEditingCartItem(null)}>Cancel</Button>
              <Button className="flex-1 py-2.5 text-xs font-bold" onClick={handleSaveCartItemNotes}>Save Note</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
