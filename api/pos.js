import { sql } from '@vercel/postgres';
import { requireAuth } from './lib/auth.js';
import { CURRENT_SEED_VERSION, getDefaultBundles, getDefaultProducts } from './lib/defaultData.js';

const uid = () => Math.random().toString(36).slice(2, 9);

async function initDb() {
  await sql`CREATE TABLE IF NOT EXISTS pos_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS pos_products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS pos_bundles (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, items JSONB NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS pos_sales (id TEXT PRIMARY KEY, time TIMESTAMPTZ NOT NULL, method TEXT NOT NULL, total INTEGER NOT NULL, lines JSONB NOT NULL)`;
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
    await sql`INSERT INTO pos_products (id, name, price, stock) VALUES (${p.id}, ${p.name}, ${p.price}, ${p.stock})`;
  }
  for (const b of getDefaultBundles()) {
    await sql`INSERT INTO pos_bundles (id, name, price, items) VALUES (${b.id}, ${b.name}, ${b.price}, ${JSON.stringify(b.items)}::jsonb)`;
  }
  await sql`INSERT INTO pos_meta (key, value) VALUES ('seed_version', ${String(CURRENT_SEED_VERSION)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

async function readState() {
  await seedIfNeeded();
  const [products, bundles, sales] = await Promise.all([
    sql`SELECT id, name, price, stock FROM pos_products ORDER BY id`,
    sql`SELECT id, name, price, items FROM pos_bundles ORDER BY id`,
    sql`SELECT id, time, method, total, lines FROM pos_sales ORDER BY time ASC`,
  ]);
  return {
    products: products.rows,
    bundles: bundles.rows.map((b) => ({ ...b, items: b.items || [] })),
    sales: sales.rows.map((s) => ({ ...s, time: new Date(s.time).toISOString(), lines: s.lines || [] })),
  };
}

async function replaceProducts(products) {
  await initDb();
  await sql`DELETE FROM pos_products`;
  for (const p of products) {
    await sql`INSERT INTO pos_products (id, name, price, stock) VALUES (${p.id || uid()}, ${p.name || '새 굿즈'}, ${Number(p.price) || 0}, ${Number(p.stock) || 0})`;
  }
}

async function replaceBundles(bundles) {
  await initDb();
  await sql`DELETE FROM pos_bundles`;
  for (const b of bundles) {
    await sql`INSERT INTO pos_bundles (id, name, price, items) VALUES (${b.id || uid()}, ${b.name || '새 세트'}, ${Number(b.price) || 0}, ${JSON.stringify(b.items || [])}::jsonb)`;
  }
}

async function finalizeSale({ method, total, cart }) {
  await initDb();
  if (!Array.isArray(cart) || !cart.length) throw new Error('장바구니가 비어 있습니다.');

  const products = (await sql`SELECT id, stock FROM pos_products`).rows;
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
    if (!product || product.stock < sold) throw new Error('재고가 부족합니다. 새로고침 후 다시 시도해주세요.');
  }
  for (const [productId, sold] of soldByProduct) {
    await sql`UPDATE pos_products SET stock = stock - ${sold} WHERE id = ${productId}`;
  }

  const sale = { id: uid(), time: new Date().toISOString(), method, total: Number(total) || 0, lines: cart.map(({ subItems, ...line }) => line) };
  await sql`INSERT INTO pos_sales (id, time, method, total, lines) VALUES (${sale.id}, ${sale.time}, ${sale.method}, ${sale.total}, ${JSON.stringify(sale.lines)}::jsonb)`;
}

async function voidSale(id) {
  await initDb();
  const sale = (await sql`SELECT lines FROM pos_sales WHERE id = ${id}`).rows[0];
  if (!sale) return;
  for (const line of sale.lines || []) {
    if (line.type === 'product') await sql`UPDATE pos_products SET stock = stock + ${Number(line.qty) || 0} WHERE id = ${line.id}`;
    if (line.type === 'bundle') {
      const bundle = (await sql`SELECT items FROM pos_bundles WHERE id = ${line.id}`).rows[0];
      for (const item of bundle?.items || []) {
        await sql`UPDATE pos_products SET stock = stock + ${(Number(item.qty) || 0) * (Number(line.qty) || 0)} WHERE id = ${item.productId}`;
      }
    }
  }
  await sql`DELETE FROM pos_sales WHERE id = ${id}`;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await readState());
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, payload } = req.body || {};
    if (action === 'replaceProducts') await replaceProducts(payload?.products || []);
    else if (action === 'replaceBundles') await replaceBundles(payload?.bundles || []);
    else if (action === 'finalizeSale') await finalizeSale(payload || {});
    else if (action === 'voidSale') await voidSale(payload?.id);
    else if (action === 'clearSales') await sql`DELETE FROM pos_sales`;
    else if (action === 'resetDefaults') { await replaceProducts(getDefaultProducts()); await replaceBundles(getDefaultBundles()); }
    else return res.status(400).json({ error: '알 수 없는 작업입니다.' });

    return res.status(200).json(await readState());
  } catch (error) {
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}