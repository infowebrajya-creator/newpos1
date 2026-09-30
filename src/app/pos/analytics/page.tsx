import { Metadata } from 'next';
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics & Business Intelligence | WebRajya POS',
  description: 'Visual business intelligence, trend analytics, hourly sales patterns, and payment method distribution for WebRajya POS',
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
