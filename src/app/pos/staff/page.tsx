import { StaffDashboard } from '@/features/staff/components/StaffDashboard';

export const metadata = {
  title: 'Staff & Role Permissions | WebRajya POS',
  description: 'Manage staff profiles, assign roles (Owner, Manager, Cashier, Waiter, Kitchen), and configure permissions matrix for WebRajya POS',
};

export default function StaffPage() {
  return <StaffDashboard />;
}
