import { Metadata } from 'next';
import { getServerPayments } from '@/services/payments/serverPaymentService';
import { PaymentsView } from '@/features/payments/components/PaymentsView';

export const metadata: Metadata = {
  title: 'Payments & Settlement - WebRajya POS',
  description: 'Track collected restaurant payments, settlement methods, split transactions, and receipt reprinting',
};

export default async function PaymentsPage() {
  const { payments, summary } = await getServerPayments();

  return <PaymentsView initialPayments={payments} initialSummary={summary} />;
}
