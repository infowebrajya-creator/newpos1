import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, dequeueOfflineOrder } from '@/services/offline/offlineStorageService';
import { saveAndBill, submitKot } from '@/services/apiServices';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const syncPendingQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    for (const item of queue) {
      try {
        if (item.type === 'kot') {
          await submitKot({
            tableSessionId: item.tableSessionId,
            cartItems: item.cartItems,
          });
        } else if (item.type === 'save_and_bill') {
          await saveAndBill({
            tableSessionId: item.tableSessionId,
            cartItems: item.cartItems,
            paymentMethod: item.paymentMethod,
            isPaid: item.isPaid,
          });
        }
        dequeueOfflineOrder(item.id);
      } catch (err) {
        console.error('Error syncing queued offline order:', err);
      }
    }
    setPendingQueueCount(getOfflineQueue().length);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingQueue]);

  return {
    isOnline,
    pendingQueueCount,
    isSyncing,
    syncPendingQueue,
  };
}
