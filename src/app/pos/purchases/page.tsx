import { Metadata } from 'next';
import { PurchasesView } from '@/features/purchases/components/PurchasesView';

export const metadata: Metadata = {
  title: 'Purchases | WebRajya POS',
  description: 'Manage purchase orders, receiving, and vendor transactions for WebRajya POS',
};

export default function PurchasesPage() {
  return <PurchasesView />;
}
