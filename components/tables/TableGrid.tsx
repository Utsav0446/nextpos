'use client';

import React, { useState, useTransition, useMemo } from 'react';
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
  moveTableAction 
} from '@/actions/tables';
import { formatCurrency } from '@/utils/format';
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
  ArrowRightLeft
} from 'lucide-react';
import Link from 'next/link';

interface TableGridProps {
  initialTables: RestaurantTable[];
  currencyCode: string;
}

export default function TableGrid({ initialTables, currencyCode }: TableGridProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Occupied' | 'Dirty'>('all');

  // Modals state
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [targetTableNum, setTargetTableNum] = useState('');

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
    return tables.filter(t => t.status === 'Available');
  }, [tables]);

  // Handlers
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
      const res = await moveTableAction(selectedTable.active_order_id, targetTableNum);
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

  const handleCardClick = (table: RestaurantTable) => {
    setSelectedTable(table);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Tables &amp; Occupancy</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Monitor seating layouts, manage dirty tables, and route dine-in orders.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="text-xs font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Table
        </Button>
      </div>

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

      {/* Table Cards Grid */}
      {filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 border border-dashed rounded-2xl">
          <HelpCircle className="w-10 h-10 mb-2 stroke-[1.5]" />
          <p className="text-xs font-bold text-zinc-650 dark:text-zinc-350">No Tables Found</p>
          <p className="text-[10px] mt-0.5">Try adjusting your search criteria or register a new table layout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            const isAvailable = table.status === 'Available';
            const isOccupied = table.status === 'Occupied';
            const isDirty = table.status === 'Dirty';

            return (
              <div
                key={table.id}
                onClick={() => handleCardClick(table)}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between gap-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-150 select-none group relative overflow-hidden ${
                  isAvailable ? 'border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-900' : ''
                } ${
                  isOccupied ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/10 dark:bg-blue-950/5' : ''
                } ${
                  isDirty ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/5' : ''
                }`}
              >
                {/* Status bar top */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">
                    {table.table_number}
                  </span>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5">
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
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col gap-2 min-h-[48px]">
                  {isAvailable && (
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Seats up to {table.capacity}</span>
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
                </div>

                {/* Quick actions row on bottom */}
                <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/40 pt-2 text-[10px]">
                  <div className="flex gap-2">
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
                  </div>
                  
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
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* TABLE DETAILS DIALOG */}
      <Dialog
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Table details: ${selectedTable?.table_number}`}
      >
        {selectedTable && (
          <div className="flex flex-col gap-5">
            {/* Status overview */}
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 p-4 border rounded-2xl">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Current Status</p>
                <p className={`text-md font-extrabold mt-0.5 ${
                  selectedTable.status === 'Available' ? 'text-emerald-600' : ''
                } ${
                  selectedTable.status === 'Occupied' ? 'text-blue-600' : ''
                } ${
                  selectedTable.status === 'Dirty' ? 'text-amber-600' : ''
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

            {/* Capacity stats */}
            <div className="flex flex-col gap-1.5 pl-1 text-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Information</span>
              <p className="text-zinc-800 dark:text-zinc-200 font-semibold">Seating limit: <span className="font-extrabold">{selectedTable.capacity} guests</span></p>
            </div>

            {/* Active order info */}
            {selectedTable.status === 'Occupied' && (
              <div className="border-t border-zinc-150 dark:border-zinc-800/80 pt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest pl-1">Active Dining Session</span>
                  
                  <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Customer</span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{selectedTable.customer_name || 'Walk-In'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Billing Sum</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatCurrency(selectedTable.grand_total || 0, currencyCode)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Elapsed Time</span>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{selectedTable.elapsed_minutes || 0} minutes</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Ticket Reference</span>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Order #{selectedTable.active_order_id}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 mt-2">
                  <Link href={`/orders?table=${selectedTable.table_number}`} className="w-full">
                    <Button variant="outline" className="w-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200">
                      Add Items / Menu
                    </Button>
                  </Link>
                  <Link href={`/billing?orderId=${selectedTable.active_order_id}`} className="w-full">
                    <Button className="w-full text-xs font-extrabold">
                      Checkout / Pay Bill
                    </Button>
                  </Link>
                </div>
                
                <Button 
                  onClick={() => handleOpenSwapModal(selectedTable)} 
                  variant="outline" 
                  className="w-full py-2.5 text-xs font-bold bg-white dark:bg-zinc-900 text-zinc-700 border border-zinc-200 flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-400" /> Transfer / Swap Table
                </Button>
              </div>
            )}

            {/* Vacant / Available prompt */}
            {selectedTable.status === 'Available' && (
              <div className="border-t border-zinc-150 dark:border-zinc-800/80 pt-4 flex flex-col gap-4">
                <Link href={`/orders?table=${selectedTable.table_number}`} className="w-full">
                  <Button className="w-full py-3.5 text-xs font-extrabold flex items-center justify-center gap-2">
                    <Utensils className="w-4 h-4" /> Start New Dine-In Order
                  </Button>
                </Link>
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
    </div>
  );
}
