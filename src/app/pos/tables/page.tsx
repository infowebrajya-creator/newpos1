import { getServerFloors, getServerTablesWithActiveSessions } from '@/services/tables/serverTableService';
import { TablesView } from '@/features/tables/components/TablesView';

export const metadata = {
  title: 'Tables - WebRajya POS',
  description: 'Manage restaurant tables and active dining sessions',
};

export default async function PosTablesPage() {
  const [floors, tables] = await Promise.all([
    getServerFloors(),
    getServerTablesWithActiveSessions(),
  ]);

  return <TablesView initialFloors={floors} initialTables={tables} />;
}
