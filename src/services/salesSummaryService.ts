import type { OrderPayload, StoredOrder, SyncStatus, PaymentMethod } from '../database/dexie';

export interface OrderFilters {
  fromDate?: string;
  toDate?: string;
  paymentMethod?: PaymentMethod | '';
  syncStatus?: SyncStatus | '';
  vtuberName?: string;
  creatorName?: string;
  goodsType?: string;
  keyword?: string;
}

export interface SalesSummaryRow {
  name: string;
  qty: number;
  amount: number;
  orderCount: number;
  cashAmount: number;
  bankTransferAmount: number;
}

const payloadOf = (order: StoredOrder<OrderPayload>): OrderPayload => order.payload as OrderPayload;
const normalize = (value: unknown) => String(value ?? '').toLowerCase();

export function filterOrders(
  orders: StoredOrder<OrderPayload>[],
  filters: OrderFilters = {},
): StoredOrder<OrderPayload>[] {
  const keyword = filters.keyword?.trim().toLowerCase();
  const fromTime = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`).getTime() : null;
  const toTime = filters.toDate ? new Date(`${filters.toDate}T23:59:59.999`).getTime() : null;

  return orders.filter((order) => {
    const payload = payloadOf(order);
    const createdTime = new Date(order.createdAt).getTime();
    const items = Array.isArray(payload?.items) ? payload.items : [];

    if (fromTime && createdTime < fromTime) return false;
    if (toTime && createdTime > toTime) return false;
    if (filters.paymentMethod && payload.paymentMethod !== filters.paymentMethod) return false;
    if (filters.syncStatus && order.syncStatus !== filters.syncStatus) return false;
    if (filters.vtuberName && !items.some((item) => item.vtuberName === filters.vtuberName)) return false;
    if (filters.creatorName && !items.some((item) => item.creatorName === filters.creatorName)) return false;
    if (filters.goodsType && !items.some((item) => item.goodsType === filters.goodsType)) return false;

    if (!keyword) return true;
    return [order.localOrderId, payload.sellerName, ...items.flatMap((item) => [
      item.productCode,
      item.goodsType,
      item.vtuberName,
      item.creatorName,
      item.productName,
      item.setGroupName,
    ])].some((value) => normalize(value).includes(keyword));
  });
}

function getGroupedSalesSummary(
  orders: StoredOrder<OrderPayload>[],
  keyGetter: (item: OrderPayload['items'][number]) => string,
): SalesSummaryRow[] {
  const summary = new Map<string, SalesSummaryRow & { orderIds: Set<string> }>();

  for (const order of orders) {
    const payload = payloadOf(order);
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const groupsInOrder = new Set<string>();

    for (const item of items) {
      const name = keyGetter(item) || '미지정';
      const row = summary.get(name) || {
        name,
        qty: 0,
        amount: 0,
        orderCount: 0,
        cashAmount: 0,
        bankTransferAmount: 0,
        orderIds: new Set<string>(),
      };
      const lineTotal = Number(item.lineTotal || 0);
      row.qty += Number(item.qty || 0);
      row.amount += lineTotal;
      if (payload.paymentMethod === 'CASH') row.cashAmount += lineTotal;
      if (payload.paymentMethod === 'BANK_TRANSFER') row.bankTransferAmount += lineTotal;
      row.orderIds.add(order.localOrderId);
      groupsInOrder.add(name);
      summary.set(name, row);
    }

    for (const name of groupsInOrder) {
      const row = summary.get(name);
      if (row) row.orderCount = row.orderIds.size;
    }
  }

  return Array.from(summary.values())
    .map(({ orderIds, ...row }) => row)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ko-KR'));
}

export const getCreatorSalesSummary = (orders: StoredOrder<OrderPayload>[]) =>
  getGroupedSalesSummary(orders, (item) => item.creatorName);

export const getVtuberSalesSummary = (orders: StoredOrder<OrderPayload>[]) =>
  getGroupedSalesSummary(orders, (item) => item.vtuberName);

export const getGoodsTypeSalesSummary = (orders: StoredOrder<OrderPayload>[]) =>
  getGroupedSalesSummary(orders, (item) => item.goodsType);