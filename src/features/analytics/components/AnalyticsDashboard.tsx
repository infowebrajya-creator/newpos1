'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DatePreset,
  DateRange,
  SalesOverview,
  DailySalesTrendItem,
  PaymentMethodBreakdownItem,
  TopSellingItem,
  CategorySalesItem,
  HourlySalesItem,
  OrderReportSummary,
  InventoryReportSummary,
  PurchaseReportSummary,
  ReservationReportSummary,
  CustomerReportSummary,
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
} from '@/services/reports/reportService';
import { ReportDateFilter } from '@/features/reports/components/ReportDateFilter';
import { SalesTrendChart } from './SalesTrendChart';
import { HourlyPatternChart } from './HourlyPatternChart';
import { PaymentMixChart } from './PaymentMixChart';
import { ItemPerformanceChart } from './ItemPerformanceChart';
import {
  LineChart,
  RefreshCw,
  DollarSign,
  Receipt,
  Utensils,
  Percent,
  Package,
  ShoppingBag,
  Users,
  Calendar,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export function AnalyticsDashboard() {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const [range, setRange] = useState<DateRange>(getDateRangeFromPreset('today'));
  const [loading, setLoading] = useState(true);

  // Analytics & Reporting States
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

  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseReportSummary>({
    total_purchases_count: 0,
    received_purchases_count: 0,
    cancelled_purchases_count: 0,
    total_purchase_amount: 0,
  });

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

  const handleDateChange = (newPreset: DatePreset, start?: string, end?: string) => {
    setPreset(newPreset);
    const newRange = getDateRangeFromPreset(newPreset, start, end);
    setRange(newRange);
  };

  const loadAllAnalytics = async () => {
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
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (dtRes.status === 'fulfilled') setDailyTrend(dtRes.value);
      if (pmRes.status === 'fulfilled') setPayments(pmRes.value);
      if (tiRes.status === 'fulfilled') setTopItems(tiRes.value);
      if (csRes.status === 'fulfilled') setCategorySales(csRes.value);
      if (hsRes.status === 'fulfilled') setHourlySales(hsRes.value);
      if (ordRes.status === 'fulfilled') setOrdersSummary(ordRes.value);
      if (invRes.status === 'fulfilled') setInventorySummary(invRes.value.summary);
      if (purRes.status === 'fulfilled') setPurchaseSummary(purRes.value.summary);
      if (resRes.status === 'fulfilled') setReservationSummary(resRes.value);
      if (custRes.status === 'fulfilled') setCustomerSummary(custRes.value);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [range]);

  const totalCollected = payments.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Analytics & Business Intelligence</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual business trends, operational demand patterns, payment mix, and inventory/procurement indicators
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Shortcuts */}
          <Link
            href="/pos/reports"
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
            <span>Open Reports</span>
          </Link>

          <button
            onClick={loadAllAnalytics}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
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

      {/* Executive Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">Gross Sales</span>
            <DollarSign className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xl font-black font-mono text-slate-900">
            ₹{overview.gross_sales.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
            {overview.paid_bills_count} paid settlements
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">Net Revenue</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-700">
            ₹{overview.net_sales.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
            After ₹{overview.total_discounts.toFixed(2)} discounts
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">Average Bill Value</span>
            <Utensils className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black font-mono text-purple-700">
            ₹{overview.average_bill_value.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
            {ordersSummary.total_orders} total orders recorded
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">Payments Collected</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black font-mono text-blue-700">
            ₹{totalCollected.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
            Across all payment methods
          </span>
        </div>
      </div>

      {/* Primary Visual Analytics Section */}
      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse flex items-center justify-center text-slate-400 text-xs">
          Loading analytics & trend insights...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Sales Trend Visualization */}
          <SalesTrendChart dailyTrend={dailyTrend} />

          {/* Secondary Visual Charts: Hourly Pattern & Payment Mix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HourlyPatternChart hourlySales={hourlySales} />
            <PaymentMixChart payments={payments} />
          </div>

          {/* Menu & Category Performance */}
          <ItemPerformanceChart topItems={topItems} categorySales={categorySales} />

          {/* Operational Module Analytics Strips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Inventory Indicator */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Inventory Health</h4>
                </div>
                <Link href="/pos/inventory" className="text-[11px] font-bold text-red-600 hover:underline">
                  View →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-md">
                  <span className="text-emerald-800 text-[10px] uppercase font-bold block">Healthy</span>
                  <span className="font-mono font-bold text-emerald-800">{inventorySummary.healthy_count}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-md">
                  <span className="text-amber-800 text-[10px] uppercase font-bold block">Low</span>
                  <span className="font-mono font-bold text-amber-800">{inventorySummary.low_stock_count}</span>
                </div>
                <div className="bg-red-50 border border-red-200 p-2 rounded-md">
                  <span className="text-red-800 text-[10px] uppercase font-bold block">Out</span>
                  <span className="font-mono font-bold text-red-800">{inventorySummary.out_of_stock_count}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Stock Valuation:</span>
                <span className="font-mono font-bold text-slate-900">₹{inventorySummary.total_valuation.toFixed(2)}</span>
              </div>
            </div>

            {/* Procurement Summary */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Procurement Analytics</h4>
                </div>
                <Link href="/pos/purchases" className="text-[11px] font-bold text-red-600 hover:underline">
                  View →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-md">
                  <span className="text-slate-600 text-[10px] uppercase font-bold block">Total POs</span>
                  <span className="font-mono font-bold text-slate-900">{purchaseSummary.total_purchases_count}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-md">
                  <span className="text-emerald-800 text-[10px] uppercase font-bold block">Received</span>
                  <span className="font-mono font-bold text-emerald-800">{purchaseSummary.received_purchases_count}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Total PO Spend:</span>
                <span className="font-mono font-bold text-slate-900">₹{purchaseSummary.total_purchase_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer & Reservations */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase">CRM & Reservations</h4>
                </div>
                <Link href="/pos/reservations" className="text-[11px] font-bold text-red-600 hover:underline">
                  View →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-md">
                  <span className="text-slate-600 text-[10px] uppercase font-bold block">Guest Profiles</span>
                  <span className="font-mono font-bold text-slate-900">{customerSummary.total_customers}</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-2 rounded-md">
                  <span className="text-purple-800 text-[10px] uppercase font-bold block">Bookings</span>
                  <span className="font-mono font-bold text-purple-800">{reservationSummary.total_reservations}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100 font-medium">
                <span>Seated Conversion:</span>
                <span className="font-mono font-bold text-emerald-700">{reservationSummary.seated_conversion_percent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
