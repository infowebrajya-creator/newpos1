/**
 * WebRajya POS Offline-First Storage & Synchronization Service
 * Enables full operational offline capability: order creation, KOT dispatch, and billing
 * even during Wi-Fi or internet outages.
 */

export interface PendingOfflineOrder {
  id: string;
  tableSessionId?: string;
  cartItems: any[];
  paymentMethod?: string;
  isPaid?: boolean;
  type: 'kot' | 'save_and_bill';
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'webrajya_pos_offline_queue_v1';
const MENU_CACHE_KEY = 'webrajya_pos_menu_cache_v1';
const TABLES_CACHE_KEY = 'webrajya_pos_tables_cache_v1';

/**
 * Save pending order to offline queue when offline
 */
export function enqueueOfflineOrder(order: Omit<PendingOfflineOrder, 'id' | 'timestamp'>): PendingOfflineOrder {
  const existingQueue = getOfflineQueue();
  const newOrder: PendingOfflineOrder = {
    ...order,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
  };

  const updatedQueue = [...existingQueue, newOrder];
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (err) {
    console.error('Failed to save to offline queue:', err);
  }

  return newOrder;
}

/**
 * Get all queued offline orders
 */
export function getOfflineQueue(): PendingOfflineOrder[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Remove an order from offline queue after successful sync
 */
export function dequeueOfflineOrder(id: string) {
  const existingQueue = getOfflineQueue();
  const updatedQueue = existingQueue.filter((item) => item.id !== id);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (err) {
    console.error('Failed to update offline queue:', err);
  }
}

/**
 * Cache Menu Data in Local Storage
 */
export function setOfflineMenuCache(categories: any[], menuItems: any[]) {
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({ categories, menuItems, timestamp: Date.now() }));
  } catch {
    // Ignore storage quota limits
  }
}

/**
 * Retrieve Cached Menu Data from Local Storage
 */
export function getOfflineMenuCache(): { categories: any[]; menuItems: any[] } | null {
  try {
    const data = localStorage.getItem(MENU_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Cache Floor & Tables Data in Local Storage
 */
export function setOfflineTablesCache(tables: any[]) {
  try {
    localStorage.setItem(TABLES_CACHE_KEY, JSON.stringify({ tables, timestamp: Date.now() }));
  } catch {
    // Ignore
  }
}

/**
 * Retrieve Cached Floor & Tables Data
 */
export function getOfflineTablesCache(): any[] | null {
  try {
    const data = localStorage.getItem(TABLES_CACHE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.tables || null;
  } catch {
    return null;
  }
}
