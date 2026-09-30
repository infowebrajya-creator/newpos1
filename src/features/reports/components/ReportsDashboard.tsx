'use client';

import React, { useState, useEffect } from 'react';
import {
  DatePreset,
  DateRange,
  ReportTab,
  SalesOverview,
  DailySalesTrendItem,
  PaymentMethodBreakdownItem,
  TopSellingItem,
  CategorySalesItem,
  HourlySalesItem,
  OrderReportSummary,
  InventoryReportSummary,
  InventoryMovementItem,
  InventoryConsumptionItemReport,
  PurchaseReportSummary,
  SupplierPurchaseAggregate,
  ReservationReportSummary,
  CustomerReportSummary,
  StaffActivityItem,
  AuditLogReportItem,
} from '@/types/reports';
import {
  getDateRangeFromPreset,
  getSalesOverview,
  getDailySalesTrend,
  getPaymentMethodBreakdown,
  getTopSellingItems,
  getCategorySales,
  getHourlySalesDistribution,
  getOrdersReport,
  getInventoryReport,
  getPurchaseReport,
  getReservationReport,
  getCustomerReport,
  getStaffActivityReport,
  getAuditLogReport,
} from '@/services/reports/reportService';
import { ReportDateFilter } from './ReportDateFilter';
import { SalesReportView } from './SalesReportView';
import { PaymentsReportView } from './PaymentsReportView';
import { ItemsReportView } from './ItemsReportView';
import { InventoryReportView } from './InventoryReportView';
import { PurchasesReportView } from './PurchasesReportView';
import { StaffAuditReportView } from './StaffAuditReportView';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Utensils,
  Package,
  ShoppingBag,
  Users,
  Calendar,
  ShieldCheck,
  RefreshCw,
  DollarSign,
  Receipt,
  Percent,
} from 'lucide-react';

