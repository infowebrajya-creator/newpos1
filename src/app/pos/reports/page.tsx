import { Metadata } from 'next';
import { ReportsDashboard } from '@/features/reports/components/ReportsDashboard';

export const metadata: Metadata = {
  title: 'Reports & Analytics | WebRajya POS',
  description: 'Read-only sales overview, payment method breakdown, menu item sales, and audit logs for WebRajya POS',
};

export default function ReportsPage() {
  return <ReportsDashboard />;
}
