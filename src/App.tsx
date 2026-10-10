import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useCurrentUser } from '@/hooks/useCurrentUser';
import { PosShellLayout } from '@/components/layout/PosShellLayout';
import { getRestaurantSettings } from '@/services/settings/settingsService';
import { RestaurantSettings } from '@/types';

// Page components
import LoginPage from '@/app/login/page';
import { OrderView } from '@/features/pos/components/OrderView';
import { TablesView } from '@/features/tables/components/TablesView';
import { OrdersManagementView } from '@/features/orders/components/OrdersManagementView';
import { KitchenDisplayView } from '@/features/kitchen/components/KitchenDisplayView';
import { BillingView } from '@/features/billing/components/BillingView';
import { PaymentsView } from '@/features/payments/components/PaymentsView';
import { MenuManagementView } from '@/features/menu/components/MenuManagementView';
import { RecipesView } from '@/features/recipes/components/RecipesView';
import { InventoryView } from '@/features/inventory/components/InventoryView';
import { PurchasesView } from '@/features/purchases/components/PurchasesView';
import { SuppliersView } from '@/features/suppliers/components/SuppliersView';
import { CustomersView } from '@/features/customers/components/CustomersView';
import { ReportsDashboard } from '@/features/reports/components/ReportsDashboard';
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';
import { AuditLogView } from '@/features/audit/components/AuditLogView';
import { StaffDashboard } from '@/features/staff/components/StaffDashboard';
import { SettingsDashboard } from '@/features/settings/components/SettingsDashboard';

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
      {children}
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
