import { Metadata } from 'next';
import { StaffDashboard } from '@/features/staff/components/StaffDashboard';

export const metadata: Metadata = {
  title: 'Staff & Team Management | WebRajya POS',
  description: 'Operational staff directory, role assignments, permission matrices, and security audit logs for WebRajya POS',
};

export default function StaffPage() {
  return <StaffDashboard />;
}
