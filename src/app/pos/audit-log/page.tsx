import { Metadata } from 'next';
import { AuditLogView } from '@/features/audit/components/AuditLogView';

export const metadata: Metadata = {
  title: 'Audit Log & System Activity | WebRajya POS',
  description: 'Immutable operational audit trail, security events, cancellations & system configuration history for WebRajya POS',
};

export default function AuditLogPage() {
  return <AuditLogView />;
}
