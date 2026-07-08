import { sql } from '@vercel/postgres';
import { requireAuth, validateAdminPassword } from './lib/auth.js';
import { CURRENT_SEED_VERSION, getDefaultBundles, getDefaultProducts } from './lib/defaultData.js';

const uid = () => Math.random().toString(36).slice(2, 9);

function productDisplayName(product) {
  if (product.name) return product.name;
  return [product.vtuberName, product.goodsType, product.creatorName ? `(${product.creatorName})` : ''].filter(Boolean).join(' ') || '새 굿즈';
}

function normalizeProduct(product) {
  const now = new Date().toISOString();
  const productCode = product.productCode || product.id || uid();
  const stockQty = Number(product.stockQty ?? product.stock ?? 0) || 0;
  return {
    id: String(product.id || productCode),
    productCode: String(productCode),
    goodsType: product.goodsType || product.name || '새 굿즈',
    vtuberName: product.vtuberName || '',
    creatorName: product.creatorName || '',
    stockQty,
    initialStockQty: Number(product.initialStockQty ?? stockQty) || 0,
    size: product.size || null,
    price: Number(product.price) || 0,
    setCreatorName: product.setCreatorName || null,
    setGroupName: product.setGroupName || null,
    setPrice: product.setPrice == null ? null : Number(product.setPrice) || 0,
    setDescription: product.setDescription || null,
    isActive: product.isActive !== false,
    createdAt: product.createdAt || now,
    updatedAt: now,
  };
}

function hasPostgresConnectionString() {
  return Boolean(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL,
  );
}

function assertPostgresConnectionString() {
  if (hasPostgresConnectionString()) return;
  throw new Error('Vercel 환경변수 POSTGRES_URL이 설정되지 않았습니다. Vercel Storage에서 Postgres를 연결하거나 POSTGRES_URL을 Environment Variables에 추가하세요.');
}

async function initDb() {
  assertPostgresConnectionString();
  await sql`CREATE TABLE IF NOT EXISTS pos_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS pos_products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS pos_bundles (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, items JSONB NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS pos_sales (id TEXT PRIMARY KEY, time TIMESTAMPTZ NOT NULL, method TEXT NOT NULL, total INTEGER NOT NULL, lines JSONB NOT NULL)`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS product_code TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS goods_type TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS vtuber_name TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS creator_name TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS stock_qty INTEGER`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS initial_stock_qty INTEGER`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS size TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS set_creator_name TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS set_group_name TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS set_price INTEGER`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS set_description TEXT`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
}

