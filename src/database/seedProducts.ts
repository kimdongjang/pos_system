import { db } from './dexie';
import { initialProducts } from './initialProducts';

export async function seedProductsIfEmpty(): Promise<void> {
  const count = await db.products.count();
  if (count > 0) return;
  await db.products.bulkAdd(initialProducts);
}
