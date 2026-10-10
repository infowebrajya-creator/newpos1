'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Ingredient,
  IngredientCategory,
  InventoryTransaction,
  InventorySummary,
  StockStatus,
} from '@/types/inventory';
import {
  getIngredients,
  getIngredientCategories,
  getInventoryTransactions,
  getInventorySummary,
} from '@/services/inventory/inventoryService';
import { createClient } from '@/lib/supabase/client';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { StockAdjustmentModal } from '@/features/inventory/components/StockAdjustmentModal';
import { IngredientModal } from '@/features/inventory/components/IngredientModal';
import {
  Package,
  AlertTriangle,
  XCircle,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  History,
  Edit,
  Trash2,
  CheckCircle2,
  Layers,
  ShoppingBag,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Check,
  Building2,
} from 'lucide-react';
import { Link } from '@/lib/navigation';

interface InventoryViewProps {
  initialIngredients?: Ingredient[];
  initialCategories?: IngredientCategory[];
  initialTransactions?: InventoryTransaction[];
  initialSummary?: InventorySummary | null;
}

export function InventoryView({
  initialIngredients = [],
  initialCategories = [],
  initialTransactions = [],
  initialSummary = null,
}: InventoryViewProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [categories, setCategories] = useState<IngredientCategory[]>(initialCategories);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(initialTransactions);
  const [summary, setSummary] = useState<InventorySummary | null>(initialSummary);

  const [activeTab, setActiveTab] = useState<'all' | 'healthy' | 'low_stock' | 'out_of_stock' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const [selectedIngForAdjustment, setSelectedIngForAdjustment] = useState<Ingredient | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'adjustment' | 'wastage'>('adjustment');
  const [selectedIngForEdit, setSelectedIngForEdit] = useState<Ingredient | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchLatestInventory = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [ings, cats, txs, sum] = await Promise.all([
        getIngredients(),
        getIngredientCategories(),
        getInventoryTransactions(),
        getInventorySummary(),
      ]);
      setIngredients(ings);
      setCategories(cats);
      setTransactions(txs);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to refresh inventory:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialIngredients.length === 0) {
      fetchLatestInventory();
    }
  }, [fetchLatestInventory, initialIngredients.length]);

  // Supabase Realtime Subscription for live updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('inventory-workstation-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        () => {
          fetchLatestInventory();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_transactions' },
        () => {
          fetchLatestInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLatestInventory]);

  // Derived stock counts & valuation summary
  const currentSummary = useMemo(() => {
    if (summary) return summary;

    const sum: InventorySummary = {
      totalIngredients: ingredients.length,
      healthyCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalValue: 0,
    };

    ingredients.forEach((ing) => {
      if (ing.is_active) {
        sum.totalValue += (ing.current_stock || 0) * (ing.cost_per_unit || 0);
        if (ing.current_stock <= 0) sum.outOfStockCount++;
        else if (ing.current_stock <= ing.minimum_stock) sum.lowStockCount++;
        else sum.healthyCount++;
      }
    });

    return sum;
  }, [ingredients, summary]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ingredients.forEach((ing) => {
      if (ing.category_id) {
        counts[ing.category_id] = (counts[ing.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [ingredients]);

  // Filter ingredients by Tab, Category, and Search
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || ing.name.toLowerCase().includes(q) || (ing.description && ing.description.toLowerCase().includes(q));
      const matchCategory = selectedCategoryFilter === 'all' || ing.category_id === selectedCategoryFilter;

      let matchTab = true;
      if (activeTab === 'healthy') matchTab = ing.stock_status === 'healthy';
      if (activeTab === 'low_stock') matchTab = ing.stock_status === 'low_stock';
      if (activeTab === 'out_of_stock') matchTab = ing.stock_status === 'out_of_stock';

      return matchSearch && matchCategory && matchTab;
    });
  }, [ingredients, activeTab, searchQuery, selectedCategoryFilter]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const utcTime = d.getTime();
      const istDate = new Date(utcTime + 5.5 * 60 * 60 * 1000);
      const day = istDate.getUTCDate().toString().padStart(2, '0');
      const month = MONTHS[istDate.getUTCMonth()];
      let hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${month} at ${hours}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  const statusBadgeConfig: Record<StockStatus, { label: string; bg: string; text: string }> = {
    healthy: { label: 'HEALTHY', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
    low_stock: { label: 'LOW STOCK', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
    out_of_stock: { label: 'OUT OF STOCK', bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-fadeIn border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Inventory & Raw Materials
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Workstation
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Stock management, wastage tracking, reorder monitoring, and purchase workflow
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/pos/purchases">
            <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Purchases
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={fetchLatestInventory} isLoading={isRefreshing} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Ingredients"
          value={currentSummary.totalIngredients}
          subtitle={`${currentSummary.healthyCount} items in healthy stock`}
          icon={<Package className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Low Stock"
          value={currentSummary.lowStockCount}
          subtitle="At or below minimum threshold"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Out of Stock"
          value={currentSummary.outOfStockCount}
          subtitle="Completely depleted stock"
          icon={<XCircle className="w-5 h-5 text-red-600" />}
        />
        <StatCard
          title="Total Inventory Value"
          value={`₹ ${currentSummary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Valuation at current stock & unit cost"
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Main Workstation Layout: Left Category Panel + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left Category Navigation Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-1.5 text-slate-800 text-xs font-bold">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Categories</span>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {categories.length}
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                selectedCategoryFilter === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {ingredients.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white font-bold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate pr-1">{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                    isSelected ? 'bg-red-700 text-red-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Workstation */}
        <div className="lg:col-span-4 space-y-3">
          {/* Workstation Toolbar & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({ingredients.length})
              </button>

              <button
                onClick={() => setActiveTab('healthy')}
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'healthy'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Healthy ({currentSummary.healthyCount})
              </button>

              <button
                onClick={() => setActiveTab('low_stock')}
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Low Stock ({currentSummary.lowStockCount})
              </button>

              <button
                onClick={() => setActiveTab('out_of_stock')}
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'out_of_stock'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Out of Stock ({currentSummary.outOfStockCount})
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Transaction History</span>
              </button>
            </div>

            {/* Search Input */}
            {activeTab !== 'history' && (
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ingredient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>
            )}
          </div>

          {/* Main Ingredient Table */}
          {activeTab !== 'history' ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3">Min / Reorder</th>
                      <th className="py-2.5 px-3">Cost / Unit</th>
                      <th className="py-2.5 px-3">Stock Value</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredIngredients.length > 0 ? (
                      filteredIngredients.map((ing) => {
                        const status = ing.stock_status || 'healthy';
                        const badge = statusBadgeConfig[status];
                        const ingValue = (ing.current_stock || 0) * (ing.cost_per_unit || 0);

                        return (
                          <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 text-xs">{ing.name}</div>
                              {ing.description && (
                                <span className="text-[10px] text-slate-500 line-clamp-1">{ing.description}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              {ing.category_name ? (
                                <span className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                                  {ing.category_name}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">General</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {ing.current_stock.toFixed(2)} <span className="text-slate-500 font-normal text-[11px]">{ing.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">
                              {ing.minimum_stock.toFixed(2)} {ing.unit}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              ₹ {ing.cost_per_unit.toFixed(2)} / {ing.unit}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              ₹ {ingValue.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedIngForAdjustment(ing);
                                    setAdjustmentType('adjustment');
                                  }}
                                  className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-200 transition-colors font-bold text-[11px] cursor-pointer"
                                >
                                  Adjust Stock
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedIngForAdjustment(ing);
                                    setAdjustmentType('wastage');
                                  }}
                                  className="px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors font-bold text-[11px] cursor-pointer"
                                >
                                  Wastage
                                </button>
                                <button
                                  onClick={() => setSelectedIngForEdit(ing)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Ingredient"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <span>No ingredients match the current filters. Click &quot;Add Ingredient&quot; to create one.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Transaction History View */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Stock Transition</th>
                      <th className="py-2.5 px-3">Reason / User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {transactions.length > 0 ? (
                      transactions.map((tx) => {
                        const isPositive = tx.quantity > 0;
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500 font-medium" suppressHydrationWarning>{formatTime(tx.created_at)}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{tx.ingredient_name}</td>
                            <td className="py-2.5 px-3">
                              <span className="uppercase font-bold text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {tx.transaction_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                              {isPositive ? `+${tx.quantity.toFixed(2)}` : `${tx.quantity.toFixed(2)}`} {tx.unit}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {tx.previous_stock.toFixed(2)} → <span className="font-bold text-slate-900">{tx.new_stock.toFixed(2)} {tx.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">{tx.reason || <span className="italic text-slate-400">Routine count</span>}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <span>No inventory transaction history recorded yet.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedIngForAdjustment && (
        <StockAdjustmentModal
          ingredient={selectedIngForAdjustment}
          initialType={adjustmentType}
          onClose={() => setSelectedIngForAdjustment(null)}
          onSuccess={() => {
            setSelectedIngForAdjustment(null);
            fetchLatestInventory();
            showToast('Stock adjustment recorded successfully');
          }}
        />
      )}

      {/* Add/Edit Ingredient Modal */}
      {(isAddModalOpen || selectedIngForEdit) && (
        <IngredientModal
          ingredient={selectedIngForEdit}
          categories={categories}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedIngForEdit(null);
          }}
          onSuccess={() => {
            const isEditing = !!selectedIngForEdit;
            setIsAddModalOpen(false);
            setSelectedIngForEdit(null);
            fetchLatestInventory();
            showToast(isEditing ? 'Ingredient updated successfully' : 'New ingredient added successfully');
          }}
        />
      )}
    </div>
  );
}
