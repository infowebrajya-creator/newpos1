import { getServerAllRecentOrders } from '@/services/orders/serverOrderService';
import { OrdersManagementView } from '@/features/orders/components/OrdersManagementView';

export const metadata = {
  title: 'Orders - WebRajya POS',
  description: 'Restaurant order management and order status tracking',
};

export default async function OrdersPage() {
  const orders = await getServerAllRecentOrders();

  return <OrdersManagementView initialOrders={orders} />;
}
