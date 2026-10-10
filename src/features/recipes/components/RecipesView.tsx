'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MenuItem } from '@/types/menu';
import { Ingredient } from '@/types/inventory';
import { RecipeWithItems } from '@/types/recipes';
import { getRecipes } from '@/services/recipes/recipeService';
import { createClient } from '@/lib/supabase/client';
import { RecipeModal } from '@/features/recipes/components/RecipeModal';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  PieChart,
  TrendingUp,
  Percent,
  Check,
  Utensils,
  Layers,
  Edit,
} from 'lucide-react';

interface RecipesViewProps {
  menuItems?: MenuItem[];
  recipes?: RecipeWithItems[];
  ingredients?: Ingredient[];
}

export function RecipesView({ menuItems = [], recipes = [], ingredients = [] }: RecipesViewProps) {
  const [recipeList, setRecipeList] = useState<RecipeWithItems[]>(recipes);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'configured' | 'missing'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchLatestRecipes = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getRecipes();
      setRecipeList(data);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('recipes-workstation-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes' },
        () => {
          fetchLatestRecipes();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipe_items' },
        () => {
          fetchLatestRecipes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLatestRecipes]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, RecipeWithItems>();
    recipeList.forEach((r) => map.set(r.menu_item_id, r));
    return map;
  }, [recipeList]);

  // Unique categories from menu items
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [menuItems]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return counts;
  }, [menuItems]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalMenuItems = menuItems.length;
    const configuredCount = recipeList.length;
    const missingCount = Math.max(0, totalMenuItems - configuredCount);

    let sumFoodCostPct = 0;
    let configuredPriceCount = 0;

    recipeList.forEach((r) => {
      if (r.food_cost_percent && r.food_cost_percent > 0) {
        sumFoodCostPct += r.food_cost_percent;
        configuredPriceCount++;
      }
    });

    const avgFoodCostPct = configuredPriceCount > 0 ? sumFoodCostPct / configuredPriceCount : 0;

    return {
      totalMenuItems,
      configuredCount,
      missingCount,
      avgFoodCostPct,
    };
  }, [menuItems.length, recipeList]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (item.name || item.item_name || '').toLowerCase();
      const matchesSearch = !q || name.includes(q);
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      const hasRecipe = recipeMap.has(item.id);
      let matchesTab = true;
      if (activeTab === 'configured') matchesTab = hasRecipe;
      if (activeTab === 'missing') matchesTab = !hasRecipe;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [menuItems, searchQuery, selectedCategory, activeTab, recipeMap]);

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
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Recipes & Menu Costing
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
              Connect menu catalog items to raw ingredients for food cost analysis and automated inventory deduction
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchLatestRecipes} isLoading={isRefreshing} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Menu Items"
          value={summaryMetrics.totalMenuItems}
          subtitle="Catalog menu items"
          icon={<Utensils className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Configured Recipes"
          value={summaryMetrics.configuredCount}
          subtitle="Mapped to ingredient BOM"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Missing Recipes"
          value={summaryMetrics.missingCount}
          subtitle="Unmapped menu items"
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Average Food Cost %"
          value={`${summaryMetrics.avgFoodCostPct.toFixed(1)}%`}
          subtitle="Across configured recipes"
          icon={<Percent className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Main Workstation Layout: Left Category Panel + Right Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left Menu Category Sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-1.5 text-slate-800 text-xs font-bold">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Menu Categories</span>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {categories.length}
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                selectedCategory === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {menuItems.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white font-bold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate pr-1">{cat}</span>
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

        {/* Right Content Area */}
        <div className="lg:col-span-4 space-y-3">
          {/* Workstation Toolbar & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Items ({menuItems.length})
              </button>

              <button
                onClick={() => setActiveTab('configured')}
                className={`px-3.5 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'configured'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Configured ({summaryMetrics.configuredCount})
              </button>

              <button
                onClick={() => setActiveTab('missing')}
                className={`px-3.5 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === 'missing'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Missing Recipe ({summaryMetrics.missingCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search menu item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium"
              />
            </div>
          </div>

          {/* Menu Items & Recipes Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Menu Item</th>
                    <th className="py-2.5 px-3">Selling Price</th>
                    <th className="py-2.5 px-3">Recipe Status</th>
                    <th className="py-2.5 px-3">Recipe Cost</th>
                    <th className="py-2.5 px-3">Food Cost %</th>
                    <th className="py-2.5 px-3">Gross Margin</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => {
                      const recipe = recipeMap.get(item.id);
                      const itemName = item.name || item.item_name || 'Menu Item';
                      const price = item.price || 0;

                      const cost = recipe?.recipe_cost || 0;
                      const foodCostPct = recipe?.food_cost_percent || 0;
                      const margin = recipe?.gross_margin || price;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 text-xs">{itemName}</div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {item.category || 'Standard Category'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            ₹ {price.toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3">
                            {recipe ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Configured ({recipe.items.length} Ingredients)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Missing Recipe
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {recipe ? `₹ ${cost.toFixed(2)}` : <span className="text-slate-400 italic text-[11px]">-</span>}
                          </td>

                          <td className="py-2.5 px-3">
                            {recipe ? (
                              <span className={`font-bold ${foodCostPct > 35 ? 'text-amber-700 font-extrabold' : 'text-emerald-700'}`}>
                                {foodCostPct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {recipe ? `₹ ${margin.toFixed(2)}` : <span className="text-slate-400 italic text-[11px]">-</span>}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant={recipe ? 'outline' : 'primary'}
                              size="sm"
                              className={recipe ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold' : 'bg-red-600 hover:bg-red-700 text-white text-xs font-bold'}
                              onClick={() => setSelectedMenuItem(item)}
                            >
                              {recipe ? (
                                <span className="flex items-center">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit Recipe
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Configure Recipe
                                </span>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span>No menu items match the current view filter.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Modal */}
      {selectedMenuItem && (
        <RecipeModal
          menuItem={selectedMenuItem}
          existingRecipe={recipeMap.get(selectedMenuItem.id) || null}
          ingredients={ingredients}
          onClose={() => setSelectedMenuItem(null)}
          onSuccess={() => {
            const isEditing = recipeMap.has(selectedMenuItem.id);
            setSelectedMenuItem(null);
            fetchLatestRecipes();
            showToast(isEditing ? 'Recipe updated successfully' : 'Recipe configured successfully');
          }}
        />
      )}
    </div>
  );
}
