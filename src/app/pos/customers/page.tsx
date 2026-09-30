import { Metadata } from 'next';
import { CustomersView } from '@/features/customers/components/CustomersView';

export const metadata: Metadata = {
  title: 'Customers | WebRajya POS',
  description: 'Manage customer profiles and guest history for WebRajya POS',
};

export default function CustomersPage() {
  return <CustomersView />;
}
