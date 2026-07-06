import { useMemo } from 'react';
import type { OrderPayload, StoredOrder } from '../database/dexie';
import {
  filterOrders,
  getCreatorSalesSummary,
  getGoodsTypeSalesSummary,
  getVtuberSalesSummary,
  type OrderFilters,
} from '../services/salesSummaryService';

export function useSalesSummary(orders: StoredOrder<OrderPayload>[], filters: OrderFilters) {
  const filteredOrders = useMemo(() => filterOrders(orders, filters), [orders, filters]);
  const creatorSummary = useMemo(() => getCreatorSalesSummary(filteredOrders), [filteredOrders]);
  const vtuberSummary = useMemo(() => getVtuberSalesSummary(filteredOrders), [filteredOrders]);
  const goodsTypeSummary = useMemo(() => getGoodsTypeSalesSummary(filteredOrders), [filteredOrders]);

  return { filteredOrders, creatorSummary, vtuberSummary, goodsTypeSummary };
}