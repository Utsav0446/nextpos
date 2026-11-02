'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { InventoryItem, Supplier, PurchaseRecord } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { 
  saveInventoryItemAction, deleteInventoryItemAction,
  saveSupplierAction, deleteSupplierAction,
  recordPurchaseAction 
} from '@/actions/inventory';
import { formatCurrency, formatDateOnly } from '@/utils/format';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  inventoryItemSchema, InventoryItemInput, 
  supplierSchema, SupplierInput, 
  purchaseRecordSchema, PurchaseRecordInput 
} from '@/schemas/inventory';
import { Search, Plus, Edit2, Trash2, ShoppingCart, UserCheck, Package, AlertTriangle } from 'lucide-react';

interface InventoryManagerProps {
  initialItems: InventoryItem[];
  initialSuppliers: Supplier[];
  initialPurchases: PurchaseRecord[];
  currencySymbol: string;
}

export default function InventoryManager({
  initialItems,
  initialSuppliers,
  initialPurchases,
  currencySymbol,
}: InventoryManagerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases' | 'suppliers'>('inventory');
  
  // Lists states
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(initialPurchases);

  // Search/Filters
  const [itemSearch, setItemSearch] = useState('');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

  // 1. Zod Form: Inventory Item
  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItemForm,
    formState: { errors: itemErrors },
  } = useForm<InventoryItemInput>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: '',
      stock_quantity: 0,
      unit: 'kg',
      low_stock_threshold: 5,
      supplier_id: null,
    },
  });

  // 2. Zod Form: Supplier
  const {
    register: registerSupplier,
    handleSubmit: handleSubmitSupplier,
    reset: resetSupplierForm,
    formState: { errors: supplierErrors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  // 3. Zod Form: Purchase Record
  const {
    register: registerPurchase,
    handleSubmit: handleSubmitPurchase,
    reset: resetPurchaseForm,
    formState: { errors: purchaseErrors },
  } = useForm<PurchaseRecordInput>({
    resolver: zodResolver(purchaseRecordSchema),
    defaultValues: {
      inventory_id: items.length > 0 ? items[0].id : 0,
      supplier_id: suppliers.length > 0 ? suppliers[0].id : null,
      quantity: 0,
      unit_price: 0,
      purchase_date: new Date().toISOString().split('T')[0],
    },
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [items, itemSearch]);

  // Open modals
  const openAddItemModal = () => {
    setEditingItemId(null);
    resetItemForm({
      name: '',
      stock_quantity: 0,
      unit: 'kg',
      low_stock_threshold: 5,
      supplier_id: null,
    });
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    resetItemForm({
      name: item.name,
      stock_quantity: Number(item.stock_quantity),
      unit: item.unit,
      low_stock_threshold: Number(item.low_stock_threshold),
      supplier_id: item.supplier_id || null,
    });
    setIsItemModalOpen(true);
  };

  const openAddSupplierModal = () => {
    setEditingSupplierId(null);
    resetSupplierForm({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
    });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    resetSupplierForm({
      name: sup.name,
      contact_name: sup.contact_name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
    });
    setIsSupplierModalOpen(true);
  };

  const openPurchaseModal = () => {
    resetPurchaseForm({
      inventory_id: items.length > 0 ? items[0].id : 0,
      supplier_id: suppliers.length > 0 ? suppliers[0].id : null,
      quantity: 0,
      unit_price: 0,
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setIsPurchaseModalOpen(true);
  };

  // Actions
  const onItemSubmit = async (data: InventoryItemInput) => {
    const res = await saveInventoryItemAction(editingItemId, data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(editingItemId ? 'Ingredient updated.' : 'Ingredient created.', 'success');
      setIsItemModalOpen(false);
      window.location.reload();
    }
  };

  const onSupplierSubmit = async (data: SupplierInput) => {
    const res = await saveSupplierAction(editingSupplierId, data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(editingSupplierId ? 'Supplier profile updated.' : 'Supplier profile created.', 'success');
      setIsSupplierModalOpen(false);
      window.location.reload();
    }
  };

  const onPurchaseSubmit = async (data: PurchaseRecordInput) => {
    const res = await recordPurchaseAction(data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Purchase logged. Stock quantity updated successfully.', 'success');
      setIsPurchaseModalOpen(false);
      window.location.reload();
    }
  };

  const onDeleteItem = async (id: number) => {
    if (!window.confirm('Remove this ingredient from catalog?')) return;
    const res = await deleteInventoryItemAction(id);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Ingredient deleted.', 'info');
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const onDeleteSupplier = async (id: number) => {
    if (!window.confirm('Delete this supplier profile?')) return;
    const res = await deleteSupplierAction(id);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Supplier profile deleted.', 'info');
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Inventory &amp; Suppliers</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Track ingredient stock weights, supplier cards, and batch purchase audits.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'inventory' && (
            <Button onClick={openAddItemModal} variant="outline" className="text-xs bg-white dark:bg-zinc-900">
              <Plus className="w-4 h-4 mr-1.5" /> Add Ingredient
            </Button>
          )}
          {activeTab === 'suppliers' && (
            <Button onClick={openAddSupplierModal} variant="outline" className="text-xs bg-white dark:bg-zinc-900">
              <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
            </Button>
          )}
          <Button onClick={openPurchaseModal} className="text-xs font-semibold">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Record Stock Purchase
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-850 pb-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'inventory'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Stock Catalog ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'purchases'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Purchase Audit History ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'suppliers'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>
      </div>

      {/* 1. INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="flex flex-col gap-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-450" />
            <input
              type="text"
              placeholder="Search ingredients catalog..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="px-6 py-4">Ingredient Name</th>
                  <th className="px-6 py-4">Current Stock</th>
                  <th className="px-6 py-4">Safety Level</th>
                  <th className="px-6 py-4">Primary Supplier</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-zinc-400">No ingredients cataloged.</td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = Number(item.stock_quantity) <= Number(item.low_stock_threshold);
                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                        <td className="px-6 py-4.5">
                          <p className="font-bold text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
                            {item.name}
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-50" />}
                          </p>
                        </td>
                        <td className="px-6 py-4.5 font-bold">
                          <span className={isLow ? 'text-red-500 font-extrabold' : 'text-zinc-900 dark:text-zinc-100'}>
                            {item.stock_quantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-zinc-400">
                          {item.low_stock_threshold} {item.unit} threshold
                        </td>
                        <td className="px-6 py-4.5 text-zinc-500">
                          {item.supplier_name || 'Generic / Walk-in buy'}
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <div className="flex justify-end gap-2.5">
                            <button
                              onClick={() => openEditItemModal(item)}
                              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-250 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PURCHASES TAB */}
      {activeTab === 'purchases' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <th className="px-6 py-4">Purchase Date</th>
                <th className="px-6 py-4">Ingredient Name</th>
                <th className="px-6 py-4">Quantity Bought</th>
                <th className="px-6 py-4">Unit Cost</th>
                <th className="px-6 py-4">Total Cost</th>
                <th className="px-6 py-4">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-400">No purchases registered.</td>
                </tr>
              ) : (
                purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                    <td className="px-6 py-4.5 text-zinc-800 dark:text-zinc-200 font-semibold">
                      {formatDateOnly(pur.purchase_date)}
                    </td>
                    <td className="px-6 py-4.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {pur.inventory_name}
                    </td>
                    <td className="px-6 py-4.5">
                      {pur.quantity} units
                    </td>
                    <td className="px-6 py-4.5 text-zinc-400">
                      {formatCurrency(pur.unit_price, currencySymbol === '$' ? 'USD' : 'INR')}
                    </td>
                    <td className="px-6 py-4.5 font-bold text-red-650 dark:text-red-400">
                      -{formatCurrency(pur.total_cost || pur.total_price || 0, currencySymbol === '$' ? 'USD' : 'INR')}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-500">
                      {pur.supplier_name || 'Generic / Walk-in buy'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Contact Person</th>
                <th className="px-6 py-4">Contact Channels</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-zinc-400">No supplier profiles found.</td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {sup.name}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-550 dark:text-zinc-400">
                      {sup.contact_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4.5">
                      <p className="font-semibold text-zinc-850 dark:text-zinc-200">{sup.phone || 'N/A'}</p>
                      {sup.email && <p className="text-[10px] text-zinc-400 mt-0.5">{sup.email}</p>}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-400 max-w-xs truncate">
                      {sup.address || 'N/A'}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => openEditSupplierModal(sup)}
                          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-250 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteSupplier(sup.id)}
                          className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DIALOG: INGREDIENT FORM */}
      <Dialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItemId ? 'Modify Ingredient' : 'New Ingredient Catalog'}
      >
        <form onSubmit={handleSubmitItem(onItemSubmit)} className="flex flex-col gap-4">
          <Input
            label="Ingredient Name"
            type="text"
            placeholder="e.g. Basmati Rice, Amul Milk"
            error={itemErrors.name?.message}
            {...registerItem('name')}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Opening Stock"
                type="number"
                step="0.01"
                placeholder="100"
                error={itemErrors.stock_quantity?.message}
                {...registerItem('stock_quantity', { valueAsNumber: true })}
              />
            </div>
            <Input
              label="Weight Unit"
              type="text"
              placeholder="kg, L, pack"
              error={itemErrors.unit?.message}
              {...registerItem('unit')}
            />
          </div>

          <Input
            label="Low Stock Safety Threshold"
            type="number"
            placeholder="10"
            error={itemErrors.low_stock_threshold?.message}
            {...registerItem('low_stock_threshold', { valueAsNumber: true })}
          />

          <Select
            label="Default Supplier"
            options={[
              { value: '', label: 'Select Default Supplier' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            error={itemErrors.supplier_id?.message}
            {...registerItem('supplier_id', {
              setValueAs: (v) => (v === '' ? null : Number(v)),
            })}
          />

          <Button type="submit" className="w-full mt-4 py-3 text-xs font-bold" isLoading={isPending}>
            {editingItemId ? 'Save Changes' : 'Catalog Ingredient'}
          </Button>
        </form>
      </Dialog>

      {/* DIALOG: SUPPLIER FORM */}
      <Dialog
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={editingSupplierId ? 'Modify Supplier Profile' : 'New Supplier Profile'}
      >
        <form onSubmit={handleSubmitSupplier(onSupplierSubmit)} className="flex flex-col gap-4">
          <Input
            label="Company Name"
            type="text"
            placeholder="e.g. Metro Wholesale Foods"
            error={supplierErrors.name?.message}
            {...registerSupplier('name')}
          />
          <Input
            label="Contact Person Name"
            type="text"
            placeholder="e.g. Ramesh Kumar"
            error={supplierErrors.contact_name?.message}
            {...registerSupplier('contact_name')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+91 99999 88888"
              error={supplierErrors.phone?.message}
              {...registerSupplier('phone')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="sales@metrowholesale.com"
              error={supplierErrors.email?.message}
              {...registerSupplier('email')}
            />
          </div>
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Office Address</label>
            <textarea
              placeholder="Warehouse location, street name, pincode..."
              {...registerSupplier('address')}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all h-20 resize-none"
            />
          </div>

          <Button type="submit" className="w-full mt-4 py-3 text-xs font-bold" isLoading={isPending}>
            {editingSupplierId ? 'Save Changes' : 'Save Supplier'}
          </Button>
        </form>
      </Dialog>

      {/* DIALOG: PURCHASE FORM */}
      <Dialog
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Record Stock Purchase"
      >
        <form onSubmit={handleSubmitPurchase(onPurchaseSubmit)} className="flex flex-col gap-4">
          <Select
            label="Select Ingredient"
            options={items.map((i) => ({ value: i.id, label: `${i.name} (${i.stock_quantity} ${i.unit} in stock)` }))}
            error={purchaseErrors.inventory_id?.message}
            {...registerPurchase('inventory_id', { valueAsNumber: true })}
          />

          <Select
            label="Select Supplier"
            options={[
              { value: '', label: 'Walk-In Purchase (No supplier profile)' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            error={purchaseErrors.supplier_id?.message}
            {...registerPurchase('supplier_id', {
              setValueAs: (v) => (v === '' ? null : Number(v)),
            })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity Purchased"
              type="number"
              step="0.01"
              placeholder="50"
              error={purchaseErrors.quantity?.message}
              {...registerPurchase('quantity', { valueAsNumber: true })}
            />
            <Input
              label="Unit Cost (INR)"
              type="number"
              step="0.01"
              placeholder="75.00"
              error={purchaseErrors.unit_price?.message}
              {...registerPurchase('unit_price', { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Purchase Date"
            type="date"
            error={purchaseErrors.purchase_date?.message}
            {...registerPurchase('purchase_date')}
          />

          <p className="text-[10px] text-zinc-400 leading-normal italic">
            * Submitting this form automatically logs a matching Vegetables / Groceries expense outflow in the database, and increments the stock weight parameters inside the inventory catalog.
          </p>

          <Button type="submit" className="w-full mt-2 py-3 text-xs font-bold" isLoading={isPending}>
            Collect &amp; Record Stock
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
