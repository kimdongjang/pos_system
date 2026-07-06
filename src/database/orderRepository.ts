import { db, type StoredOrder, type SyncStatus } from './dexie';

export interface OrderRepository {
  add(order: Omit<StoredOrder, 'id'>): Promise<number>;
  getAll(): Promise<StoredOrder[]>;
  getPendingOrders(): Promise<StoredOrder[]>;
  countWaiting(): Promise<number>;
  updateStatus(id: number, syncStatus: SyncStatus, patch?: Partial<StoredOrder>): Promise<void>;
  deletePendingByLocalOrderId(localOrderId: string): Promise<number>;
}

export class DexieOrderRepository implements OrderRepository {
  async add(order: Omit<StoredOrder, 'id'>): Promise<number> {
    return db.orders.add(order);
  }

  async getAll(): Promise<StoredOrder[]> {
    return db.orders.orderBy('createdAt').toArray();
  }

  async getPendingOrders(): Promise<StoredOrder[]> {
    return db.orders
      .where('syncStatus')
      .anyOf(['PENDING', 'FAILED'])
      .sortBy('createdAt');
  }

  async countWaiting(): Promise<number> {
    return db.orders.where('syncStatus').anyOf(['PENDING', 'FAILED', 'SYNCING']).count();
  }

  async updateStatus(id: number, syncStatus: SyncStatus, patch: Partial<StoredOrder> = {}): Promise<void> {
    await db.orders.update(id, { ...patch, syncStatus });
  }

  async deletePendingByLocalOrderId(localOrderId: string): Promise<number> {
    return db.orders
      .where('localOrderId')
      .equals(localOrderId)
      .and((order) => order.syncStatus === 'PENDING' || order.syncStatus === 'FAILED')
      .delete();
  }
}

export const orderRepository = new DexieOrderRepository();