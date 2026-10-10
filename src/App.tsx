import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useCurrentUser } from '@/hooks/useCurrentUser';
import { PosShellLayout } from '@/components/layout/PosShellLayout';
import { getRestaurantSettings } from '@/services/settings/settingsService';
import { RestaurantSettings } from '@/types';

// Core direct imports for instant POS boot
import LoginPage from '@/app/login/page';
import { TablesView } from '@/features/tables/components/TablesView';
import { OrderView } from '@/features/pos/components/OrderView';

// Lazy-loaded routes for optimal bundle performance
const OrdersManagementView = lazy(() => import('@/features/orders/components/OrdersManagementView').then(m => ({ default: m.OrdersManagementView })));
const KitchenDisplayView = lazy(() => import('@/features/kitchen/components/KitchenDisplayView').then(m => ({ default: m.KitchenDisplayView })));
const BillingView = lazy(() => import('@/features/billing/components/BillingView').then(m => ({ default: m.BillingView })));
const PaymentsView = lazy(() => import('@/features/payments/components/PaymentsView').then(m => ({ default: m.PaymentsView })));
const MenuManagementView = lazy(() => import('@/features/menu/components/MenuManagementView').then(m => ({ default: m.MenuManagementView })));
const RecipesView = lazy(() => import('@/features/recipes/components/RecipesView').then(m => ({ default: m.RecipesView })));
const InventoryView = lazy(() => import('@/features/inventory/components/InventoryView').then(m => ({ default: m.InventoryView })));
const PurchasesView = lazy(() => import('@/features/purchases/components/PurchasesView').then(m => ({ default: m.PurchasesView })));
const SuppliersView = lazy(() => import('@/features/suppliers/components/SuppliersView').then(m => ({ default: m.SuppliersView })));
const CustomersView = lazy(() => import('@/features/customers/components/CustomersView').then(m => ({ default: m.CustomersView })));
const ReportsDashboard = lazy(() => import('@/features/reports/components/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const AnalyticsDashboard = lazy(() => import('@/features/analytics/components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const AuditLogView = lazy(() => import('@/features/audit/components/AuditLogView').then(m => ({ default: m.AuditLogView })));
const StaffDashboard = lazy(() => import('@/features/staff/components/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const SettingsDashboard = lazy(() => import('@/features/settings/components/SettingsDashboard').then(m => ({ default: m.SettingsDashboard })));

function RouteLoader() {
  return (
    <div className="flex items-center justify-center p-12 min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  );
}

// Shell layout wrapper that loads settings and handles auth protection
function ShellContainer({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useCurrentUser();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  useEffect(() => {
    getRestaurantSettings().then(setSettings).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!user || (profile && !profile.is_active)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PosShellLayout initialUser={user} initialProfile={profile} settings={settings}>
      <Suspense fallback={<RouteLoader />}>
        {children}
      </Suspense>
    </PosShellLayout>
  );
}

// Wrapper for OrderView that parses query parameters (e.g. ?tableId=... & ?type=...)
function OrderViewRoute() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId') || undefined;
  const initialOrderType = (searchParams.get('type') as any) || undefined;
  return <OrderView tableId={tableId} initialOrderType={initialOrderType} />;
}

// Wrapper for BillingView that parses query parameters
function BillingViewRoute() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId') || undefined;
  return <BillingView initialTableId={tableId} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/pos"
            element={
              <ShellContainer>
                <TablesView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/order"
            element={
              <ShellContainer>
                <OrderViewRoute />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/tables"
            element={
              <ShellContainer>
                <TablesView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/orders"
            element={
              <ShellContainer>
                <OrdersManagementView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/kitchen"
            element={
              <ShellContainer>
                <KitchenDisplayView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/billing"
            element={
              <ShellContainer>
                <BillingViewRoute />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/payments"
            element={
              <ShellContainer>
                <PaymentsView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/menu"
            element={
              <ShellContainer>
                <MenuManagementView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/recipes"
            element={
              <ShellContainer>
                <RecipesView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/inventory"
            element={
              <ShellContainer>
                <InventoryView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/purchases"
            element={
              <ShellContainer>
                <PurchasesView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/suppliers"
            element={
              <ShellContainer>
                <SuppliersView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/customers"
            element={
              <ShellContainer>
                <CustomersView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/reports"
            element={
              <ShellContainer>
                <ReportsDashboard />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/analytics"
            element={
              <ShellContainer>
                <AnalyticsDashboard />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/audit-log"
            element={
              <ShellContainer>
                <AuditLogView />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/staff"
            element={
              <ShellContainer>
                <StaffDashboard />
              </ShellContainer>
            }
          />
          <Route
            path="/pos/settings"
            element={
              <ShellContainer>
                <SettingsDashboard />
              </ShellContainer>
            }
          />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
