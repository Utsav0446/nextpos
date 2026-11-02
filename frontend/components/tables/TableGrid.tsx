'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantTable } from '@/queries/tables';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { 
  saveTableAction, 
  deleteTableAction, 
  setTableStatusAction, 
  moveTableAction,
  mergeTablesAction,
  unmergeTablesAction,
  splitTableForSharingAction,
  rejoinSplitTablesAction
} from '@/actions/tables';

import { formatCurrency } from '@/utils/format';
import { getTables } from '@/queries/tables';
import { getRelatedOrdersForBillAction, getRecentOrdersAction, getItemWiseSalesAction, removeOrderItemAction } from '@/actions/orders';
import { Order } from '@/types';
import { 
  Utensils, 
  User, 
  Clock, 
  DollarSign, 
  Sparkles, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  HelpCircle, 
  MoveRight,
  ArrowRightLeft,
  Link2,
  Unlink2,
  Check,
  Settings,
  ArrowLeft,
  RefreshCw,
  Menu,
  Users,
  List,
  Play,
  X,
  Tag,
  Eye,
  Pencil,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

interface TableGridProps {
  initialTables: RestaurantTable[];
  currencyCode: string;
}

export default function TableGrid({ initialTables, currencyCode }: TableGridProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Occupied' | 'Dirty'>('all');

  // Modals state
  const [isRunningModalOpen, setIsRunningModalOpen] = useState(false);
  const [isStartTableModalOpen, setIsStartTableModalOpen] = useState(false);
  const [startTableTarget, setStartTableTarget] = useState<RestaurantTable | null>(null);
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitChildSeats, setSplitChildSeats] = useState(1);
  const [activeSessionOrders, setActiveSessionOrders] = useState<Order[]>([]);
  const [isLoadingActiveSession, setIsLoadingActiveSession] = useState(false);

  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [targetTableNum, setTargetTableNum] = useState('');

  // Merge mode state
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedMergeIds, setSelectedMergeIds] = useState<number[]>([]);
  const [isManageMode, setIsManageMode] = useState(false);

  // Top Right Header Menu & Modals State
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isRecentOrdersModalOpen, setIsRecentOrdersModalOpen] = useState(false);
  const [recentOrdersList, setRecentOrdersList] = useState<Order[]>([]);
  const [isLoadingRecentOrders, setIsLoadingRecentOrders] = useState(false);
  const [recentOrdersSearchTerm, setRecentOrdersSearchTerm] = useState('');
  const [isItemCountModalOpen, setIsItemCountModalOpen] = useState(false);
  const [selectedRecentOrderView, setSelectedRecentOrderView] = useState<Order | null>(null);

  // Sittings Layout Settings State matching Screenshots 1 & 2
  const [isLayoutSettingsModalOpen, setIsLayoutSettingsModalOpen] = useState(false);
  const [layoutActiveTab, setLayoutActiveTab] = useState<'THEME' | 'GENERAL'>('THEME');
  const [tablesPerRow, setTablesPerRow] = useState<number>(3);
  const [sessionManageBy, setSessionManageBy] = useState<'online' | 'offline'>('online');
  const [isPerRowDropdownOpen, setIsPerRowDropdownOpen] = useState(false);

  const handleOpenRecentOrders = async () => {
    setIsHeaderMenuOpen(false);
    setIsRecentOrdersModalOpen(true);
    setIsLoadingRecentOrders(true);
    try {
      const res = await getRecentOrdersAction(40);
      if (res.success && res.orders) {
        setRecentOrdersList(res.orders as Order[]);
      } else {
        setRecentOrdersList([]);
      }
    } catch (err) {
      setRecentOrdersList([]);
    } finally {
      setIsLoadingRecentOrders(false);
    }
  };

  const filteredRecentOrders = useMemo(() => {
    const term = recentOrdersSearchTerm.toLowerCase().trim();
    if (!term) return recentOrdersList;
    return recentOrdersList.filter(o => 
      o.id.toString().includes(term) ||
      (o.table_number && o.table_number.toLowerCase().includes(term)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(term))
    );
  }, [recentOrdersList, recentOrdersSearchTerm]);

  // Item-Wise Sales by Date State
  const [selectedItemSalesDate, setSelectedItemSalesDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [itemSalesSearchTerm, setItemSalesSearchTerm] = useState('');
  const [itemWiseSalesList, setItemWiseSalesList] = useState<{ name: string; qty: number; price: number; total: number }[]>([]);
  const [isLoadingItemSales, setIsLoadingItemSales] = useState(false);

  const fetchItemWiseSales = async (dateStr?: string) => {
    setIsLoadingItemSales(true);
    try {
      const res = await getItemWiseSalesAction(dateStr || selectedItemSalesDate);
      if (res.success && res.items) {
        setItemWiseSalesList(res.items);
      } else {
        setItemWiseSalesList([]);
      }
    } catch (err) {
      setItemWiseSalesList([]);
    } finally {
      setIsLoadingItemSales(false);
    }
  };

  const handleOpenItemWiseModal = () => {
    setIsHeaderMenuOpen(false);
    setIsItemCountModalOpen(true);
    fetchItemWiseSales(selectedItemSalesDate);
  };

  const filteredItemWiseSales = useMemo(() => {
    const term = itemSalesSearchTerm.toLowerCase().trim();
    if (!term) return itemWiseSalesList;
    return itemWiseSalesList.filter(item => item.name.toLowerCase().includes(term));
  }, [itemWiseSalesList, itemSalesSearchTerm]);

  // Table form inputs
  const [tableNumberInput, setTableNumberInput] = useState('');
  const [capacityInput, setCapacityInput] = useState(4);

  // Currency helper
  const currencySymbol = currencyCode === 'USD' ? '$' : 
                         currencyCode === 'EUR' ? '€' : 
                         currencyCode === 'GBP' ? '£' : '₹';

  // KPI Calculations
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter(t => t.status === 'Occupied').length;
    const dirty = tables.filter(t => t.status === 'Dirty').length;
    const vacant = tables.filter(t => t.status === 'Available').length;
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const activeSeatingCapacity = tables
      .filter(t => t.status === 'Occupied')
      .reduce((sum, t) => sum + t.capacity, 0);

    return { total, occupied, dirty, vacant, totalCapacity, activeSeatingCapacity };
  }, [tables]);

  // Filtered lists
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = t.table_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  // Available tables (excluding the currently active one) for Swap Select
  const availableTables = useMemo(() => {
    return tables.filter(t => t.status === 'Available' && t.id !== selectedTable?.id);
  }, [tables, selectedTable]);

  const activeSessionTotals = useMemo(() => {
    if (activeSessionOrders.length > 0) {
      const subtotal = activeSessionOrders.reduce((sum, order) => {
        const orderItemsSum = (order.items || []).reduce((iSum: number, item: any) => iSum + (Number(item.price) * (item.quantity || 1)), 0);
        return sum + (order.grand_total || order.subtotal || orderItemsSum);
      }, 0);
      return { subtotal, total: subtotal };
    }
    const fallbackTotal = selectedTable?.grand_total || 0;
    return { subtotal: fallbackTotal, total: fallbackTotal };
  }, [activeSessionOrders, selectedTable]);

  React.useEffect(() => {
    if (selectedTable?.status === 'Occupied' && selectedTable.active_order_id) {
      setIsLoadingActiveSession(true);
      getRelatedOrdersForBillAction(selectedTable.active_order_id)
        .then(res => {
          if (res.success && res.orders) {
            setActiveSessionOrders(res.orders as Order[]);
          } else {
            setActiveSessionOrders([]);
          }
        })
        .catch(() => setActiveSessionOrders([]))
        .finally(() => setIsLoadingActiveSession(false));
    } else {
      setActiveSessionOrders([]);
    }
  }, [selectedTable]);

  // Handlers
  const handleRemoveItem = async (item: any, orderId: number) => {
    if (!window.confirm(`Are you sure you want to remove '${item.name}' from this order ticket?`)) {
      return;
    }

    startTransition(async () => {
      toast(`Removing '${item.name}'...`, 'info');
      const res = await removeOrderItemAction(item.id, orderId);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`'${item.name}' removed from order ticket.`, 'success');
        if (selectedTable?.active_order_id) {
          const refreshed = await getRelatedOrdersForBillAction(selectedTable.active_order_id);
          if (refreshed.success && refreshed.orders) {
            setActiveSessionOrders(refreshed.orders as Order[]);
          } else {
            setActiveSessionOrders([]);
          }
        }
        const updatedTables = await getTables();
        setTables(updatedTables);
      }
    });
  };

  const handleOpenAddModal = () => {
    setEditingTable(null);
    setTableNumberInput('');
    setCapacityInput(4);
    setIsUpsertModalOpen(true);
  };

  const handleOpenEditModal = (table: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTable(table);
    setTableNumberInput(table.table_number);
    setCapacityInput(table.capacity);
    setIsUpsertModalOpen(true);
  };

  const handleUpsertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumberInput.trim()) {
      toast('Table number is required.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await saveTableAction(editingTable?.id || null, {
        table_number: tableNumberInput,
        capacity: capacityInput
      });

      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(editingTable ? 'Table details updated.' : 'New table added.', 'success');
        setIsUpsertModalOpen(false);
        // Refresh local state list
        window.location.reload();
      }
    });
  };

  const handleDeleteTable = async (table: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    if (table.status === 'Occupied') {
      toast('Cannot delete an occupied table.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete table '${table.table_number}'?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteTableAction(table.id);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Table '${table.table_number}' deleted successfully.`, 'info');
        setTables(prev => prev.filter(t => t.id !== table.id));
      }
    });
  };

  const handleToggleStatus = async (table: RestaurantTable, targetStatus: 'Available' | 'Dirty', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    startTransition(async () => {
      const res = await setTableStatusAction(table.id, targetStatus);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Table '${table.table_number}' is now ${targetStatus === 'Available' ? 'Available/Cleaned' : 'Dirty/Needs Cleaning'}.`, 'success');
        setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: targetStatus } : t));
        if (selectedTable?.id === table.id) {
          setSelectedTable(prev => prev ? { ...prev, status: targetStatus } : null);
        }
      }
    });
  };

  const handleOpenSwapModal = (table: RestaurantTable) => {
    setSelectedTable(table);
    setTargetTableNum(availableTables.length > 0 ? availableTables[0].table_number : '');
    setIsSwapModalOpen(true);
  };

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !selectedTable.active_order_id) return;
    if (!targetTableNum) {
      toast('Please select an available target table.', 'error');
      return;
    }

    startTransition(async () => {
      const res = await moveTableAction(selectedTable.active_order_id!, targetTableNum);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Order moved to table '${targetTableNum}' successfully.`, 'success');
        setIsSwapModalOpen(false);
        setIsDetailsModalOpen(false);
        window.location.reload();
      }
    });
  };

  const handleToggleMergeSelect = (id: number) => {
    const table = tables.find(t => t.id === id);
    if (!table) return;
    if (table.status !== 'Available') {
      toast(`Table '${table.table_number}' is occupied or dirty and cannot be merged.`, 'error');
      return;
    }
    if (table.is_merge_child || table.is_merge_primary) {
      toast(`Table '${table.table_number}' is already part of a merged group.`, 'error');
      return;
    }

    setSelectedMergeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMergeSubmit = async () => {
    if (selectedMergeIds.length < 2) {
      toast('Select at least 2 tables to merge.', 'error');
      return;
    }

    // Sort to make the lowest ID (or alphabetically first table number) the primary
    const sortedIds = [...selectedMergeIds].sort((a, b) => {
      const ta = tables.find(t => t.id === a);
      const tb = tables.find(t => t.id === b);
      if (!ta || !tb) return 0;
      return ta.table_number.localeCompare(tb.table_number, undefined, { numeric: true });
    });

    const primaryId = sortedIds[0];
    const childIds = sortedIds.slice(1);

    startTransition(async () => {
      const res = await mergeTablesAction(primaryId, childIds);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast('Tables merged successfully.', 'success');
        setIsMergeMode(false);
        setSelectedMergeIds([]);
        window.location.reload();
      }
    });
  };

  const handleUnmergeSubmit = async (primaryTableId: number) => {
    if (!window.confirm('Are you sure you want to split this merged table group?')) {
      return;
    }

    startTransition(async () => {
      const res = await unmergeTablesAction(primaryTableId);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast('Tables split successfully.', 'success');
        setIsDetailsModalOpen(false);
        window.location.reload();
      }
    });
  };

  const handleSplitSharing = async (table: RestaurantTable, childSeats: number) => {
    const totalCapacity = table.original_capacity || table.capacity;
    const primarySeats = totalCapacity - childSeats;

    if (!window.confirm(`Are you sure you want to split table ${table.table_number} for sharing? This will allocate ${childSeats} seat(s) to ${table.table_number}B and ${primarySeats} seat(s) to ${table.table_number}A.`)) {
      return;
    }

    startTransition(async () => {
      const res = await splitTableForSharingAction(table.id, childSeats);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast(`Table ${table.table_number} split for sharing successfully.`, 'success');
        setIsDetailsModalOpen(false);
        setIsSplitting(false);
        window.location.reload();
      }
    });
  };

  const handleRejoinSplit = async (table: RestaurantTable) => {
    if (!window.confirm('Are you sure you want to rejoin these split tables back into a single table?')) {
      return;
    }

    const primaryId = table.is_split_child ? table.split_from : table.id;
    if (!primaryId) return;

    startTransition(async () => {
      const res = await rejoinSplitTablesAction(primaryId);
      if (res.error) {
        toast(res.error, 'error');
      } else {
        toast('Shared tables rejoined successfully.', 'success');
        setIsDetailsModalOpen(false);
        window.location.reload();
      }
    });
  };

  const handleCardClick = (table: RestaurantTable) => {
    if (isMergeMode) {
      handleToggleMergeSelect(table.id);
      return;
    }
    let targetTable = table;
    if (table.is_merge_child) {
      const primaryTable = tables.find(t => t.table_number === table.merge_primary_number);
      if (primaryTable) {
        targetTable = primaryTable;
      } else {
        toast('Primary table not found.', 'error');
        return;
      }
    }

    if (targetTable.status === 'Dirty') {
      setSelectedTable(targetTable);
      setIsDetailsModalOpen(true);
    } else if (targetTable.status === 'Available') {
      setStartTableTarget(targetTable);
      setIsStartTableModalOpen(true);
    } else {
      router.push(`/orders?table=${targetTable.table_number}`);
    }
  };

  const runningTablesList = useMemo(() => {
    return tables.filter(t => t.status === 'Occupied');
  }, [tables]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FDF9F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans select-none">
      {/* TERRACOTTA HEADER BAR MATCHING IMAGE 1 */}
      <header className="bg-[#8B3A36] text-white px-5 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight">
            Sittings - Tables - Offline (Sync)
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Sync / Refresh Tables"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={() => setIsRunningModalOpen(true)}
            className="bg-[#2196F3] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            Running Tables
          </button>

          <div className="relative">
            <button
              onClick={() => setIsHeaderMenuOpen(prev => !prev)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Toggle Menu Options"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>

            {isHeaderMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleOpenRecentOrders}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors border-b border-zinc-100 dark:border-zinc-800/60"
                >
                  <Receipt className="w-4 h-4 text-[#8B3A36]" />
                  <span>Recent Orders</span>
                </button>

                <button
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsManageMode(prev => !prev);
                    toast(isManageMode ? 'Table management mode disabled' : 'Table management mode enabled', 'info');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors border-b border-zinc-100 dark:border-zinc-800/60"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Table Managements</span>
                </button>

                <button
                  onClick={handleOpenItemWiseModal}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors border-b border-zinc-100 dark:border-zinc-800/60"
                >
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  <span>Item Wise Count</span>
                </button>

                <button
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsLayoutSettingsModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span>Layout Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* COLOR LEGEND BAR MATCHING IMAGE 1 */}
      <div className="bg-[#FDF9F5] dark:bg-zinc-950 px-5 py-2.5 flex items-center justify-center gap-4 sm:gap-6 border-b border-zinc-200/60 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span>Blank Table</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2196F3]" />
          <span>Running Table</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Table</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Paid Table</span>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">


      {/* KPI Widgets grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tables */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Total Tables</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100">{stats.total}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Layout Blocks</span>
          </div>
        </div>

        {/* Occupied */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl flex flex-col gap-1 shadow-xs border-l-4 border-l-blue-500">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Occupied Tables</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{stats.occupied}</span>
            <span className="text-[10px] text-zinc-400 font-medium">({stats.totalCapacity > 0 ? Math.round((stats.activeSeatingCapacity / stats.totalCapacity) * 100) : 0}% Seated)</span>
          </div>
        </div>

        {/* Vacant / Available */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl flex flex-col gap-1 shadow-xs border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Vacant / Available</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.vacant}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Ready Tables</span>
          </div>
        </div>

        {/* Needs Cleaning */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl flex flex-col gap-1 shadow-xs border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Needs Cleaning</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.dirty}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Dirty Blocks</span>
          </div>
        </div>
      </div>

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search table number (e.g. T-1)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto select-none shrink-0">
          {(['all', 'Available', 'Occupied', 'Dirty'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === filter
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 text-zinc-650 dark:text-zinc-400'
              }`}
            >
              {filter === 'all' ? 'All Tables' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table Cards Grid - 3 COLUMNS MATCHING IMAGE 1 */}
      {filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 border border-dashed rounded-2xl">
          <HelpCircle className="w-10 h-10 mb-2 stroke-[1.5]" />
          <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Tables Found</p>
          <p className="text-[10px] mt-0.5">Try adjusting your search criteria or register a new table layout.</p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:gap-5" style={{ gridTemplateColumns: `repeat(${tablesPerRow}, minmax(0, 1fr))` }}>
          {filteredTables.map((table) => {
            const isAvailable = table.status === 'Available';
            const isOccupied = table.status === 'Occupied';
            const isDirty = table.status === 'Dirty';

            // Merge states
            const isSelected = selectedMergeIds.includes(table.id);
            const isSelectable = isMergeMode && isAvailable && !table.is_merge_child && !table.is_merge_primary;

            return (
              <div
                key={table.id}
                onClick={() => handleCardClick(table)}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-3 sm:gap-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-150 select-none group relative overflow-hidden ${
                  isMergeMode && !isSelectable ? 'opacity-40 grayscale pointer-events-none' : ''
                } ${
                  isMergeMode && isSelected ? 'border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/10' : ''
                } ${
                  !isMergeMode && isAvailable ? 'border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-900' : ''
                } ${
                  !isMergeMode && isOccupied ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/10 dark:bg-blue-950/5' : ''
                } ${
                  !isMergeMode && isDirty ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/5' : ''
                } ${
                  table.is_merge_child ? 'opacity-65 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/30' : ''
                }`}
              >
                {/* Status bar top */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                    {table.table_number}
                    {table.is_merge_primary && (
                      <Link2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {(table.is_split_primary || table.is_split_child) && (
                      <span className="text-[9px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-extrabold tracking-normal normal-case border border-blue-150 dark:border-blue-900/40">
                        Shared
                      </span>
                    )}
                  </span>
                  
                  {/* Status Indicator / Merge mode Selector */}
                  <div className="flex items-center gap-1.5">
                    {isMergeMode ? (
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    ) : (
                      <>
                        {table.is_merge_child ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                            Merged
                          </span>
                        ) : (
                          <>
                            {isAvailable && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-555"></span>
                              </span>
                            )}
                            {isOccupied && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-555"></span>
                              </span>
                            )}
                            {isDirty && (
                              <span className="w-2 h-2 rounded-full bg-amber-550"></span>
                            )}
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              isAvailable ? 'text-emerald-600 dark:text-emerald-400' : ''
                            } ${
                              isOccupied ? 'text-blue-600 dark:text-blue-400' : ''
                            } ${
                              isDirty ? 'text-amber-600 dark:text-amber-400' : ''
                            }`}>
                              {table.status}
                            </span>
                            {!isDirty && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTable(table);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="ml-1 p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                                title="Table details & actions"
                              >
                                <Settings className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col gap-2 min-h-[48px]">
                  {table.is_merge_child ? (
                    <div className="flex flex-col gap-0.5 text-[10px] text-zinc-450">
                      <span className="font-semibold">Linked to primary</span>
                      <span className="font-extrabold text-zinc-700 dark:text-zinc-300">Table {table.merge_primary_number}</span>
                    </div>
                  ) : (
                    <>
                      {isAvailable && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-[11px] text-zinc-405 dark:text-zinc-500 font-semibold">
                            <Utensils className="w-3.5 h-3.5" />
                            <span>Seats up to {table.capacity}</span>
                          </div>
                          {table.is_merge_primary && table.merged_children && (
                            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40 w-fit">
                              Group: {table.table_number} + {table.merged_children.join(' + ')}
                            </div>
                          )}
                        </div>
                      )}
                      {isDirty && (
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Needs Cleaning
                          </p>
                          <p className="text-[9px] text-zinc-400">Clear and sanitize for next guests.</p>
                        </div>
                      )}
                      {isOccupied && (
                        <div className="flex flex-col gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                          <div className="flex items-center gap-1 truncate text-zinc-800 dark:text-zinc-200 font-bold">
                            <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{table.customer_name || 'Walk-In'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-0.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{table.elapsed_minutes || 0}m elapsed</span>
                            </div>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400">
                              {formatCurrency(table.grand_total || 0, currencyCode)}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Quick actions row on bottom */}
                <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/40 pt-2 text-[10px]">
                  <div className="flex gap-2">
                    {isManageMode && !table.is_merge_child && (
                      <>
                        <button
                          onClick={(e) => handleOpenEditModal(table, e)}
                          className="text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 transition-colors p-1"
                          title="Edit Seating"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTable(table, e)}
                          className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                          title="Delete Table"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {table.is_merge_child ? (
                    <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-0.5">
                      Link active
                    </span>
                  ) : (
                    <>
                      {isAvailable && (
                        <span className="text-[9px] font-bold text-zinc-400 group-hover:text-zinc-850 dark:group-hover:text-zinc-200 flex items-center gap-0.5 transition-colors">
                          Vacant <MoveRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}
                      {isDirty && (
                        <button
                          onClick={(e) => handleToggleStatus(table, 'Available', e)}
                          className="text-[9px] font-extrabold text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg border border-amber-200/40"
                        >
                          Clean Table
                        </button>
                      )}
                      {isOccupied && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                          Dining
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* CREATE & EDIT DIALOG */}
      <Dialog
        isOpen={isUpsertModalOpen}
        onClose={() => setIsUpsertModalOpen(false)}
        title={editingTable ? `Modify Table ${editingTable.table_number}` : 'Add New Table Block'}
      >
        <form onSubmit={handleUpsertSubmit} className="flex flex-col gap-4">
          <Input
            label="Table Identifier"
            type="text"
            placeholder="e.g. T-9 or Table-5"
            value={tableNumberInput}
            onChange={(e) => setTableNumberInput(e.target.value)}
            required
            disabled={isPending}
          />
          <Input
            label="Seating Capacity (Guests)"
            type="number"
            min="1"
            max="20"
            value={capacityInput}
            onChange={(e) => setCapacityInput(Number(e.target.value))}
            required
            disabled={isPending}
          />
          <Button type="submit" className="w-full mt-2 py-3 text-xs font-bold" isLoading={isPending}>
            {editingTable ? 'Save Table Configuration' : 'Register Table Layout'}
          </Button>
        </form>
      </Dialog>

      {/* TABLE DETAILS DIALOG MATCHING IMAGE 1 FOR OCCUPIED TABLES */}
      <Dialog
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setIsSplitting(false);
          setSplitChildSeats(1);
        }}
        title=""
      >
        {selectedTable && (
          <div className="-m-6 flex flex-col overflow-hidden rounded-2xl">
            {selectedTable.status === 'Occupied' ? (
              <>
                {/* Modal Header Bar - Terracotta #8B3A36 */}
                <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-extrabold text-xs">
                      {selectedTable.table_number}
                    </div>
                    <h2 className="text-sm font-bold tracking-tight">
                      Table {selectedTable.table_number}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleOpenSwapModal(selectedTable);
                      }}
                      className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition-colors text-white"
                      title="Group / Swap Table"
                    >
                      <Settings className="w-3 h-3" /> Group
                    </button>

                    <button
                      onClick={() => setIsDetailsModalOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Body - Items List */}
                <div className="p-4 bg-[#FDF9F5] dark:bg-zinc-950 flex flex-col gap-3 min-h-[220px] max-h-[360px] overflow-y-auto">
                  {isLoadingActiveSession ? (
                    <div className="flex items-center justify-center py-12 text-zinc-400">
                      <span className="text-xs font-semibold animate-pulse">Loading active order...</span>
                    </div>
                  ) : activeSessionOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400 text-center">
                      <Utensils className="w-8 h-8 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No active items on this table</p>
                      <Link href={`/orders?table=${selectedTable.table_number}`} className="mt-2">
                        <button className="text-xs text-sky-600 font-bold hover:underline">+ Add Items from Menu</button>
                      </Link>
                    </div>
                  ) : (
                    activeSessionOrders.map((order, orderIdx) => (
                      <div
                        key={order.id || orderIdx}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xs"
                      >
                        {/* KOT Group Header Banner */}
                        <div className="flex justify-between items-center bg-[#8B3A36]/10 dark:bg-[#8B3A36]/20 border border-[#8B3A36]/30 px-3 py-2 rounded-xl text-xs font-bold text-[#8B3A36] dark:text-rose-300">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#8B3A36] text-white px-2.5 py-0.5 rounded-md text-[11px] font-extrabold">
                              KOT #{order.token_no || order.id}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>

                          {/* KOT Actions: View KOT */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedRecentOrderView(order)}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                              title="View KOT Slip Details"
                            >
                              <Eye className="w-3 h-3" />
                              View KOT
                            </button>
                          </div>
                        </div>

                        {/* Items under this KOT */}
                        <div className="flex flex-col gap-2">
                          {(order.items || []).map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl p-3 flex items-center justify-between shadow-xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center font-extrabold text-xs shrink-0">
                                  {item.quantity}
                                </div>

                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                    {item.name}
                                  </span>
                                  <span className="text-[11px] text-zinc-400 font-semibold">
                                    {formatCurrency(Number(item.price), currencyCode)}
                                  </span>
                                  {item.notes && (
                                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                                      🏷️ {item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  defaultChecked
                                  className="w-4 h-4 rounded border-zinc-300 accent-[#8B3A36] cursor-pointer"
                                />

                                <Link href={`/orders?table=${selectedTable.table_number}`}>
                                  <button className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sky-600">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </Link>

                                <button
                                  onClick={() => handleRemoveItem(item, order.id)}
                                  className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded text-rose-600 transition-colors"
                                  title="Remove item from order ticket"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal & Discount Row */}
                <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(activeSessionTotals.subtotal, currencyCode)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <button
                      onClick={() => toast('Discount option available at Checkout.', 'info')}
                      className="text-sky-600 font-bold hover:underline text-xs"
                    >
                      + Add Discount
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold text-zinc-900 dark:text-zinc-100 border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1">
                    <span>Total</span>
                    <span>{formatCurrency(activeSessionTotals.total, currencyCode)}</span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6">
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="py-2.5 px-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs transition-colors"
                  >
                    Close
                  </button>

                  <button
                    onClick={async () => {
                      if (selectedTable.active_order_id) {
                        toast('Checkout completed.', 'success');
                        setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: 'Dirty', active_order_id: undefined, grand_total: 0 } : t));
                        const resStatus = await setTableStatusAction(selectedTable.id, 'Dirty');
                        if (resStatus.error) {
                          toast(resStatus.error, 'error');
                        }
                        setIsDetailsModalOpen(false);
                        toast(`Table ${selectedTable.table_number} session ended and marked for cleaning (Dirty).`, 'success');
                        const updated = await getTables();
                        setTables(updated);
                      }
                    }}
                    className="py-2.5 px-6 rounded-xl bg-[#4CAF50] hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    Checkout
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 flex flex-col gap-5">
                <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 p-4 border rounded-2xl">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Current Status</p>
                    <p className={`text-md font-extrabold mt-0.5 ${
                      selectedTable.status === 'Available' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {selectedTable.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedTable.status === 'Available' && (
                      <Button 
                        onClick={() => handleToggleStatus(selectedTable, 'Dirty')} 
                        variant="outline" 
                        className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 text-amber-600 hover:bg-amber-50"
                      >
                        Mark Dirty
                      </Button>
                    )}
                    {selectedTable.status === 'Dirty' && (
                      <Button 
                        onClick={() => handleToggleStatus(selectedTable, 'Available')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Clean Table
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="py-2 px-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* SWAP / TRANSFER TABLE DIALOG */}
      <Dialog
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        title={`Move order: Table ${selectedTable?.table_number}`}
      >
        {selectedTable && (
          <form onSubmit={handleSwapSubmit} className="flex flex-col gap-5">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Transfer the active ticket for <span className="font-bold text-zinc-800 dark:text-zinc-100">{selectedTable.customer_name || 'Walk-In'}</span> (Order #{selectedTable.active_order_id}) to another vacant table.
            </p>

            <div className="flex items-center gap-3.5 justify-center py-4 text-xs font-bold bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-2xl my-2">
              <span className="px-3.5 py-1.5 bg-blue-100 dark:bg-blue-955 text-blue-700 dark:text-blue-400 rounded-xl">{selectedTable.table_number}</span>
              <MoveRight className="w-5 h-5 text-zinc-400" />
              {availableTables.length === 0 ? (
                <span className="text-red-500 font-bold uppercase tracking-wider">No Available Tables</span>
              ) : (
                <div className="w-[120px]">
                  <Select
                    options={availableTables.map(t => ({ value: t.table_number, label: t.table_number }))}
                    value={targetTableNum}
                    onChange={(e) => setTargetTableNum(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <Button type="button" variant="outline" className="text-xs font-semibold bg-white dark:bg-zinc-900" onClick={() => setIsSwapModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs font-bold" isLoading={isPending} disabled={availableTables.length === 0}>
                Confirm Transfer
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* RUNNING TABLES MODAL POPUP MATCHING IMAGE 2 */}
      <Dialog
        isOpen={isRunningModalOpen}
        onClose={() => setIsRunningModalOpen(false)}
        title=""
      >
        <div className="-m-6 flex flex-col overflow-hidden rounded-2xl">
          {/* Modal Header */}
          <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold tracking-tight">
              Running Tables- Offline (Sync)
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[160px] max-h-[380px] overflow-y-auto bg-[#FDF9F5] dark:bg-zinc-900">
            {runningTablesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
                <Utensils className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Running Tables</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">All tables are currently available or clean.</p>
              </div>
            ) : (
              runningTablesList.map((table) => (
                <div
                  key={table.id}
                  className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl p-4 flex items-center justify-between shadow-xs"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      Table {table.table_number} Seats: Full
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Time : 00:00:51</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsRunningModalOpen(false);
                        setSelectedTable(table);
                        setIsDetailsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 transition-colors"
                      title="View Ticket / KOT"
                    >
                      <List className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => {
                        setIsRunningModalOpen(false);
                        handleOpenSwapModal(table);
                      }}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors"
                      title="Move Table"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(table, e);
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete / Cancel Table"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-zinc-100/80 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex justify-center">
            <button
              onClick={() => setIsRunningModalOpen(false)}
              className="py-2 px-10 rounded-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs transition-colors shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* START TABLE DIALOG MATCHING IMAGE 4 */}
      <Dialog
        isOpen={isStartTableModalOpen}
        onClose={() => setIsStartTableModalOpen(false)}
        title=""
      >
        {startTableTarget && (
          <div className="-m-6 flex flex-col overflow-hidden rounded-2xl">
            {/* Modal Header Bar */}
            <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold tracking-tight">
                    Table {startTableTarget.table_number}
                  </h2>
                  <span className="text-[11px] opacity-80">
                    Table {startTableTarget.table_number} • Full Table
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsStartTableModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-white dark:bg-zinc-900 flex flex-col gap-4">
              <div className="bg-[#E8F5E9] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-sm">
                    {startTableTarget.table_number}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Table {startTableTarget.table_number}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Capacity: {startTableTarget.capacity} • Full Table
                    </span>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6">
              <button
                onClick={() => setIsStartTableModalOpen(false)}
                className="py-2.5 px-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs transition-colors"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setIsStartTableModalOpen(false);
                  router.push(`/orders?table=${startTableTarget.table_number}`);
                }}
                className="py-2.5 px-6 rounded-xl bg-[#4CAF50] hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* RECENT ORDERS MODAL MATCHING SCREENSHOT 1 */}
      <Dialog
        isOpen={isRecentOrdersModalOpen}
        onClose={() => setIsRecentOrdersModalOpen(false)}
        title=""
      >
        <div className="-m-6 flex flex-col overflow-hidden rounded-2xl max-w-lg w-full">
          {/* Terracotta Header Banner */}
          <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <Receipt className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold tracking-tight">
                Recent Orders - Offline (Sync)
              </h2>
            </div>

            <button
              onClick={() => setIsRecentOrdersModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="p-4 bg-[#F5F2F0] dark:bg-zinc-950 flex items-center gap-2 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by Order No"
                value={recentOrdersSearchTerm}
                onChange={(e) => setRecentOrdersSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36]"
              />
            </div>

            <button
              onClick={() => handleOpenRecentOrders()}
              className="bg-[#8B3A36] hover:bg-[#742F2C] text-white p-2.5 rounded-xl transition-colors shrink-0 shadow-xs"
              title="Search / Refresh"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Order Card List Container */}
          <div className="p-4 sm:p-5 flex flex-col gap-4 min-h-[260px] max-h-[440px] overflow-y-auto bg-[#FDF9F5] dark:bg-zinc-900">
            {isLoadingRecentOrders ? (
              <div className="flex items-center justify-center py-16 text-zinc-400">
                <span className="text-xs font-semibold animate-pulse">Loading recent orders...</span>
              </div>
            ) : filteredRecentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 text-center">
                <Receipt className="w-10 h-10 mb-2 stroke-[1.2]" />
                <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Recent Orders Found</p>
              </div>
            ) : (
              filteredRecentOrders.map((order) => {
                const itemsSummary = (order.items || []).map((it: any) => `${it.name} (x${(it.quantity || 1).toFixed(1)}) - ₹${(Number(it.price) * (it.quantity || 1)).toFixed(2)}`);
                
                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xs"
                  >
                    {/* Top Header of Card */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>Order No: 2627-{String(order.id).padStart(5, '0')}</span>
                          <span>Table: {order.table_number || 'N/A'}</span>
                        </h3>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          Created By: {order.customer_name || 'Only Dhosa'}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {new Date(order.created_at).toLocaleDateString('en-GB')} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-[#8B3A36] dark:text-rose-400">
                          Total: {formatCurrency(order.grand_total, currencyCode)}
                        </span>
                      </div>
                    </div>

                    {/* Inset Item Breakdown Box matching screenshot 1 */}
                    <div className="bg-[#F8F5F2] dark:bg-zinc-900/90 border border-zinc-150 dark:border-zinc-800 rounded-xl p-3 flex flex-col gap-1 text-[11px] text-zinc-650 dark:text-zinc-300 font-medium">
                      {itemsSummary.length > 0 ? (
                        itemsSummary.map((itemText: string, i: number) => (
                          <div key={i} className="truncate">
                            {itemText}
                          </div>
                        ))
                      ) : (
                        <span className="text-zinc-400 italic">No items attached</span>
                      )}
                    </div>

                    {/* Card Action Buttons at bottom left */}
                    <div className="flex items-center gap-2 pt-1">


                      <button
                        onClick={() => setSelectedRecentOrderView(order)}
                        className="px-3.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-zinc-200/60"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        View
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 bg-zinc-100/90 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end px-5">
            <button
              onClick={() => setIsRecentOrdersModalOpen(false)}
              className="py-2 px-5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs flex items-center gap-1 hover:bg-zinc-50 transition-colors shadow-xs"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* DIGITAL BILL PREVIEW MODAL MATCHING SCREENSHOT 1 */}
      <Dialog
        isOpen={!!selectedRecentOrderView}
        onClose={() => setSelectedRecentOrderView(null)}
        title=""
      >
        {selectedRecentOrderView && (
          <div className="-m-6 flex flex-col items-center bg-zinc-950/40 p-4 sm:p-6 select-none">
            <div className="bg-white text-zinc-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center border border-zinc-200">
              {/* Header / Logo */}
              <div className="flex flex-col items-center text-center gap-1">
                <div className="flex items-center justify-center gap-1.5 font-extrabold text-rose-600 text-xl tracking-tight">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">🍕</span>
                  <span>Only Dhosa</span>
                </div>
                <p className="text-[10px] text-zinc-600 font-semibold max-w-[260px] leading-tight mt-1">
                  Maruti Chowk, Tapovam Mahadev Mandir, 60 feet main road, opp. Anupam Heights and Bajrang Dairy bestakar, Vavdi, Rajkot, Gujarat. 360004
                </p>
                <div className="text-xs font-bold text-zinc-900 mt-2">
                  Invoice No: 2627-{String(selectedRecentOrderView.id).padStart(5, '0')}
                </div>
                <div className="text-[11px] font-semibold text-zinc-700">
                  Date: {new Date(selectedRecentOrderView.created_at).toLocaleDateString('en-GB')} Time: {new Date(selectedRecentOrderView.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>

              {/* Table of Items matching screenshot 1 */}
              <div className="w-full border-t border-zinc-300 mt-4 pt-3">
                <div className="grid grid-cols-12 text-[11px] font-extrabold text-zinc-900 border-b border-zinc-300 pb-1.5 mb-2">
                  <span className="col-span-6">Name</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto text-[11px] font-medium text-zinc-800">
                  {(selectedRecentOrderView.items || []).map((it: any, i: number) => {
                    const qty = it.quantity || 1;
                    const price = Number(it.price) || 0;
                    const lineTotal = Number(it.total_price) || (qty * price);
                    return (
                      <div key={i} className="grid grid-cols-12 items-baseline">
                        <span className="col-span-6 font-bold leading-snug pr-1 truncate">{it.name}</span>
                        <span className="col-span-2 text-center">{qty}</span>
                        <span className="col-span-2 text-right">{price.toFixed(1)}</span>
                        <span className="col-span-2 text-right">{lineTotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary & Totals */}
              <div className="w-full border-t border-zinc-300 mt-4 pt-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-900">
                  <span>Total Items</span>
                  <span>{(selectedRecentOrderView.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)}</span>
                </div>

                <div className="flex justify-between items-center text-base font-extrabold text-zinc-950 border-t border-zinc-400 pt-2 mt-1">
                  <span>Total</span>
                  <span>{selectedRecentOrderView.grand_total ? selectedRecentOrderView.grand_total.toFixed(2) : '0.00'}</span>
                </div>
              </div>

              {/* Thank you & QR Code */}
              <div className="flex flex-col items-center mt-5 gap-1.5">
                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">THANK YOU</span>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=POS_INV_2627-${String(selectedRecentOrderView.id).padStart(5, '0')}`}
                  alt="QR Code"
                  className="w-20 h-20 object-contain rounded-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Close Button at bottom right matching screenshot 1 */}
              <div className="w-full flex justify-end mt-6">
                <button
                  onClick={() => setSelectedRecentOrderView(null)}
                  className="bg-[#FF4D4D] hover:bg-rose-600 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* ITEM WISE ORDER MODAL MATCHING SCREENSHOT 2 */}
      <Dialog
        isOpen={isItemCountModalOpen}
        onClose={() => setIsItemCountModalOpen(false)}
        title=""
      >
        <div className="-m-6 flex flex-col overflow-hidden rounded-2xl max-w-xl w-full">
          {/* Header */}
          <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <Utensils className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold tracking-tight">
                Item Wise Order - Offline (Sync)
              </h2>
            </div>

            <button
              onClick={() => setIsItemCountModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Top Filters - Date Picker fieldset + Search button + Search Item Input */}
          <div className="p-4 bg-[#F5F2F0] dark:bg-zinc-950 flex flex-col gap-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {/* Date Fieldset Border Input */}
              <div className="relative flex-1">
                <label className="absolute -top-2.5 left-3.5 bg-[#F5F2F0] dark:bg-zinc-950 px-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedItemSalesDate}
                  onChange={(e) => {
                    setSelectedItemSalesDate(e.target.value);
                    fetchItemWiseSales(e.target.value);
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36]"
                />
              </div>

              {/* Search Button */}
              <button
                onClick={() => fetchItemWiseSales(selectedItemSalesDate)}
                className="bg-[#8B3A36] hover:bg-[#742F2C] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
              >
                <Search className="w-3.5 h-3.5" /> Search
              </button>
            </div>

            {/* Search Item Name Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search item name"
                value={itemSalesSearchTerm}
                onChange={(e) => setItemSalesSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36]"
              />
            </div>
          </div>

          {/* Table of Item Wise Sales matching Screenshot 2 */}
          <div className="p-4 sm:p-5 flex flex-col min-h-[280px] max-h-[420px] overflow-y-auto bg-[#FDF9F5] dark:bg-zinc-900">
            <div className="grid grid-cols-12 text-xs font-bold text-zinc-600 dark:text-zinc-400 pb-2 border-b border-zinc-200 dark:border-zinc-800 mb-2">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {isLoadingItemSales ? (
              <div className="flex items-center justify-center py-16 text-zinc-400">
                <span className="text-xs font-semibold animate-pulse">Loading item sales data...</span>
              </div>
            ) : filteredItemWiseSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 text-center">
                <Utensils className="w-8 h-8 mb-2 stroke-[1.2]" />
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">No Sales Data for {selectedItemSalesDate}</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredItemWiseSales.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-semibold">
                    <span className="col-span-6 pr-2 truncate">{item.name}</span>
                    <span className="col-span-2 text-center text-zinc-600 dark:text-zinc-400">{item.qty.toFixed(2)}</span>
                    <span className="col-span-2 text-right text-zinc-600 dark:text-zinc-400">{item.price.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-extrabold text-zinc-900 dark:text-zinc-50">{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Action Buttons matching Screenshot 2 */}
          <div className="p-3.5 bg-zinc-100/90 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center px-5">
            <button
              onClick={() => setIsItemCountModalOpen(false)}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs hover:bg-zinc-50 transition-colors shadow-xs"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">

              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(filteredItemWiseSales, null, 2));
                  toast('Item sales data copied to clipboard.', 'success');
                }}
                className="bg-[#8B3A36] hover:bg-[#742F2C] text-white p-2.5 rounded-xl transition-colors shadow-xs"
                title="Copy Data"
              >
                <Receipt className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  toast('Share report option active', 'info');
                }}
                className="bg-[#4CAF50] hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-colors shadow-xs"
                title="Share Report"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* SITTINGS LAYOUT SETTINGS MODAL MATCHING SCREENSHOTS 1 & 2 */}
      <Dialog
        isOpen={isLayoutSettingsModalOpen}
        onClose={() => setIsLayoutSettingsModalOpen(false)}
        title=""
      >
        <div className="-m-6 flex flex-col overflow-hidden rounded-2xl max-w-md w-full min-h-[380px] bg-[#FDF9F5] dark:bg-zinc-950 select-none">
          {/* Terracotta Header Banner */}
          <div className="bg-[#8B3A36] text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsLayoutSettingsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Sittings Layout Settings
              </h2>
            </div>

            <button
              onClick={() => setIsLayoutSettingsModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Tab Strip: THEME | GENERAL */}
          <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-8 px-6 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setLayoutActiveTab('THEME')}
              className={`py-3.5 border-b-2 transition-colors ${
                layoutActiveTab === 'THEME'
                  ? 'border-purple-700 text-purple-700 dark:border-purple-400 dark:text-purple-400 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              THEME
            </button>

            <button
              onClick={() => setLayoutActiveTab('GENERAL')}
              className={`py-3.5 border-b-2 transition-colors ${
                layoutActiveTab === 'GENERAL'
                  ? 'border-purple-700 text-purple-700 dark:border-purple-400 dark:text-purple-400 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              GENERAL
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 p-6 flex flex-col gap-6 relative">
            {layoutActiveTab === 'THEME' ? (
              /* THEME TAB CONTENT MATCHING SCREENSHOT 1 */
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Per Row Table
                </span>

                {/* Selector Button & Dropdown Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsPerRowDropdownOpen(prev => !prev)}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center gap-2 border border-zinc-250 dark:border-zinc-700"
                  >
                    <span>{tablesPerRow}</span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  {/* Floating Dropdown Menu matching Screenshot 1 */}
                  {isPerRowDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1 text-xs font-semibold">
                      {[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setTablesPerRow(num === 0 ? 3 : num);
                            setIsPerRowDropdownOpen(false);
                            toast(`Grid updated to ${num} tables per row`, 'success');
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 ${
                            tablesPerRow === num
                              ? 'bg-zinc-200 dark:bg-zinc-800 font-extrabold text-purple-700 dark:text-purple-300'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* GENERAL TAB CONTENT MATCHING SCREENSHOT 2 */
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Session manage By
                </span>

                <select
                  value={sessionManageBy}
                  onChange={(e) => {
                    const val = e.target.value as 'online' | 'offline';
                    setSessionManageBy(val);
                    toast(`Session mode set to ${val}`, 'info');
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  <option value="online">online</option>
                  <option value="offline">offline</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
