import { db } from './dexie';

export interface PosStateCache {
  products: unknown[];
  bundles: unknown[];
  sales: unknown[];
}

const POS_STATE_KEY = 'latest';

export const stateRepository = {
  async save(state: PosStateCache): Promise<void> {
    await db.posState.put({
      key: POS_STATE_KEY,
      updatedAt: new Date().toISOString(),
      state,
    });
  },

  async get(): Promise<PosStateCache | null> {
    const cached = await db.posState.get(POS_STATE_KEY);
    return (cached?.state as PosStateCache | undefined) || null;
  },
};