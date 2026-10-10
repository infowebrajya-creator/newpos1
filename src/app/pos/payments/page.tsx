import { PaymentsView } from '@/features/payments/components/PaymentsView';

export const metadata = {
  title: 'Payment Transactions & Settlements | WebRajya POS',
  description: 'View all paid bills, filter by payment method, print transaction receipts, and track split payments for WebRajya POS',
};

export default function PaymentsPage() {
  return <PaymentsView />;
}
