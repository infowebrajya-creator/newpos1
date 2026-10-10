import { ReportsDashboard } from '@/features/reports/components/ReportsDashboard';

export const metadata = {
  title: 'Business Reports & Analytics | WebRajya POS',
  description: 'Detailed financial reports, item sales breakdown, tax summaries, and date range performance reports for WebRajya POS',
};

export default function ReportsPage() {
  return <ReportsDashboard />;
}
