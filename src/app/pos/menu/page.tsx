import { getServerAllMenuCategories, getServerAllMenuItems } from '@/services/menu/serverMenuService';
import { MenuManagementView } from '@/features/menu/components/MenuManagementView';

export const metadata = {
  title: 'Menu Management - WebRajya POS',
  description: 'Restaurant menu item catalog, pricing, categories & instant availability management',
};

export default async function MenuPage() {
  const [categories, menuItems] = await Promise.all([
    getServerAllMenuCategories(),
    getServerAllMenuItems(),
  ]);

  return (
    <MenuManagementView
      initialCategories={categories}
      initialMenuItems={menuItems}
    />
  );
}
