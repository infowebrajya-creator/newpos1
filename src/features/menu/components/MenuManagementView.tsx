'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MenuCategory, MenuItem } from '@/types/menu';
import {
  getAllMenuCategories,
  getAllMenuItems,
  toggleMenuItemAvailability,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createMenuCategory,
  updateMenuCategory,
} from '@/services/menu/menuService';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import {
  Utensils,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Flame,
  Star,
  FolderPlus,
  LayoutGrid,
  List,
  AlertCircle,
  Tag,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';

interface MenuManagementViewProps {
  initialCategories?: MenuCategory[];
  initialMenuItems?: MenuItem[];
}

type DietaryFilter = 'all' | 'veg' | 'non_veg';
type AvailabilityFilter = 'all' | 'available' | 'out_of_stock';
type ViewMode = 'grid' | 'table';

export function MenuManagementView({
  initialCategories = [],
  initialMenuItems = [],
}: MenuManagementViewProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Item Modal State (Create / Edit)
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    description: '',
    image_url: '',
    is_veg: true,
    is_available: true,
    is_bestseller: false,
    is_chef_special: false,
  });
  const [itemFormError, setItemFormError] = useState<string>('');
  const [isSavingItem, setIsSavingItem] = useState<boolean>(false);

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [catFormError, setCatFormError] = useState<string>('');
  const [isSavingCat, setIsSavingCat] = useState<boolean>(false);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchMenuData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [cats, items] = await Promise.all([
        getAllMenuCategories(),
        getAllMenuItems(),
      ]);
      setCategories(cats);
      setMenuItems(items);
    } catch {
      // Retain existing state
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    fetchMenuData();

    const supabase = createClient();
    const channel = supabase
      .channel('menu-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          fetchMenuData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories' },
        () => {
          fetchMenuData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMenuData]);

  // Fast 1-tap availability toggle
  const handleToggleAvailability = async (item: MenuItem) => {
    const newStatus = !item.is_available;
    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
    );

    try {
      await toggleMenuItemAvailability(item.id, newStatus);
      showToast(`"${item.name || item.item_name}" marked as ${newStatus ? 'AVAILABLE' : 'OUT OF STOCK'}.`);
    } catch (err: unknown) {
      // Revert optimistic update on failure
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !newStatus } : i))
      );
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(`Unable to update availability: ${msg}`);
    }
  };

  // Open Create Item Modal
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      name: '',
      category_id: categories[0]?.id || '',
      price: '',
      description: '',
      image_url: '',
      is_veg: true,
      is_available: true,
      is_bestseller: false,
      is_chef_special: false,
    });
    setItemFormError('');
    setItemModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name || item.item_name || '',
      category_id: item.category_id || (categories.find((c) => c.name === item.category)?.id || ''),
      price: item.price.toString(),
      description: item.description || '',
      image_url: item.image_url || item.image || '',
      is_veg: item.is_veg !== false,
      is_available: item.is_available,
      is_bestseller: !!item.is_bestseller,
      is_chef_special: !!item.is_chef_special,
    });
    setItemFormError('');
    setItemModalOpen(true);
  };

  // Save Item (Create or Edit)
  const handleSaveItem = async () => {
    if (!itemFormData.name.trim()) {
      setItemFormError('Item Name is required.');
      return;
    }
    const numPrice = parseFloat(itemFormData.price);
    if (isNaN(numPrice) || numPrice < 0) {
      setItemFormError('Valid Item Price is required.');
      return;
    }

    try {
      setIsSavingItem(true);
      setItemFormError('');

      const selectedCat = categories.find((c) => c.id === itemFormData.category_id);

      const payload = {
        name: itemFormData.name.trim(),
        item_name: itemFormData.name.trim(),
        category_id: itemFormData.category_id || null,
        category: selectedCat?.name || null,
        price: numPrice,
        description: itemFormData.description.trim() || null,
        image_url: itemFormData.image_url.trim() || null,
        image: itemFormData.image_url.trim() || null,
        is_veg: itemFormData.is_veg,
        is_available: itemFormData.is_available,
        is_bestseller: itemFormData.is_bestseller,
        is_chef_special: itemFormData.is_chef_special,
      };

      if (editingItem) {
        await updateMenuItem(editingItem.id, payload);
        showToast(`Item "${payload.name}" updated successfully.`);
      } else {
        await createMenuItem(payload);
        showToast(`Item "${payload.name}" created successfully.`);
      }

      setItemModalOpen(false);
      await fetchMenuData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setItemFormError(`Unable to save menu item: ${msg}`);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: MenuItem) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${item.name || item.item_name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteMenuItem(item.id);
      showToast(`Item "${item.name || item.item_name}" deleted.`);
      await fetchMenuData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(`Unable to delete item: ${msg}`);
    }
  };

  // Add Category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      setCatFormError('Category name is required.');
      return;
    }

    try {
      setIsSavingCat(true);
      setCatFormError('');
      await createMenuCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || null,
        is_active: true,
      });
      showToast(`Category "${newCatName.trim()}" created successfully.`);
      setNewCatName('');
      setNewCatDesc('');
      await fetchMenuData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Category creation failed';
      setCatFormError(`Failed to create category: ${msg}`);
    } finally {
      setIsSavingCat(false);
    }
  };

  // Category item counts map
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    menuItems.forEach((item) => {
      const catId = item.category_id || 'uncategorized';
      counts.set(catId, (counts.get(catId) || 0) + 1);
    });
    return counts;
  }, [menuItems]);

  // Menu stats
  const stats = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter((i) => i.is_available).length;
    const outOfStock = total - available;
    const totalCats = categories.length;
    return { total, available, outOfStock, totalCats };
  }, [menuItems, categories]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (selectedCategoryId !== 'all' && item.category_id !== selectedCategoryId) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.name || item.item_name || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !descMatch) return false;
      }

      // Dietary filter
      if (dietaryFilter === 'veg' && item.is_veg === false) return false;
      if (dietaryFilter === 'non_veg' && item.is_veg !== false) return false;

      // Availability filter
      if (availabilityFilter === 'available' && !item.is_available) return false;
      if (availabilityFilter === 'out_of_stock' && item.is_available) return false;

      return true;
    });
  }, [menuItems, selectedCategoryId, searchQuery, dietaryFilter, availabilityFilter]);

  const formatCurrency = (amount?: number): string => {
    if (amount == null) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-3.5 max-w-[1700px] mx-auto pb-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP WORKSTATION HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Menu Management
              </h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                Catalog Workstation
              </span>
              <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>POS Synced</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live menu items, instant availability toggle, pricing & category organization
            </p>
          </div>
        </div>

        {/* Action Controls & Stats Chips */}
        <div className="flex items-center space-x-2">
          {/* Stats Badges */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
            <span>{stats.total} Items</span>
            <span>•</span>
            <span className="text-emerald-700">{stats.available} Available</span>
            <span>•</span>
            <span className="text-red-600">{stats.outOfStock} Out of Stock</span>
          </div>

          <button
            onClick={() => setCategoryModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
            <span>Manage Categories</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMenuData}
            isLoading={isRefreshing}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <button
            onClick={handleOpenCreateItem}
            className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-xs">
        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Menu Item, Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dietary & Availability Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {/* Dietary Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDietaryFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                dietaryFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setDietaryFilter('veg')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition ${
                dietaryFilter === 'veg'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Veg</span>
            </button>
            <button
              onClick={() => setDietaryFilter('non_veg')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition ${
                dietaryFilter === 'non_veg'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Non-Veg</span>
            </button>
          </div>

          {/* Availability Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                availabilityFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                availabilityFilter === 'available'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Stock Only
            </button>
            <button
              onClick={() => setAvailabilityFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                availabilityFilter === 'out_of_stock'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Stock
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSTATION CONTENT: CATEGORY RAIL + MENU ITEMS GRID/TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* LEFT CATEGORY RAIL / SIDEBAR */}
        <div className="lg:col-span-3 xl:col-span-2 bg-white border border-slate-200 rounded-xl p-3 space-y-1 self-start shadow-xs">
          <div className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider px-2 pb-1 flex items-center justify-between border-b border-slate-100">
            <span>Categories</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
              {categories.length}
            </span>
          </div>

          <div className="space-y-1 max-h-[650px] overflow-y-auto scrollbar-none pt-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${selectedCategoryId === 'all' ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {menuItems.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts.get(cat.id) || 0;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold shrink-0 ${
                      isSelected ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT MENU ITEMS AREA */}
        <div className="lg:col-span-9 xl:col-span-10 space-y-3">
          {filteredMenuItems.length > 0 ? (
            viewMode === 'grid' ? (
              /* DENSE WORKSTATION CARDS GRID */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl p-3 flex flex-col justify-between space-y-2.5 transition-all shadow-2xs relative ${
                      !item.is_available
                        ? 'border-red-200 bg-red-50/20 opacity-80'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Veg/Non-Veg Icon, Badges, Edit Button */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {/* Veg / Non-Veg Icon */}
                        <div
                          className={`w-4 h-4 border flex items-center justify-center rounded-xs shrink-0 ${
                            item.is_veg !== false ? 'border-emerald-600 bg-white' : 'border-rose-600 bg-white'
                          }`}
                          title={item.is_veg !== false ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.is_veg !== false ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                        </div>

                        {/* Bestseller Badge */}
                        {item.is_bestseller && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>Bestseller</span>
                          </span>
                        )}

                        {/* Chef Special Badge */}
                        {item.is_chef_special && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                            <span>Special</span>
                          </span>
                        )}
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Edit Menu Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Item Details */}
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight line-clamp-1">
                        {item.name || item.item_name}
                      </h3>
                      {item.category && (
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                          {item.category}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Price & Fast Availability Toggle Switch */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block text-[10px] uppercase">Price</span>
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          {formatCurrency(item.price)}
                        </span>
                      </div>

                      {/* Availability Switch */}
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1.5 transition cursor-pointer ${
                          item.is_available
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-300'
                        }`}
                        title="Toggle POS Availability"
                      >
                        {item.is_available ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            <span>IN STOCK</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-red-500" />
                            <span>OUT OF STOCK</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* DENSE WORKSTATION TABLE VIEW */
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Item Name & Type</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Badges</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-center">Availability Switch</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {filteredMenuItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            !item.is_available ? 'bg-red-50/20 text-slate-500' : ''
                          }`}
                        >
                          {/* Name & Type */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 ${
                                  item.is_veg !== false ? 'border-emerald-600 bg-white' : 'border-rose-600 bg-white'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.is_veg !== false ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`}
                                />
                              </div>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {item.name || item.item_name}
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-700">
                            {item.category || '—'}
                          </td>

                          {/* Badges */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              {item.is_bestseller && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                  Bestseller
                                </span>
                              )}
                              {item.is_chef_special && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-300">
                                  Special
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-black text-sm text-slate-900">
                            {formatCurrency(item.price)}
                          </td>

                          {/* Availability Switch */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              className={`px-2 py-1 rounded text-[10px] font-extrabold flex items-center space-x-1 mx-auto cursor-pointer transition ${
                                item.is_available
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              {item.is_available ? 'AVAILABLE' : 'OUT OF STOCK'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* EMPTY STATE */
            <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No menu items found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery
                  ? `No items match "${searchQuery}".`
                  : 'There are currently no menu items in this category.'}
              </p>
              <button
                onClick={handleOpenCreateItem}
                className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Item</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MENU ITEM MODAL */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingItem ? `Edit "${editingItem.name || editingItem.item_name}"` : 'Add New Menu Item'}
                </h3>
              </div>
              <button
                onClick={() => setItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {itemFormError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-2.5 rounded-lg font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{itemFormError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Item Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Butter Masala"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Category & Price Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={itemFormData.category_id}
                    onChange={(e) => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 240"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief item summary or ingredients..."
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* Flags Toggles */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.is_veg}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_veg: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-800">Vegetarian (Veg)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.is_available}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_available: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-bold text-slate-800">Available in POS</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.is_bestseller}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_bestseller: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-800">Bestseller Badge</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.is_chef_special}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_chef_special: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-bold text-slate-800">Chef Special</span>
                </label>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setItemModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold"
              >
                Cancel
              </Button>

              <button
                onClick={handleSaveItem}
                disabled={isSavingItem}
                className="py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingItem ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{editingItem ? 'Save Changes' : 'Create Item'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-extrabold text-slate-900">Manage Categories</h3>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {catFormError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-2.5 rounded-lg font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{catFormError}</span>
              </div>
            )}

            {/* Existing Categories List */}
            <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-200">
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {categoryCounts.get(cat.id) || 0} items
                  </span>
                </div>
              ))}
            </div>

            {/* Add New Category */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-200">
              <h4 className="font-bold text-slate-900 uppercase text-[11px]">Add New Category</h4>
              <input
                type="text"
                placeholder="Category Name (e.g. Starters)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500"
              />
              <input
                type="text"
                placeholder="Description (Optional)"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleCreateCategory}
                disabled={isSavingCat}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingCat ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save New Category</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => setCategoryModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
