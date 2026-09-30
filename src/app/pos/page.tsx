import Link from 'next/link';
import { getServerCurrentUserProfile } from '@/services/auth/serverAuthService';
import { getServerRestaurantSettings } from '@/services/settings/serverSettingsService';
import { getServerTablesWithActiveSessions, getServerTableStats } from '@/services/tables/serverTableService';
import { getServerAllBills } from '@/services/billing/serverBillingService';
import { getServerAllRecentOrders } from '@/services/orders/serverOrderService';
import { getServerPayments } from '@/services/payments/serverPaymentService';
import { Badge } from '@/components/ui/Badge';
import {
  DollarSign,
  ShoppingBag,
  UtensilsCrossed,
  ChefHat,
  Store,
  Clock,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  Layers,
  BarChart3,
  ArrowRight,
  TrendingUp,
  FileText,
  CreditCard,
  Package,
  Users,
} from 'lucide-react';

export default async function PosDashboardPage() {
  const [profile, settings, tableStats, tables, bills, recentOrders, paymentsData] = await Promise.all([
    getServerCurrentUserProfile(),
    getServerRestaurantSettings(),
    getServerTableStats(),
    getServerTablesWithActiveSessions(),
    getServerAllBills(),
    getServerAllRecentOrders(),
    getServerPayments(),
  ]);

  const userName = profile?.full_name || 'Team Member';
  const restaurantName = settings?.name || 'WebRajya Restaurant';
  const role = profile?.role || 'cashier';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Helper function to check if timestamp belongs to today in local timezone
  const isDateToday = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Unified financial statistics (Matching Payments & Settlement Workstation)
  const todaySales = paymentsData.summary.totalCollected > 0
    ? paymentsData.summary.totalCollected
    : bills.filter((b) => isDateToday(b.created_at)).reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);

  const paidBillsCount = paymentsData.summary.totalCount > 0
    ? paymentsData.summary.totalCount
    : bills.filter((b) => isDateToday(b.created_at) && b.status === 'paid').length;

  const avgOrderValue = paidBillsCount > 0 ? Math.round(todaySales / paidBillsCount) : todaySales > 0 ? Math.round(todaySales) : 0;
  const occupancyPercent = tableStats.totalTables > 0 ? Math.round((tableStats.occupiedTables / tableStats.totalTables) * 100) : 0;

  const activeOrdersList = recentOrders.slice(0, 5);

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-10">
      {/* 1. HERO BANNER: Sleek Executive Welcome Block */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black uppercase tracking-wider text-red-400">
                {greeting}
              </span>
              <Badge role={role}>{role}</Badge>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Shift Active</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {userName}
            </h1>
            <div className="flex items-center space-x-2 text-slate-400 text-xs sm:text-sm font-medium">
              <Store className="w-4 h-4 text-red-500" />
              <span className="text-slate-200 font-bold">{restaurantName}</span>
              <span>•</span>
              <span className="text-slate-400">WebRajya POS Active Counter</span>
            </div>
          </div>

          {/* Quick Launch Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/pos/order"
              className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs rounded-xl flex items-center space-x-2 shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>+ New Order</span>
            </Link>

            <Link
              href="/pos/tables"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-2 shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Floor Plan</span>
            </Link>

            <Link
              href="/pos/orders"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl flex items-center space-x-2 border border-slate-700 transition active:scale-[0.98] cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-indigo-400" />
              <span>Live Orders</span>
            </Link>

            <Link
              href="/pos/menu"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl flex items-center space-x-2 border border-slate-700 transition active:scale-[0.98] cursor-pointer"
            >
              <Store className="w-4 h-4 text-amber-400" />
              <span>Menu Catalog</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹ {todaySales.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {paidBillsCount} paid {paidBillsCount === 1 ? 'bill' : 'bills'} collected today
            </p>
          </div>
        </div>

        {/* Card 2: Today's Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {recentOrders.length}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Active shift transaction rounds
            </p>
          </div>
        </div>

        {/* Card 3: Table Occupancy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Table Floor Status
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {tableStats.occupiedTables} / {tableStats.totalTables}
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {occupancyPercent}% Occupied
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {tableStats.availableTables} tables ready for guests
            </p>
          </div>
        </div>

        {/* Card 4: Avg Order Value */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Average Ticket Size
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹ {avgOrderValue.toFixed(0)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Average spend per completed bill
            </p>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSTATION GRID (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Floor Status Overview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="w-5 h-5 text-red-700" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Live Table Floor Plan
              </h2>
            </div>
            <Link
              href="/pos/tables"
              className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center space-x-1"
            >
              <span>View Full Floor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Table Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {tables.map((table) => {
              const isOccupied = table.status === 'occupied';
              const isBillReq = table.status === 'bill_requested';
              const isAvailable = table.status === 'available';

              let statusColor = 'bg-slate-50 border-slate-200 text-slate-700';
              let badgeText = 'Available';

              if (isOccupied) {
                statusColor = 'bg-red-50 border-red-200 text-red-800';
                badgeText = 'Occupied';
              } else if (isBillReq) {
                statusColor = 'bg-amber-50 border-amber-200 text-amber-800';
                badgeText = 'Bill Req';
              }

              return (
                <Link
                  key={table.id}
                  href={`/pos/order?tableId=${table.id}`}
                  className={`p-3 border rounded-xl flex flex-col justify-between space-y-2 hover:shadow-md transition cursor-pointer ${statusColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-tight">
                      {table.table_number}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/80 border border-current">
                      {badgeText}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                    <span>{table.floor_name || 'Main Floor'}</span>
                    <span>Cap: {table.capacity}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 Col): Recent Orders & Fast Workstation Shortcuts */}
        <div className="space-y-6">
          {/* Recent Live Orders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-red-700" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Recent Orders
                </h2>
              </div>
              <Link
                href="/pos/orders"
                className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {activeOrdersList.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-4 text-center">No orders recorded yet today.</p>
              ) : (
                activeOrdersList.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900">
                          {ord.table_number ? `Table ${ord.table_number}` : `Order #${ord.order_number}`}
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-white border border-slate-200 text-slate-700">
                          {ord.order_type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {ord.total_items || 0} items • ₹ {(ord.total_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ord.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Workstation Shortcuts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Quick POS Workstations
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <Link
                href="/pos/billing"
                className="p-3 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl flex items-center space-x-2 text-slate-800 hover:text-red-700 transition"
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>Billing History</span>
              </Link>
              <Link
                href="/pos/payments"
                className="p-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl flex items-center space-x-2 text-slate-800 hover:text-purple-700 transition"
              >
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Payments</span>
              </Link>
              <Link
                href="/pos/inventory"
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl flex items-center space-x-2 text-slate-800 hover:text-emerald-700 transition"
              >
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Stock Inventory</span>
              </Link>
              <Link
                href="/pos/reports"
                className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl flex items-center space-x-2 text-slate-800 hover:text-blue-700 transition"
              >
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Sales Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REALTIME SYSTEM SYNC FOOTER BADGE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center space-x-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-extrabold text-white">
            Table Management & Realtime Sync Active
          </span>
          <span className="text-slate-400 font-medium">
            — Connected to Supabase backend & live terminal syncing.
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Terminal Active</span>
        </div>
      </div>
    </div>
  );
}
