'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Menu as MenuIcon, 
  ArrowLeft, 
  Utensils, 
  Equal
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface MenuManagerProps {
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
  currencySymbol: string;
}

interface VariantRow {
  name: string;
  price: number;
}

interface InstructionItem {
  id: string;
  text: string;
}

const DEFAULT_INSTRUCTIONS: InstructionItem[] = [
  { id: '1', text: 'No Garlic' },
  { id: '2', text: 'Full Spicy' },
  { id: '3', text: '0 Spicy' },
  { id: '4', text: 'Medium Spicy' },
  { id: '5', text: 'Jain' },
  { id: '6', text: 'No Coriander' },
  { id: '7', text: 'No Oil' },
  { id: '8', text: 'Less Butter' }
];

export default function MenuManager({ initialCategories, initialMenuItems, currencySymbol }: MenuManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  // View mode: 'all' | 'instructions' | 'categories'
  const [viewMode, setViewMode] = useState<'all' | 'instructions' | 'categories'>('all');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Search Items state in 'all' view
  const [itemsSearchQuery, setItemsSearchQuery] = useState('');

  // Active Category Tab state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(() => 
    initialCategories.length > 0 ? initialCategories[0].id : 0
  );

  // Cooking Instructions State
  const [instructions, setInstructions] = useState<InstructionItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_cooking_instructions');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return DEFAULT_INSTRUCTIONS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_cooking_instructions', JSON.stringify(instructions));
    }
  }, [instructions]);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingInstructionId, setEditingInstructionId] = useState<string | null>(null);
  const [instructionInputText, setInstructionInputText] = useState('');

  // Variants state for Item Modal
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [variantsList, setVariantsList] = useState<VariantRow[]>([
    { name: 'Schezwan Chutney', price: 30 },
    { name: 'Garlic Chutney', price: 30 },
    { name: 'Soft Paper', price: 0 },
    { name: 'Medium Paper', price: 0 },
    { name: 'Kadak Paper', price: 0 }
  ]);

  // Selected Category Object
  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId) || categories[0] || null;
  }, [categories, selectedCategoryId]);

  // Filtered menu items for selected category and search query
  const activeCategoryItems = useMemo(() => {
    let items = menuItems;
    if (selectedCategoryId) {
      items = items.filter(item => item.category_id === selectedCategoryId);
    }
    if (itemsSearchQuery.trim()) {
      const query = itemsSearchQuery.toLowerCase().trim();
      items = items.filter(i => 
        i.name.toLowerCase().includes(query) ||
        (i.name_gu && i.name_gu.toLowerCase().includes(query)) ||
        (i.name_hi && i.name_hi.toLowerCase().includes(query))
      );
    }
    return items;
  }, [menuItems, selectedCategoryId, itemsSearchQuery]);

  // Forms
  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItemForm,
    watch: watchItem,
    formState: { errors: itemErrors },
  } = useForm<MenuItemInput>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      category_id: selectedCategoryId || (categories[0]?.id ?? 0),
      name: '',
      name_gu: '',
      name_hi: '',
      description: '',
      description_gu: '',
      description_hi: '',
      price: 0,
      image_url: '',
      is_available: true,
      is_veg: true,
      preparation_time: 15,
      allow_spice: true,
      allow_prep: true,
      allow_notes: true,
      allow_texture: false,
      default_spice: 'Regular',
      default_prep: 'Regular',
      default_texture: 'Regular',
      show_popup: true,
      allow_sitting: true,
      allow_parcel: true,
      custom_options: [],
    },
  });

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategoryForm,
    formState: { errors: categoryErrors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      name_gu: '',
      name_hi: '',
      description: '',
      description_gu: '',
      description_hi: '',
    },
  });

  // Open Item Modal
  const openAddItemModal = () => {
    setEditingItemId(null);
    setHasVariants(false);
    setVariantsList([
      { name: 'Half', price: 0 },
      { name: 'Full', price: 0 }
    ]);
    resetItemForm({
      category_id: selectedCategoryId || (categories[0]?.id ?? 0),
      name: '',
      name_gu: '',
      name_hi: '',
      description: '',
      description_gu: '',
      description_hi: '',
      price: 0,
      image_url: '',
      is_available: true,
      is_veg: true,
      preparation_time: 15,
      allow_spice: true,
      allow_prep: true,
      allow_notes: true,
      allow_texture: false,
      default_spice: 'Regular',
      default_prep: 'Regular',
      default_texture: 'Regular',
      show_popup: true,
      allow_sitting: true,
      allow_parcel: true,
      custom_options: [],
    });
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItemId(item.id);
    const itemHasVars = item.has_variants ?? (item.variants && item.variants.length > 0) ?? false;
    setHasVariants(itemHasVars);
    if (item.variants && item.variants.length > 0) {
      setVariantsList(item.variants);
    } else {
      setVariantsList([
        { name: 'Schezwan Chutney', price: 30 },
        { name: 'Garlic Chutney', price: 30 },
        { name: 'Soft Paper', price: 0 },
        { name: 'Medium Paper', price: 0 },
        { name: 'Kadak Paper', price: 0 }
      ]);
    }

    resetItemForm({
      category_id: item.category_id,
      name: item.name,
      name_gu: item.name_gu || '',
      name_hi: item.name_hi || '',
      description: item.description || '',
      description_gu: item.description_gu || '',
      description_hi: item.description_hi || '',
      price: Number(item.price) || 0,
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_veg: item.is_veg,
      preparation_time: item.preparation_time || 15,
      allow_spice: item.allow_spice ?? true,
      allow_prep: item.allow_prep ?? true,
      allow_notes: item.allow_notes ?? true,
      allow_texture: item.allow_texture ?? false,
      default_spice: item.default_spice || 'Regular',
      default_prep: item.default_prep || 'Regular',
      default_texture: item.default_texture || 'Regular',
      show_popup: item.show_popup ?? true,
      allow_sitting: item.allow_sitting ?? true,
      allow_parcel: item.allow_parcel ?? true,
      custom_options: item.custom_options || [],
    });
    setIsItemModalOpen(true);
  };

  // Open Category Modal
  const openAddCategoryModal = () => {
    setEditingCategoryId(null);
    resetCategoryForm({
      name: '',
      name_gu: '',
      name_hi: '',
      description: '',
      description_gu: '',
      description_hi: '',
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategoryId(cat.id);
    resetCategoryForm({
      name: cat.name,
      name_gu: cat.name_gu || '',
      name_hi: cat.name_hi || '',
      description: cat.description || '',
      description_gu: cat.description_gu || '',
      description_hi: cat.description_hi || '',
    });
    setIsCategoryModalOpen(true);
  };

  // Open Cooking Instruction Modal
  const openAddInstructionModal = () => {
    setEditingInstructionId(null);
    setInstructionInputText('');
    setIsInstructionModalOpen(true);
  };

  const openEditInstructionModal = (inst: InstructionItem) => {
    setEditingInstructionId(inst.id);
    setInstructionInputText(inst.text);
    setIsInstructionModalOpen(true);
  };

  const handleInstructionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructionInputText.trim()) return;
    if (editingInstructionId) {
      setInstructions(prev => prev.map(i => i.id === editingInstructionId ? { ...i, text: instructionInputText.trim() } : i));
      toast('Instruction updated.', 'success');
    } else {
      const newItem: InstructionItem = { id: Date.now().toString(), text: instructionInputText.trim() };
      setInstructions(prev => [...prev, newItem]);
      toast('Instruction added.', 'success');
    }
    setIsInstructionModalOpen(false);
  };

  const handleDeleteInstruction = (id: string) => {
    if (!window.confirm('Delete this instruction?')) return;
    setInstructions(prev => prev.filter(i => i.id !== id));
    toast('Instruction removed.', 'info');
  };

  // Submit Operations
  const onItemSubmit = async (data: MenuItemInput) => {
    const payload: any = {
      ...data,
      name_gu: data.name_gu || data.name,
      name_hi: data.name_hi || data.name,
      category_id: selectedCategoryId || data.category_id,
      has_variants: hasVariants,
      variants: hasVariants ? variantsList.filter(v => v.name.trim() !== '') : [],
    };

    const res = await saveMenuItemAction(editingItemId, payload);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(editingItemId ? 'Menu item updated.' : 'Menu item created.', 'success');
      setIsItemModalOpen(false);
      startTransition(() => {
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
      startTransition(() => {
        window.location.reload();
      });
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
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 relative">
      {/* 1. TERRACOTTA HEADER MATCHING ALL SCREENSHOTS */}
      <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between shadow-md relative z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (viewMode !== 'all') {
                setViewMode('all');
              } else {
                router.back();
              }
            }} 
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold tracking-tight">
            {viewMode === 'all' && 'Menu Management'}
            {viewMode === 'instructions' && 'Cooking Instructions'}
            {viewMode === 'categories' && 'Menu Categories'}
          </h1>
        </div>

        <div className="flex items-center gap-3 relative">
          <button 
            onClick={() => window.location.reload()} 
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Hamburger ≡ Button */}
          <button 
            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Menu Options"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* SCREENSHOT 2: TOP RIGHT DROPDOWN MENU */}
          {isHeaderMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsHeaderMenuOpen(false)} 
              />
              <div className="absolute right-0 top-11 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setViewMode('all');
                    setIsHeaderMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 font-bold transition-colors ${
                    viewMode === 'all' ? 'text-[#8B3A36] bg-zinc-50 dark:bg-zinc-800/60' : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  All Menu
                </button>
                <button
                  onClick={() => {
                    setViewMode('instructions');
                    setIsHeaderMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 font-bold transition-colors ${
                    viewMode === 'instructions' ? 'text-[#8B3A36] bg-zinc-50 dark:bg-zinc-800/60' : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  Cooking Instructions
                </button>
                <button
                  onClick={() => {
                    setViewMode('categories');
                    setIsHeaderMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 font-bold transition-colors ${
                    viewMode === 'categories' ? 'text-[#8B3A36] bg-zinc-50 dark:bg-zinc-800/60' : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  Menu Categories
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* VIEW 1: ALL MENU */}
      {viewMode === 'all' && (
        <>
          {/* Category Tabs Bar */}
          <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-6 whitespace-nowrap min-w-max">
              {categories.map((cat) => {
                const isActive = cat.id === selectedCategoryId;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`py-3 px-1 text-xs font-bold transition-all relative ${
                      isActive
                        ? 'text-[#673AB7] dark:text-purple-400 border-b-2 border-[#673AB7] dark:border-purple-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SCREENSHOT 2: Search Items Bar */}
          <div className="p-4 max-w-4xl mx-auto w-full pb-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Items"
                value={itemsSearchQuery}
                onChange={(e) => setItemsSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 pl-8 pr-4 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-[#8B3A36]"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-1 top-2.5" />
            </div>
          </div>

          {/* Items List */}
          <div className="p-4 flex flex-col gap-3 max-w-4xl mx-auto w-full">
            {activeCategoryItems.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                <Utensils className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No menu items found in &ldquo;{activeCategory?.name || 'Category'}&rdquo;.</p>
                <p className="text-[10px] text-zinc-500 mt-1">Tap the &ldquo;+&rdquo; button at bottom right to add a menu item.</p>
              </div>
            ) : (
              activeCategoryItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#673AB7] dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Utensils className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {item.name_gu || item.name}
                        {item.allow_sitting === false && (
                          <span className="text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                            Parcel Only
                          </span>
                        )}
                        {item.allow_parcel === false && (
                          <span className="text-[9px] font-extrabold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-1.5 py-0.5 rounded-md border border-sky-200/60 dark:border-sky-900/40">
                            Sitting Only
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {formatCurrency(item.price, currencySymbol === '$' ? 'USD' : 'INR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400">
                    <button
                      onClick={() => openEditItemModal(item)}
                      className="p-1.5 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 hover:text-red-500 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <span className="p-1 text-zinc-400 cursor-grab">
                      <Equal className="w-5 h-5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FAB + Button */}
          <button
            onClick={openAddItemModal}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-[#7E57C2] hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-40"
            title={`Add menu item to "${activeCategory?.name || 'Category'}"`}
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </>
      )}

      {/* VIEW 2: SCREENSHOT 1 - COOKING INSTRUCTIONS */}
      {viewMode === 'instructions' && (
        <div className="p-4 max-w-4xl mx-auto w-full flex flex-col gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-xs">
            {instructions.map((inst) => (
              <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{inst.text}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditInstructionModal(inst)}
                    className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteInstruction(inst.id)}
                    className="p-1.5 text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* FAB + Button for Instructions */}
          <button
            onClick={openAddInstructionModal}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-[#7E57C2] hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-40"
            title="Add Cooking Instruction"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      )}

      {/* VIEW 3: SCREENSHOT 3 - MENU CATEGORIES */}
      {viewMode === 'categories' && (
        <div className="p-4 max-w-4xl mx-auto w-full flex flex-col gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-xs">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      App: {cat.name_gu || cat.name} • Status: Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditCategoryModal(cat)}
                    className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <span className="p-1 text-zinc-400 cursor-grab">
                    <Equal className="w-5 h-5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* FAB + Button for Categories */}
          <button
            onClick={openAddCategoryModal}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-[#7E57C2] hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-40"
            title="Add Category"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      )}

      {/* SCREENSHOT 4: EDIT / ADD ITEM MODAL WITH VARIANTS */}
      <Dialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title=""
      >
        <div className="p-2 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 text-left">
            {editingItemId 
              ? `Edit "${watchItem('name_gu') || watchItem('name') || 'Item'}"`
              : `Add menu item to "${activeCategory?.name || 'Category'}" category`}
          </h2>

          <form onSubmit={handleSubmitItem(onItemSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select Menu Item"
                  {...registerItem('name')}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-300 dark:border-zinc-700 px-3 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#673AB7]"
                  required
                />
                <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Gujarati Name (એક્સ્ટ્રા ચટણી)"
                {...registerItem('name_gu')}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="Hindi Name (एक्स्ट्रा चटनी)"
                {...registerItem('name_hi')}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            {/* Base Price & Variants Toggle Switch */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex-1 flex flex-col">
                <label className="text-[11px] font-semibold text-zinc-500">Base price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...registerItem('price', { valueAsNumber: true })}
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#673AB7]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Variants</span>
                <button
                  type="button"
                  onClick={() => setHasVariants(!hasVariants)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    hasVariants ? 'bg-[#7E57C2]' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                      hasVariants ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SCREENSHOT 4: Dynamic Variant Rows with Price & Trash Can */}
            {hasVariants && (
              <div className="flex flex-col gap-2.5 mt-2">
                {variantsList.map((vRow, idx) => (
                  <div key={idx} className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <input
                      type="text"
                      placeholder="Variant Name"
                      value={vRow.name}
                      onChange={(e) => {
                        const updated = [...variantsList];
                        updated[idx].name = e.target.value;
                        setVariantsList(updated);
                      }}
                      className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={vRow.price}
                      onChange={(e) => {
                        const updated = [...variantsList];
                        updated[idx].price = Number(e.target.value) || 0;
                        setVariantsList(updated);
                      }}
                      className="w-20 text-right bg-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setVariantsList(variantsList.filter((_, i) => i !== idx))}
                      className="text-zinc-500 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-700 dark:text-zinc-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}

                {/* + Add Variant Link */}
                <button
                  type="button"
                  onClick={() => setVariantsList([...variantsList, { name: '', price: 0 }])}
                  className="text-xs font-bold text-[#673AB7] hover:underline self-center mt-1 flex items-center gap-1"
                >
                  + Add Variant
                </button>
              </div>
            )}

            {/* Order Channel Availability: Sitting vs Parcel */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Available In Channels</label>
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...registerItem('allow_sitting')}
                    className="w-4 h-4 rounded accent-[#7E57C2] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">🪑 Sitting (Dine-In)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...registerItem('allow_parcel')}
                    className="w-4 h-4 rounded accent-[#7E57C2] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">📦 Parcel (Takeaway)</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-5 py-2 rounded-full bg-purple-50 dark:bg-zinc-800 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2 rounded-full bg-[#7E57C2] hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* ADD / EDIT INSTRUCTION MODAL */}
      <Dialog
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        title={editingInstructionId ? 'Edit Cooking Instruction' : 'Add Cooking Instruction'}
      >
        <form onSubmit={handleInstructionSubmit} className="flex flex-col gap-4">
          <Input
            label="Instruction Text"
            placeholder="e.g. Extra Spicy, No Garlic..."
            value={instructionInputText}
            onChange={(e) => setInstructionInputText(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsInstructionModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <Button type="submit" className="text-xs font-bold">
              Save Instruction
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ADD / EDIT CATEGORY MODAL */}
      <Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategoryId ? 'Modify Category' : 'New Category'}
      >
        <form onSubmit={handleSubmitCategory(onCategorySubmit)} className="flex flex-col gap-4">
          <Input
            label="Category Name (English)"
            type="text"
            placeholder="e.g. Beverages"
            error={categoryErrors.name?.message}
            {...registerCategory('name')}
          />
          <Input
            label="Category Name (Gujarati)"
            type="text"
            placeholder="દા.ત. પીણાં"
            error={categoryErrors.name_gu?.message}
            {...registerCategory('name_gu')}
          />
          <Input
            label="Category Name (Hindi)"
            type="text"
            placeholder="जैसे: पेय पदार्थ"
            error={categoryErrors.name_hi?.message}
            {...registerCategory('name_hi')}
          />

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <Button type="submit" className="text-xs font-bold" isLoading={isPending}>
              {editingCategoryId ? 'Save Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
