import { Metadata } from 'next';
import { SuppliersView } from '@/features/suppliers/components/SuppliersView';

export const metadata: Metadata = {
  title: 'Suppliers | WebRajya POS',
  description: 'Manage raw material suppliers and vendors for WebRajya POS',
};

export default function SuppliersPage() {
  return <SuppliersView />;
}
