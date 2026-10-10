import { SettingsDashboard } from '@/features/settings/components/SettingsDashboard';

export const metadata = {
  title: 'Restaurant Settings & Configuration | WebRajya POS',
  description: 'Configure restaurant info, tax rates, currency symbol, printer setup, and receipt header/footer for WebRajya POS',
};

export default function SettingsPage() {
  return <SettingsDashboard />;
}
