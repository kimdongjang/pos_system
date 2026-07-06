import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface Product {
  id?: number;
  productCode: string;
  goodsType: string;
  vtuberName: string;
  creatorName: string;
  stockQty: number;
  size?: string | null;
  price: number;
  setGroupName?: string | null;
  setPrice?: number | null;
  setDescription?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productCode: string;
  goodsType: string;
  vtuberName: string;
  creatorName: string;
  productName: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  setGroupName?: string | null;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface OrderPayload {
  sellerName?: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  totalAmount: number;
  memo?: string;
}

export interface StoredOrder<TPayload = unknown> {
  id?: number;
  localOrderId: string;
  createdAt: string;
  payload: TPayload;
  syncStatus: SyncStatus;
  retryCount: number;
  lastSyncAt?: string | null;
}

export class PosDatabase extends Dexie {
  orders!: Table<StoredOrder, number>;
  products!: Table<Product, number>;

  constructor() {
    super('booth-pos-offline-db');

    this.version(1).stores({
      orders: '++id, localOrderId, createdAt, syncStatus, retryCount, lastSyncAt',
    });

    this.version(2).stores({
      orders: '++id, localOrderId, createdAt, syncStatus, retryCount, lastSyncAt',
      products: '++id, productCode, goodsType, vtuberName, creatorName, price, stockQty, setGroupName, isActive',
    });
  }
}

export const db = new PosDatabase();