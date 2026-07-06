import { db, type OrderPayload, type StoredOrder, type SyncStatus } from './dexie';

export interface OrderRepository {
  add(order: Omit<StoredOrder, 'id'>): Promise<number>;
  addWithStockDecrease(order: Omit<StoredOrder<OrderPayload>, 'id'>): Promise<number>;
  getAll(): Promise<StoredOrder[]>;
  getPendingOrders(): Promise<StoredOrder[]>;
  countWaiting(): Promise<number>;
  updateStatus(id: number, syncStatus: SyncStatus, patch?: Partial<StoredOrder>): Promise<void>;
}

export class DexieOrderRepository implements OrderRepository {
  async add(order: Omit<StoredOrder, 'id'>): Promise<number> {
    return db.orders.add(order);
  }

  async addWithStockDecrease(order: Omit<StoredOrder<OrderPayload>, 'id'>): Promise<number> {
    return db.transaction('rw', db.orders, db.products, async () => {
      const soldByProduct = new Map<string, number>();
      for (const item of order.payload.items) {
        soldByProduct.set(item.productCode, (soldByProduct.get(item.productCode) || 0) + Number(item.qty || 0));
      }

      for (const [productCode, qty] of soldByProduct) {
        const product = await db.products.where('productCode').equals(productCode).first();
        if (!product || !product.id) throw new Error(`상품을 찾을 수 없습니다: ${productCode}`);
        if (Number(product.stockQty || 0) < qty) {
          throw new Error(`${product.goodsType} ${product.vtuberName} (${product.creatorName}) 재고가 부족합니다.`);
        }
      }

      const updatedAt = new Date().toISOString();
      for (const [productCode, qty] of soldByProduct) {
        const product = await db.products.where('productCode').equals(productCode).first();
        await db.products.update(product!.id!, {
          stockQty: Number(product!.stockQty || 0) - qty,
          updatedAt,
        });
      }

      return db.orders.add(order);
    });
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
}

export const orderRepository = new DexieOrderRepository();