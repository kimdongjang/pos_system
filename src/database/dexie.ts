import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

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

  constructor() {
    super('booth-pos-offline-db');

    this.version(1).stores({
      orders: '++id, localOrderId, createdAt, syncStatus, retryCount, lastSyncAt',
    });
  }
}

export const db = new PosDatabase();