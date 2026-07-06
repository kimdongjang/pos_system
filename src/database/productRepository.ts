import { db, type Product } from './dexie';

export interface ProductSearchFilters {
  creatorName?: string;
  vtuberName?: string;
  goodsType?: string;
  keyword?: string;
  isActive?: boolean;
}

export class DexieProductRepository {
  async add(product: Omit<Product, 'id'>): Promise<number> {
    return db.products.add(product);
  }

  async bulkPut(products: Product[]): Promise<void> {
    await db.products.bulkPut(products);
  }

  async replaceAll(products: Product[]): Promise<void> {
    await db.transaction('rw', db.products, async () => {
      await db.products.clear();
      await db.products.bulkAdd(products.map(({ id, ...product }) => product));
    });
  }

  async update(productCode: string, patch: Partial<Omit<Product, 'id' | 'productCode' | 'createdAt'>>): Promise<void> {
    const updated = await db.products.where('productCode').equals(productCode).modify({
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw new Error(`상품을 찾을 수 없습니다: ${productCode}`);
  }

  async getAll(): Promise<Product[]> {
    return db.products.orderBy('productCode').toArray();
  }

  async getByCreator(creatorName: string): Promise<Product[]> {
    return db.products.where('creatorName').equals(creatorName).sortBy('productCode');
  }

  async getByVtuber(vtuberName: string): Promise<Product[]> {
    return db.products.where('vtuberName').equals(vtuberName).sortBy('productCode');
  }

  async getByGoodsType(goodsType: string): Promise<Product[]> {
    return db.products.where('goodsType').equals(goodsType).sortBy('productCode');
  }

  async getByProductCode(productCode: string): Promise<Product | undefined> {
    return db.products.where('productCode').equals(productCode).first();
  }

  async search(filters: ProductSearchFilters = {}): Promise<Product[]> {
    const keyword = filters.keyword?.trim().toLowerCase();
    const products = await db.products.toArray();
    return products
      .filter((product) => filters.creatorName ? product.creatorName === filters.creatorName : true)
      .filter((product) => filters.vtuberName ? product.vtuberName === filters.vtuberName : true)
      .filter((product) => filters.goodsType ? product.goodsType === filters.goodsType : true)
      .filter((product) => typeof filters.isActive === 'boolean' ? product.isActive === filters.isActive : true)
      .filter((product) => {
        if (!keyword) return true;
        return [
          product.productCode,
          product.goodsType,
          product.vtuberName,
          product.creatorName,
          product.size,
          product.setGroupName,
          product.setDescription,
        ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
      })
      .sort((a, b) => a.productCode.localeCompare(b.productCode));
  }

  async updateStock(productCode: string, stockQty: number): Promise<void> {
    const updatedAt = new Date().toISOString();
    const updated = await db.products.where('productCode').equals(productCode).modify({ stockQty, updatedAt });
    if (!updated) throw new Error(`상품을 찾을 수 없습니다: ${productCode}`);
  }

  async decreaseStock(productCode: string, qty: number): Promise<void> {
    await db.transaction('rw', db.products, async () => {
      const product = await this.getByProductCode(productCode);
      if (!product) throw new Error(`상품을 찾을 수 없습니다: ${productCode}`);
      const nextQty = Number(product.stockQty || 0) - Number(qty || 0);
      if (nextQty < 0) throw new Error(`${product.productCode} 재고가 부족합니다.`);
      await db.products.update(product.id!, { stockQty: nextQty, updatedAt: new Date().toISOString() });
    });
  }
}

export const productRepository = new DexieProductRepository();
