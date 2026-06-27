'use client';

import React, { useState, useTransition } from 'react';
import { Category, MenuItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { saveMenuItemAction, deleteMenuItemAction } from '@/actions/menu';
import { saveCategoryAction, deleteCategoryAction } from '@/actions/categories';
import { formatCurrency } from '@/utils/format';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { menuItemSchema, MenuItemInput, categorySchema, CategoryInput } from '@/schemas/menu';
import { Search, Plus, Edit2, Trash2, Check, X, Filter, FolderPlus, Utensils } from 'lucide-react';

interface MenuManagerProps {
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
  currencySymbol: string;
}

export default function MenuManager({ initialCategories, initialMenuItems, currencySymbol }: MenuManagerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Lists state
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  // 1. Zod Form: Menu Item
  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItemForm,
    setValue: setItemValue,
    formState: { errors: itemErrors },
  } = useForm<MenuItemInput>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      category_id: categories.length > 0 ? categories[0].id : 0,
      name: '',
      description: '',
      price: 0,
      image_url: '',
      is_available: true,
      is_veg: true,
      preparation_time: 15,
    },
  });

  // 2. Zod Form: Category
  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategoryForm,
    setValue: setCategoryValue,
    formState: { errors: categoryErrors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Filtered menu items list
  const filteredItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Open modals for add/edit
  const openAddItemModal = () => {
    setEditingItemId(null);
    resetItemForm({
      category_id: categories.length > 0 ? categories[0].id : 0,
      name: '',
      description: '',
      price: 0,
      image_url: '',
      is_available: true,
      is_veg: true,
      preparation_time: 15,
    });
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItemId(item.id);
    resetItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_veg: item.is_veg,
      preparation_time: item.preparation_time || 15,
    });
    setIsItemModalOpen(true);
  };

  const openAddCategoryModal = () => {
    setEditingCategoryId(null);
    resetCategoryForm({
      name: '',
      description: '',
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategoryId(cat.id);
    resetCategoryForm({
      name: cat.name,
      description: cat.description || '',
    });
    setIsCategoryModalOpen(true);
  };

  // Submit operations
  const onItemSubmit = async (data: MenuItemInput) => {
    const res = await saveMenuItemAction(editingItemId, data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(editingItemId ? 'Menu item updated.' : 'Menu item created.', 'success');
      setIsItemModalOpen(false);
      
      // Update UI state locally instead of full refresh
      startTransition(() => {
        // Trigger server data fetching by pushing router states or just reload data state.
        // For simplicity, we just reload the page or update locally. RevalidatePath took care of server cache!
        window.location.reload();
      });
    }
  };

  const onCategorySubmit = async (data: CategoryInput) => {
    const res = await saveCategoryAction(editingCategoryId, data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(editingCategoryId ? 'Category updated.' : 'Category created.', 'success');
      setIsCategoryModalOpen(false);
      window.location.reload();
    }
  };

  const onDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    const res = await deleteMenuItemAction(id);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Item deleted.', 'info');
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const onDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    const res = await deleteCategoryAction(id);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Category deleted.', 'info');
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Menu Management</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage food categories, pricing, and ingredients configurations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddCategoryModal} variant="outline" className="text-xs bg-white dark:bg-zinc-900">
            <FolderPlus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
          <Button onClick={openAddItemModal} className="text-xs font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Add Menu Item
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-850 pb-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'items'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Menu Items ({menuItems.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'categories'
              ? 'text-zinc-950 dark:text-zinc-50 border-b-2 border-zinc-950 dark:border-zinc-100'
              : 'text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {/* 1. MENU ITEMS TAB */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-5">
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-450" />
              <input
                type="text"
                placeholder="Search food by name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              />
            </div>
          </div>

          {/* List display */}
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Prep. Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-zinc-400">
                      No menu items found. Click &ldquo;Add Menu Item&rdquo; to create.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                      <td className="px-6 py-4.5 flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                          item.is_veg ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-550' : 'bg-red-550'}`} />
                        </span>
                        <div>
                          <p className="font-bold text-zinc-850 dark:text-zinc-200">{item.name}</p>
                          {item.description && (
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-sm truncate mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-zinc-550 dark:text-zinc-400">
                        {item.category_name}
                      </td>
                      <td className="px-6 py-4.5 font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(item.price, currencySymbol === '$' ? 'USD' : 'INR')}
                      </td>
                      <td className="px-6 py-4.5 text-zinc-400">
                        {item.preparation_time ? `${item.preparation_time} mins` : '15 mins'}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          item.is_available 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                            : 'bg-red-50 dark:bg-red-950/20 text-red-500'
                        }`}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button
                            onClick={() => openEditItemModal(item)}
                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-250 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Delete Item"
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
        </div>
      )}

      {/* 2. CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-zinc-400">
                    No categories found. Click &ldquo;Add Category&rdquo; to create.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-550 dark:text-zinc-400">
                      {cat.description || 'No description provided.'}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => openEditCategoryModal(cat)}
                          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-250 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                          title="Delete Category"
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

      {/* 3. DIALOG: MENU ITEM FORM */}
      <Dialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItemId ? 'Modify Menu Item' : 'New Menu Item'}
      >
        <form onSubmit={handleSubmitItem(onItemSubmit)} className="flex flex-col gap-4">
          <Input
            label="Product Name"
            type="text"
            placeholder="e.g. Masala Dosa"
            error={itemErrors.name?.message}
            {...registerItem('name')}
          />

          <Select
            label="Category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            error={itemErrors.category_id?.message}
            {...registerItem('category_id', { valueAsNumber: true })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (INR)"
              type="number"
              step="0.01"
              placeholder="120"
              error={itemErrors.price?.message}
              {...registerItem('price', { valueAsNumber: true })}
            />
            <Input
              label="Prep. Time (Mins)"
              type="number"
              placeholder="15"
              error={itemErrors.preparation_time?.message}
              {...registerItem('preparation_time', { valueAsNumber: true })}
            />
          </div>

          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Short text describing ingredients or portion size..."
              {...registerItem('description')}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Veg vs Non-Veg Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_veg"
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                {...registerItem('is_veg')}
              />
              <label htmlFor="is_veg" className="text-xs font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                Vegetarian Item
              </label>
            </div>

            {/* Is Available Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_available"
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                {...registerItem('is_available')}
              />
              <label htmlFor="is_available" className="text-xs font-bold text-zinc-650 dark:text-zinc-300 cursor-pointer">
                In Stock &amp; Active
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full mt-4 py-3 text-xs font-bold" isLoading={isPending}>
            {editingItemId ? 'Save Changes' : 'Create Product'}
          </Button>
        </form>
      </Dialog>

      {/* 4. DIALOG: CATEGORY FORM */}
      <Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategoryId ? 'Modify Category' : 'New Category'}
      >
        <form onSubmit={handleSubmitCategory(onCategorySubmit)} className="flex flex-col gap-4">
          <Input
            label="Category Name"
            type="text"
            placeholder="e.g. Beverages, Starters"
            error={categoryErrors.name?.message}
            {...registerCategory('name')}
          />

          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Short text describing this category..."
              {...registerCategory('description')}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all h-20 resize-none"
            />
          </div>

          <Button type="submit" className="w-full mt-4 py-3 text-xs font-bold" isLoading={isPending}>
            {editingCategoryId ? 'Save Changes' : 'Create Category'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
