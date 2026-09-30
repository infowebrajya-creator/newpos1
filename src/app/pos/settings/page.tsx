import { Metadata } from 'next';
import { SettingsDashboard } from '@/features/settings/components/SettingsDashboard';

export const metadata: Metadata = {
  title: 'Settings & System Configuration | WebRajya POS',
  description: 'Operational restaurant profile, thermal hardware printer routing, POS & billing defaults, and module shortcuts for WebRajya POS',
};

export default function SettingsPage() {
  return <SettingsDashboard />;
}
