import { useCallback, useEffect, useState } from 'react';
import { productRepository } from '../database/productRepository';
import { seedProductsIfEmpty } from '../database/seedProducts';
import type { Product } from '../database/dexie';

export function useProducts(enabled = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      await seedProductsIfEmpty();
      setProducts(await productRepository.getAll());
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (productCode: string, patch: Partial<Product>) => {
    await productRepository.update(productCode, patch);
    await refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    if (enabled) void refreshProducts();
  }, [enabled, refreshProducts]);

  return { products, loading, refreshProducts, updateProduct };
}