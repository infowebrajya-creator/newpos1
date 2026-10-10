import { CustomersView } from '@/features/customers/components/CustomersView';

export const metadata = {
  title: 'Customer Directory & CRM | WebRajya POS',
  description: 'Manage restaurant customers, track visit history, spend totals, and contact details for WebRajya POS',
};

export default function CustomersPage() {
  return <CustomersView />;
}
