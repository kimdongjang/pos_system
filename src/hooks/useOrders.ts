import { useCallback, useEffect, useState } from 'react';
import { orderRepository } from '../database/orderRepository';
import type { OrderPayload, StoredOrder } from '../database/dexie';

export function useOrders(enabled = true) {
  const [orders, setOrders] = useState<StoredOrder<OrderPayload>[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await orderRepository.getAll();
      setOrders(rows as StoredOrder<OrderPayload>[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refreshOrders();
  }, [enabled, refreshOrders]);

  return { orders, loading, refreshOrders };
}