export function ReportsDashboard() {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const [range, setRange] = useState<DateRange>(getDateRangeFromPreset('today'));
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [loading, setLoading] = useState(true);

  // Report States
  const [overview, setOverview] = useState<SalesOverview>({
    total_sales: 0,
    paid_bills_count: 0,
    average_bill_value: 0,
    total_discounts: 0,
    gross_sales: 0,
    net_sales: 0,
    tax_amount: 0,
    rounding_amount: 0,
    discounted_bills_count: 0,
    total_complimentary_value: 0,
    complimentary_items_count: 0,
  });

  const [dailyTrend, setDailyTrend] = useState<DailySalesTrendItem[]>([]);
  const [payments, setPayments] = useState<PaymentMethodBreakdownItem[]>([]);
  const [topItems, setTopItems] = useState<TopSellingItem[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesItem[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySalesItem[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<OrderReportSummary>({
    total_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    open_orders: 0,
    average_order_value: 0,
    status_breakdown: {},
  });

  const [inventorySummary, setInventorySummary] = useState<InventoryReportSummary>({
    total_ingredients: 0,
    healthy_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_valuation: 0,
  });

  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovementItem[]>([]);
  const [inventoryConsumptions, setInventoryConsumptions] = useState<InventoryConsumptionItemReport[]>([]);

  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseReportSummary>({
    total_purchases_count: 0,
    received_purchases_count: 0,
    cancelled_purchases_count: 0,
    total_purchase_amount: 0,
  });
  const [supplierAggregates, setSupplierAggregates] = useState<SupplierPurchaseAggregate[]>([]);

  const [reservationSummary, setReservationSummary] = useState<ReservationReportSummary>({
    total_reservations: 0,
    confirmed_count: 0,
    seated_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    no_show_count: 0,
    seated_conversion_percent: 0,
  });

  const [customerSummary, setCustomerSummary] = useState<CustomerReportSummary>({
    total_customers: 0,
    active_customers: 0,
    customers_with_visits: 0,
    customers_with_reservations: 0,
  });

  const [staffActivity, setStaffActivity] = useState<StaffActivityItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogReportItem[]>([]);

  const handleDateChange = (newPreset: DatePreset, start?: string, end?: string) => {
    setPreset(newPreset);
    const newRange = getDateRangeFromPreset(newPreset, start, end);
    setRange(newRange);
  };

  const loadAllReports = async () => {
    try {
      setLoading(true);
      const [
        ovRes,
        dtRes,
        pmRes,
        tiRes,
        csRes,
        hsRes,
        ordRes,
        invRes,
        purRes,
        resRes,
        custRes,
        staffRes,
        auditRes,
      ] = await Promise.allSettled([
        getSalesOverview(range),
        getDailySalesTrend(range),
        getPaymentMethodBreakdown(range),
        getTopSellingItems(range, 20),
        getCategorySales(range),
        getHourlySalesDistribution(range),
        getOrdersReport(range),
        getInventoryReport(range),
        getPurchaseReport(range),
        getReservationReport(range),
        getCustomerReport(),
        getStaffActivityReport(range),
        getAuditLogReport(range),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (dtRes.status === 'fulfilled') setDailyTrend(dtRes.value);
      if (pmRes.status === 'fulfilled') setPayments(pmRes.value);
      if (tiRes.status === 'fulfilled') setTopItems(tiRes.value);
      if (csRes.status === 'fulfilled') setCategorySales(csRes.value);
      if (hsRes.status === 'fulfilled') setHourlySales(hsRes.value);
      if (ordRes.status === 'fulfilled') setOrdersSummary(ordRes.value);
      if (invRes.status === 'fulfilled') {
        setInventorySummary(invRes.value.summary);
        setInventoryMovements(invRes.value.movements);
        setInventoryConsumptions(invRes.value.consumptions);
      }
      if (purRes.status === 'fulfilled') {
        setPurchaseSummary(purRes.value.summary);
        setSupplierAggregates(purRes.value.suppliers);
      }
      if (resRes.status === 'fulfilled') setReservationSummary(resRes.value);
      if (custRes.status === 'fulfilled') setCustomerSummary(custRes.value);
      if (staffRes.status === 'fulfilled') setStaffActivity(staffRes.value);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value);
    } catch (err) {
      console.error('Failed to load reporting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [range]);

  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
    { key: 'orders', label: 'Orders', icon: Receipt },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'items', label: 'Items & Menu', icon: Utensils },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'reservations', label: 'Reservations', icon: Calendar },
    { key: 'staff', label: 'Staff & Audit', icon: ShieldCheck },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only business metrics, daily trends, payment splits, and operational audit logs
            </p>
          </div>
        </div>

        <button
          onClick={loadAllReports}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <ReportDateFilter
        range={range}
        onChangePreset={handleDateChange}
        customStart={customStart}
        customEnd={customEnd}
        setCustomStart={setCustomStart}
        setCustomEnd={setCustomEnd}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-lg overflow-x-auto scrollbar-none shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600">Total Sales</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">
            ₹{overview.total_sales.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {overview.paid_bills_count} paid bills
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600">Average Bill Value</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-700">
            ₹{overview.average_bill_value.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Per paid settlement</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600">Total Orders</span>
            <Utensils className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-mono text-purple-700">
            {ordersSummary.total_orders}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {ordersSummary.completed_orders} completed / paid
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600">Total Discounts</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-700">
            ₹{overview.total_discounts.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {overview.discounted_bills_count} bills discounted
          </span>
        </div>
      </div>

      {/* Tab Content Renderer */}
      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-xs">
          Loading reporting data...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <SalesReportView overview={overview} dailyTrend={dailyTrend} hourlySales={hourlySales} />
          )}

          {activeTab === 'sales' && (
            <SalesReportView overview={overview} dailyTrend={dailyTrend} hourlySales={hourlySales} />
          )}

          {activeTab === 'orders' && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Orders Status Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-bold text-slate-600 block mb-1">Total Orders</span>
                  <span className="text-base font-black font-mono text-slate-900">{ordersSummary.total_orders}</span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs font-bold text-emerald-800 block mb-1">Completed / Paid</span>
                  <span className="text-base font-black font-mono text-emerald-800">{ordersSummary.completed_orders}</span>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs font-bold text-red-800 block mb-1">Cancelled Orders</span>
                  <span className="text-base font-black font-mono text-red-800">{ordersSummary.cancelled_orders}</span>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-bold text-blue-800 block mb-1">Active / Open</span>
                  <span className="text-base font-black font-mono text-blue-800">{ordersSummary.open_orders}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Status Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
                  {Object.entries(ordersSummary.status_breakdown).map(([status, count]) => (
                    <div key={status} className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-600 capitalize block text-[11px] font-medium">{status.replace('_', ' ')}</span>
                      <span className="font-mono font-bold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && <PaymentsReportView payments={payments} />}

          {activeTab === 'items' && <ItemsReportView topItems={topItems} categorySales={categorySales} />}

          {activeTab === 'inventory' && (
            <InventoryReportView
              summary={inventorySummary}
              movements={inventoryMovements}
              consumptions={inventoryConsumptions}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesReportView summary={purchaseSummary} suppliers={supplierAggregates} />
          )}

          {activeTab === 'customers' && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Customer Metrics Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-bold text-slate-600 block mb-1">Total Profiles</span>
                  <span className="text-base font-black font-mono text-slate-900">{customerSummary.total_customers}</span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs font-bold text-emerald-800 block mb-1">Active Guests</span>
                  <span className="text-base font-black font-mono text-emerald-800">{customerSummary.active_customers}</span>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-bold text-blue-800 block mb-1">Guests with Visits</span>
                  <span className="text-base font-black font-mono text-blue-800">{customerSummary.customers_with_visits}</span>
                </div>
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-xs font-bold text-purple-800 block mb-1">Guests with Reservations</span>
                  <span className="text-base font-black font-mono text-purple-800">{customerSummary.customers_with_reservations}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Reservation Performance Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-bold text-slate-600 block mb-1">Total Booked</span>
                  <span className="text-base font-black font-mono text-slate-900">{reservationSummary.total_reservations}</span>
                </div>
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-xs font-bold text-purple-800 block mb-1">Seated & Completed</span>
                  <span className="text-base font-black font-mono text-purple-800">
                    {reservationSummary.seated_count + reservationSummary.completed_count}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs font-bold text-emerald-800 block mb-1">Seated Conversion</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    {reservationSummary.seated_conversion_percent}%
                  </span>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs font-bold text-red-800 block mb-1">Cancelled / No-Show</span>
                  <span className="text-base font-black font-mono text-red-800">
                    {reservationSummary.cancelled_count + reservationSummary.no_show_count}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <StaffAuditReportView staff={staffActivity} auditLogs={auditLogs} />
          )}
        </>
      )}
    </div>
  );
}
