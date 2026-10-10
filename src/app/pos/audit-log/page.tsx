import { AuditLogView } from '@/features/audit/components/AuditLogView';

export const metadata = {
  title: 'Audit Log & History | WebRajya POS',
  description: 'Comprehensive system audit log tracking all restaurant actions and changes for WebRajya POS',
};

export default function AuditLogPage() {
  return <AuditLogView />;
}