async function seedIfNeeded() {
  await initDb();
  const meta = await sql`SELECT value FROM pos_meta WHERE key = 'seed_version'`;
  const count = await sql`SELECT COUNT(*)::int AS count FROM pos_products`;
  const seeded = Number(meta.rows[0]?.value || 0) === CURRENT_SEED_VERSION && count.rows[0]?.count > 0;
  if (seeded) return;

  await sql`DELETE FROM pos_products`;
  await sql`DELETE FROM pos_bundles`;
  for (const p of getDefaultProducts()) {
    const product = normalizeProduct(p);
    await sql`INSERT INTO pos_products (id, name, price, stock, product_code, goods_type, vtuber_name, creator_name, stock_qty, initial_stock_qty, size, set_creator_name, set_group_name, set_price, set_description, is_active, created_at, updated_at) VALUES (${product.id}, ${productDisplayName(product)}, ${product.price}, ${product.stockQty}, ${product.productCode}, ${product.goodsType}, ${product.vtuberName}, ${product.creatorName}, ${product.stockQty}, ${product.initialStockQty}, ${product.size}, ${product.setCreatorName}, ${product.setGroupName}, ${product.setPrice}, ${product.setDescription}, ${product.isActive}, ${product.createdAt}, ${product.updatedAt})`;
  }
  for (const b of getDefaultBundles()) {
    await sql`INSERT INTO pos_bundles (id, name, price, items) VALUES (${b.id}, ${b.name}, ${b.price}, ${JSON.stringify(b.items)}::jsonb)`;
  }
  await sql`INSERT INTO pos_meta (key, value) VALUES ('seed_version', ${String(CURRENT_SEED_VERSION)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

async function readState() {
  await seedIfNeeded();
  const [products, bundles, sales] = await Promise.all([
    sql`SELECT id, name, price, stock, product_code, goods_type, vtuber_name, creator_name, stock_qty, initial_stock_qty, size, set_creator_name, set_group_name, set_price, set_description, is_active, created_at, updated_at FROM pos_products WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY id`,
    sql`SELECT id, name, price, items FROM pos_bundles ORDER BY id`,
    sql`SELECT id, time, method, total, lines FROM pos_sales ORDER BY time ASC`,
  ]);
  return {
    products: products.rows.map((p) => ({
      id: p.id,
      productCode: p.product_code || p.id,
      goodsType: p.goods_type || p.name,
      vtuberName: p.vtuber_name || '',
      creatorName: p.creator_name || '',
      stockQty: Number(p.stock_qty ?? p.stock ?? 0),
      initialStockQty: Number(p.initial_stock_qty ?? p.stock_qty ?? p.stock ?? 0),
      size: p.size || null,
      price: Number(p.price) || 0,
      setCreatorName: p.set_creator_name || null,
      setGroupName: p.set_group_name || null,
      setPrice: p.set_price == null ? null : Number(p.set_price) || 0,
      setDescription: p.set_description || null,
      isActive: p.is_active !== false,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
      name: p.name || productDisplayName({ vtuberName: p.vtuber_name, goodsType: p.goods_type, creatorName: p.creator_name }),
      stock: Number(p.stock_qty ?? p.stock ?? 0),
    })),
    bundles: bundles.rows.map((b) => ({ ...b, items: b.items || [] })),
    sales: sales.rows.map((s) => ({ ...s, time: new Date(s.time).toISOString(), lines: s.lines || [] })),
  };
}

async function replaceProducts(products) {
  await initDb();
  await sql`DELETE FROM pos_products`;
  for (const p of products) {
    const product = normalizeProduct(p);
    await sql`INSERT INTO pos_products (id, name, price, stock, product_code, goods_type, vtuber_name, creator_name, stock_qty, initial_stock_qty, size, set_creator_name, set_group_name, set_price, set_description, is_active, created_at, updated_at) VALUES (${product.id}, ${productDisplayName(product)}, ${product.price}, ${product.stockQty}, ${product.productCode}, ${product.goodsType}, ${product.vtuberName}, ${product.creatorName}, ${product.stockQty}, ${product.initialStockQty}, ${product.size}, ${product.setCreatorName}, ${product.setGroupName}, ${product.setPrice}, ${product.setDescription}, ${product.isActive}, ${product.createdAt}, ${product.updatedAt})`;
  }
}

async function updateProduct(productInput) {
  await initDb();
  const product = normalizeProduct(productInput || {});
  const result = await sql`
    UPDATE pos_products
    SET name = ${productDisplayName(product)},
        price = ${product.price},
        stock = ${product.stockQty},
        product_code = ${product.productCode},
        goods_type = ${product.goodsType},
        vtuber_name = ${product.vtuberName},
        creator_name = ${product.creatorName},
        stock_qty = ${product.stockQty},
        initial_stock_qty = ${product.initialStockQty},
        size = ${product.size},
        set_creator_name = ${product.setCreatorName},
        set_group_name = ${product.setGroupName},
        set_price = ${product.setPrice},
        set_description = ${product.setDescription},
        is_active = ${product.isActive},
        updated_at = NOW()
    WHERE id = ${product.id}
  `;
  if (result.rowCount === 0) throw new Error('수정할 상품을 찾을 수 없습니다. 새 상품은 + 굿즈 추가 후 저장해주세요.');
}

async function upsertDefaultCatalog() {
  await initDb();
  for (const p of getDefaultProducts()) {
    const product = normalizeProduct(p);
    await sql`
      INSERT INTO pos_products (id, name, price, stock, product_code, goods_type, vtuber_name, creator_name, stock_qty, initial_stock_qty, size, set_creator_name, set_group_name, set_price, set_description, is_active, created_at, updated_at)
      VALUES (${product.id}, ${productDisplayName(product)}, ${product.price}, ${product.stockQty}, ${product.productCode}, ${product.goodsType}, ${product.vtuberName}, ${product.creatorName}, ${product.stockQty}, ${product.initialStockQty}, ${product.size}, ${product.setCreatorName}, ${product.setGroupName}, ${product.setPrice}, ${product.setDescription}, ${product.isActive}, ${product.createdAt}, ${product.updatedAt})
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          price = EXCLUDED.price,
          product_code = EXCLUDED.product_code,
          goods_type = EXCLUDED.goods_type,
          vtuber_name = EXCLUDED.vtuber_name,
          creator_name = EXCLUDED.creator_name,
          initial_stock_qty = EXCLUDED.initial_stock_qty,
          size = EXCLUDED.size,
          set_creator_name = EXCLUDED.set_creator_name,
          set_group_name = EXCLUDED.set_group_name,
          set_price = EXCLUDED.set_price,
          set_description = EXCLUDED.set_description,
          is_active = TRUE,
          updated_at = NOW()
    `;
  }
  for (const b of getDefaultBundles()) {
    await sql`
      INSERT INTO pos_bundles (id, name, price, items)
      VALUES (${b.id}, ${b.name}, ${b.price}, ${JSON.stringify(b.items)}::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          price = EXCLUDED.price,
          items = EXCLUDED.items
    `;
  }
  await sql`INSERT INTO pos_meta (key, value) VALUES ('seed_version', ${String(CURRENT_SEED_VERSION)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

async function replaceBundles(bundles) {
  await initDb();
  await sql`DELETE FROM pos_bundles`;
  for (const b of bundles) {
    await sql`INSERT INTO pos_bundles (id, name, price, items) VALUES (${b.id || uid()}, ${b.name || '새 세트'}, ${Number(b.price) || 0}, ${JSON.stringify(b.items || [])}::jsonb)`;
  }
}

async function finalizeSale({ localOrderId, createdAt, method, total, cart }) {
  await initDb();
  if (!Array.isArray(cart) || !cart.length) throw new Error('장바구니가 비어 있습니다.');
  const saleId = localOrderId || uid();
  const exists = (await sql`SELECT id FROM pos_sales WHERE id = ${saleId}`).rows[0];
  if (exists) return;

  const products = (await sql`SELECT id, stock, stock_qty FROM pos_products`).rows;
  const soldByProduct = new Map();
  for (const line of cart) {
    if (line.type === 'product') soldByProduct.set(line.id, (soldByProduct.get(line.id) || 0) + Number(line.qty || 0));
    if (line.type === 'bundle') {
      const bundle = (await sql`SELECT items FROM pos_bundles WHERE id = ${line.id}`).rows[0];
      for (const item of bundle?.items || []) {
        soldByProduct.set(item.productId, (soldByProduct.get(item.productId) || 0) + Number(item.qty || 0) * Number(line.qty || 0));
      }
    }
  }

  for (const [productId, sold] of soldByProduct) {
    const product = products.find((p) => p.id === productId);
    if (!product || Number(product.stock_qty ?? product.stock ?? 0) < sold) throw new Error('재고가 부족합니다. 새로고침 후 다시 시도해주세요.');
  }
  for (const [productId, sold] of soldByProduct) {
    await sql`UPDATE pos_products SET stock = stock - ${sold}, stock_qty = COALESCE(stock_qty, stock) - ${sold}, updated_at = NOW() WHERE id = ${productId}`;
  }

  const sale = { id: saleId, time: createdAt || new Date().toISOString(), method, total: Number(total) || 0, lines: cart.map(({ subItems, ...line }) => line) };
  await sql`INSERT INTO pos_sales (id, time, method, total, lines) VALUES (${sale.id}, ${sale.time}, ${sale.method}, ${sale.total}, ${JSON.stringify(sale.lines)}::jsonb)`;
}

async function finalizeExternalSale(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) throw new Error('주문 상품이 비어 있습니다.');

  await initDb();
  const products = (await sql`SELECT id, name, price, product_code, goods_type, vtuber_name, creator_name FROM pos_products`).rows;
  const cart = items.map((item) => {
    const product = products.find((p) => (
      p.product_code === item.productCode ||
      p.id === item.productCode ||
      p.id === item.id ||
      (
        p.goods_type === item.goodsType &&
        p.vtuber_name === item.vtuberName &&
        p.creator_name === item.creatorName
      )
    ));
    const qty = Number(item.qty ?? item.quantity ?? item.count ?? 1) || 1;
    return {
      type: 'product',
      id: product?.id || item.productCode || item.id,
      productCode: item.productCode || product?.product_code || product?.id,
      name: product?.name || productDisplayName(item),
      unitPrice: Number(item.price ?? item.unitPrice ?? product?.price ?? 0) || 0,
      qty,
      goodsType: item.goodsType,
      vtuberName: item.vtuberName,
      creatorName: item.creatorName,
    };
  });

  const method = order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'transfer' ? 'transfer' : 'cash';
  await finalizeSale({
    localOrderId: order.localOrderId || order.orderId || uid(),
    createdAt: order.createdAt || new Date().toISOString(),
    method,
    total: Number(order.totalAmount ?? order.total ?? cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)) || 0,
    cart,
  });
}

async function voidSale(id) {
  await initDb();
  const sale = (await sql`SELECT lines FROM pos_sales WHERE id = ${id}`).rows[0];
  if (!sale) return;
  for (const line of sale.lines || []) {
    if (line.type === 'product') await sql`UPDATE pos_products SET stock = stock + ${Number(line.qty) || 0}, stock_qty = COALESCE(stock_qty, stock) + ${Number(line.qty) || 0}, updated_at = NOW() WHERE id = ${line.id}`;
    if (line.type === 'bundle') {
      const bundle = (await sql`SELECT items FROM pos_bundles WHERE id = ${line.id}`).rows[0];
      for (const item of bundle?.items || []) {
        await sql`UPDATE pos_products SET stock = stock + ${(Number(item.qty) || 0) * (Number(line.qty) || 0)}, stock_qty = COALESCE(stock_qty, stock) + ${(Number(item.qty) || 0) * (Number(line.qty) || 0)}, updated_at = NOW() WHERE id = ${item.productId}`;
      }
    }
  }
  await sql`DELETE FROM pos_sales WHERE id = ${id}`;
}

async function clearSales(password) {
  if (!validateAdminPassword(password)) throw new Error('패스워드가 올바르지 않습니다.');
  await initDb();
  await sql`DELETE FROM pos_sales`;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await readState());
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, payload } = req.body || {};
    if (!action && Array.isArray(req.body?.items)) await finalizeExternalSale(req.body);
    else if (action === 'replaceProducts') await replaceProducts(payload?.products || []);
    else if (action === 'updateProduct') await updateProduct(payload?.product);
    else if (action === 'replaceBundles') await replaceBundles(payload?.bundles || []);
    else if (action === 'finalizeSale') await finalizeSale(payload || {});
    else if (action === 'voidSale') await voidSale(payload?.id);
    else if (action === 'clearSales') await clearSales(payload?.password);
    else if (action === 'upsertDefaults') await upsertDefaultCatalog();
    else if (action === 'resetDefaults') { await replaceProducts(getDefaultProducts()); await replaceBundles(getDefaultBundles()); }
    else return res.status(400).json({ error: '알 수 없는 작업입니다.' });

    return res.status(200).json(await readState());
  } catch (error) {
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}