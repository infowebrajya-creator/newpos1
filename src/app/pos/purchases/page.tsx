import { PurchasesView } from '@/features/purchases/components/PurchasesView';

export const metadata = {
  title: 'Stock Purchases & Inward Supplies | WebRajya POS',
  description: 'Record stock purchase invoices, track supplier bills, and manage inventory inward supplies for WebRajya POS',
};

export default function PurchasesPage() {
  return <PurchasesView />;
}
