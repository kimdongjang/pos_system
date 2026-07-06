import { useCallback, useMemo, useState } from 'react';
import { SyncStatus } from './components/SyncStatus';
import { initialProducts } from './database/initialProducts';
import { orderRepository } from './database/orderRepository';
import { productRepository } from './database/productRepository';
import { useOrders } from './hooks/useOrders';
import { useProducts } from './hooks/useProducts';
import { useSalesSummary } from './hooks/useSalesSummary';
import { useSync } from './hooks/useSync';
import { createLocalOrderId } from './utils/orderId';

const AUTH_TOKEN_KEY = 'pos_admin_token';
const VTUBERS = ['카후', '리메', '이세계정서', '하루사루히', '코코', '시엘', '아스', 'V.W.P', '츠미바'];
const CREATORS = ['세페일', '짱고래', '기은', 'Ama', '민수', '레이', '나글이'];
const GOODS_TYPES = ['장패드', '아크릴키링', '누들스토퍼', '회지', '아크릴스탠드액자', '엽서', '아크릴스탠드', '캔뱃지', '아크릴 포토카드', '띠부씰', '스티커', '티셔츠'];
const SYNC_LABEL = { PENDING: '동기화 대기', SYNCING: '동기화 중', SYNCED: '동기화 완료', FAILED: '동기화 실패' };
const PAY_LABEL = { CASH: '현금', BANK_TRANSFER: '계좌이체' };
const won = (n) => Number(n || 0).toLocaleString('ko-KR');
const productName = (p) => [p?.vtuberName, p?.goodsType, p?.size].filter(Boolean).join(' ');

async function requestJson(url, options = {}) {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청 처리에 실패했습니다.');
  return data;
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(AUTH_TOKEN_KEY));
  const [loginId, setLoginId] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [screen, setScreen] = useState('pos');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);
  const [sellerName, setSellerName] = useState('admin');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [saleMode, setSaleMode] = useState('all');
  const [saleValue, setSaleValue] = useState('');
  const [saleKeyword, setSaleKeyword] = useState('');
  const [productFilters, setProductFilters] = useState({ vtuberName: '', creatorName: '', goodsType: '', isActive: '', keyword: '' });
  const [editingCode, setEditingCode] = useState('');
  const [orderFilters, setOrderFilters] = useState({ fromDate: '', toDate: '', paymentMethod: '', syncStatus: '', vtuberName: '', creatorName: '', goodsType: '', keyword: '' });
  const [salesTab, setSalesTab] = useState('orders');
  const [expandedOrderId, setExpandedOrderId] = useState('');

  const getAuthToken = useCallback(() => sessionStorage.getItem(AUTH_TOKEN_KEY), []);
  const sync = useSync({ enabled: Boolean(token), getAuthToken });
  const { products, loading: productsLoading, refreshProducts, updateProduct } = useProducts(Boolean(token));
  const { orders, loading: ordersLoading, refreshOrders } = useOrders(Boolean(token));
  const { filteredOrders, creatorSummary, vtuberSummary, goodsTypeSummary } = useSalesSummary(orders, orderFilters);

  const login = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await requestJson('/api/auth', { method: 'POST', body: JSON.stringify({ id: loginId, password: loginPassword }) });
      sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setToken(data.token);
      setSellerName(loginId);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const logout = () => { sessionStorage.removeItem(AUTH_TOKEN_KEY); setToken(null); setCart([]); };
  const refreshAll = async () => Promise.all([refreshProducts(), refreshOrders(), sync.refreshPendingCount()]);
  const reservedQty = (code, target = cart) => target.reduce((sum, line) => sum + (line.productCode === code ? line.qty : 0), 0);
  const availableStock = (product, target = cart) => Math.max(0, Number(product?.stockQty || 0) - reservedQty(product?.productCode, target));
  const total = cart.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.qty || 0), 0);

  const saleOptions = saleMode === 'vtuber' ? VTUBERS : saleMode === 'creator' ? CREATORS : saleMode === 'goodsType' ? GOODS_TYPES : [];
  const filteredProducts = useMemo(() => products.filter((p) => {
    if (!p.isActive) return false;
    if (saleMode === 'vtuber' && saleValue && p.vtuberName !== saleValue) return false;
    if (saleMode === 'creator' && saleValue && p.creatorName !== saleValue) return false;
    if (saleMode === 'goodsType' && saleValue && p.goodsType !== saleValue) return false;
    const q = saleKeyword.trim().toLowerCase();
    return !q || [p.goodsType, p.vtuberName, p.creatorName, p.productCode, p.setGroupName].filter(Boolean).join(' ').toLowerCase().includes(q);
  }), [products, saleMode, saleValue, saleKeyword]);

  const managedProducts = useMemo(() => products.filter((p) => {
    if (productFilters.vtuberName && p.vtuberName !== productFilters.vtuberName) return false;
    if (productFilters.creatorName && p.creatorName !== productFilters.creatorName) return false;
    if (productFilters.goodsType && p.goodsType !== productFilters.goodsType) return false;
    if (productFilters.isActive !== '' && String(p.isActive) !== productFilters.isActive) return false;
    const q = productFilters.keyword.trim().toLowerCase();
    return !q || [p.productCode, p.goodsType, p.vtuberName, p.creatorName, p.size, p.setGroupName].filter(Boolean).join(' ').toLowerCase().includes(q);
  }), [products, productFilters]);

  const setGroups = useMemo(() => Object.values(products.reduce((acc, p) => {
    if (!p.setGroupName) return acc;
    acc[p.setGroupName] ||= { name: p.setGroupName, price: p.setPrice, description: p.setDescription, products: [] };
    acc[p.setGroupName].products.push(p);
    return acc;
  }, {})), [products]);

  const addProduct = (p) => {
    if (availableStock(p) <= 0) return;
    setCart((prev) => {
      const found = prev.find((line) => line.productCode === p.productCode);
      if (found) return prev.map((line) => line.productCode === p.productCode ? { ...line, qty: line.qty + 1 } : line);
      return [...prev, { productCode: p.productCode, goodsType: p.goodsType, vtuberName: p.vtuberName, creatorName: p.creatorName, productName: productName(p), unitPrice: p.price, qty: 1, setGroupName: p.setGroupName || null }];
    });
  };

  const updateCartQty = (index, diff) => setCart((prev) => {
    const next = [...prev];
    const line = next[index];
    if (!line) return prev;
    if (diff > 0 && availableStock(products.find((p) => p.productCode === line.productCode), prev) <= 0) return prev;
    line.qty += diff;
    return line.qty <= 0 ? next.filter((_, i) => i !== index) : next;
  });

  const finalizeSale = async () => {
    if (!cart.length || saving) return;
    setSaving(true);
    setError('');
    try {
      const items = cart.map((line) => ({ ...line, qty: Number(line.qty), unitPrice: Number(line.unitPrice), lineTotal: Number(line.unitPrice) * Number(line.qty) }));
      await orderRepository.addWithStockDecrease({
        localOrderId: createLocalOrderId(),
        createdAt: new Date().toISOString(),
        payload: { sellerName: sellerName || loginId, paymentMethod, items, totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0) },
        syncStatus: 'PENDING',
        retryCount: 0,
        lastSyncAt: null,
      });
      setCart([]);
      await Promise.all([refreshProducts(), refreshOrders(), sync.refreshPendingCount()]);
      void sync.syncNow();
    } catch (err) {
      alert(err.message || '로컬 주문 저장에 실패했습니다.');
      setError(err.message || '로컬 주문 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const saveProductField = async (product, field, value) => {
    const numeric = ['price', 'stockQty', 'setPrice'].includes(field);
    await updateProduct(product.productCode, { [field]: field === 'setPrice' && value === '' ? null : numeric ? Number(value || 0) : value });
  };
  const resetDefaults = async () => {
    if (!confirm('현재 상품 목록을 기본 목록으로 되돌릴까요?')) return;
    await productRepository.replaceAll(initialProducts);
    await refreshProducts();
    setCart([]);
  };

  if (!token) return <LoginPage loginId={loginId} setLoginId={setLoginId} loginPassword={loginPassword} setLoginPassword={setLoginPassword} loginError={loginError} onSubmit={login} />;
  if (productsLoading && !products.length) return <div className="flex h-full items-center justify-center bg-paper text-register"><div className="rounded-xl border border-line bg-white p-6 font-bold">IndexedDB 상품을 불러오는 중...</div></div>;

  return <div className="flex h-full flex-col bg-paper text-ink">
    <header className="flex shrink-0 items-center justify-between border-b-[3px] border-amber-pos bg-register px-4 py-2.5 text-[#eef3ee]">
      <div className="flex items-center gap-2.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-pos" /><h1 className="display-font text-base font-semibold tracking-wide">부스 포스기</h1>{saving && <span className="text-xs text-amber-pos">저장 중...</span>}</div>
      <nav className="flex flex-wrap items-center justify-end gap-1.5"><SyncStatus sync={sync} />{[['pos', '판매'], ['settings', '상품/세트관리'], ['log', '판매내역']].map(([key, label]) => <button key={key} onClick={() => setScreen(key)} className={`min-h-10 rounded-md border px-4 py-2 text-[13px] ${screen === key ? 'border-amber-pos bg-amber-pos font-bold text-ink' : 'border-white/20 bg-white/10'}`}>{label}</button>)}<button onClick={refreshAll} className="min-h-10 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs">새로고침</button><button onClick={logout} className="min-h-10 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs">로그아웃</button></nav>
    </header>
    {error && <div className="bg-danger px-4 py-2 text-sm text-white">{error}</div>}
    {screen === 'pos' && <PosScreen {...{ filteredProducts, saleMode, setSaleMode, saleValue, setSaleValue, saleKeyword, setSaleKeyword, saleOptions, addProduct, availableStock, cart, setCart, updateCartQty, total, sellerName, setSellerName, paymentMethod, setPaymentMethod, finalizeSale, saving }} />}
    {screen === 'settings' && <SettingsScreen {...{ productFilters, setProductFilters, managedProducts, editingCode, setEditingCode, saveProductField, resetDefaults, setGroups }} />}
    {screen === 'log' && <SalesLogScreen {...{ orderFilters, setOrderFilters, salesTab, setSalesTab, filteredOrders, expandedOrderId, setExpandedOrderId, ordersLoading, creatorSummary, vtuberSummary, goodsTypeSummary }} />}
  </div>;
}

function PosScreen({ filteredProducts, saleMode, setSaleMode, saleValue, setSaleValue, saleKeyword, setSaleKeyword, saleOptions, addProduct, availableStock, cart, setCart, updateCartQty, total, sellerName, setSellerName, paymentMethod, setPaymentMethod, finalizeSale, saving }) {
  return <main className="flex min-h-0 flex-1"><section className="flex-[1.35] overflow-y-auto p-3.5"><SectionTitle>판매 상품</SectionTitle><div className="mb-3 space-y-2 rounded-lg border border-line bg-white p-3"><div className="flex flex-wrap gap-2">{[['all', '전체'], ['vtuber', '버튜버별'], ['creator', '제작자별'], ['goodsType', '굿즈종류별']].map(([key, label]) => <button key={key} onClick={() => { setSaleMode(key); setSaleValue(''); }} className={`min-h-10 rounded-md border px-3 py-2 text-sm ${saleMode === key ? 'border-register bg-register text-white' : 'border-line bg-paper'}`}>{label}</button>)}</div>{!!saleOptions.length && <div className="flex flex-wrap gap-2">{saleOptions.map((name) => <button key={name} onClick={() => setSaleValue(saleValue === name ? '' : name)} className={`min-h-9 rounded-full border px-3 py-1.5 text-xs ${saleValue === name ? 'border-amber-pos bg-amber-pos text-ink' : 'border-line bg-white'}`}>{name}</button>)}</div>}<Input value={saleKeyword} onChange={setSaleKeyword} placeholder="굿즈종류 / 버튜버 / 제작자 / 상품코드 / 세트명 검색" /></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{filteredProducts.map((p) => <ProductCard key={p.productCode} product={p} stock={availableStock(p)} onClick={() => addProduct(p)} />)}</div></section><aside className="flex w-[410px] min-w-[360px] max-w-[450px] flex-col bg-register text-[#eef3ee]"><div className="border-b border-dashed border-white/25 px-4 py-3"><div className="text-[11px] uppercase tracking-[2px] text-[#9db3a8]">합계</div><div className="text-[34px] font-bold">{won(total)}<span className="ml-1 text-lg text-[#9db3a8]">원</span></div></div><div className="flex-1 overflow-y-auto px-3 py-1.5">{cart.length ? cart.map((line, i) => <div key={line.productCode} className="border-b border-white/10 px-1.5 py-3"><div className="text-sm font-bold">{line.goodsType}</div><div className="text-xs text-[#9db3a8]">{line.vtuberName} / {line.creatorName}</div><div className="mt-2 flex items-center gap-2"><div className="text-xs text-[#9db3a8]">단가 {won(line.unitPrice)}원</div><button className="h-9 w-9 rounded-md bg-white/10" onClick={() => updateCartQty(i, -1)}>−</button><span className="w-7 text-center text-sm">{line.qty}</span><button className="h-9 w-9 rounded-md bg-white/10" onClick={() => updateCartQty(i, 1)}>+</button><div className="mono ml-auto text-right text-sm font-bold">{won(line.unitPrice * line.qty)}원</div><button className="px-2 text-[#c98a8a]" onClick={() => setCart(cart.filter((_, idx) => idx !== i))}>✕</button></div></div>) : <div className="px-5 py-10 text-center text-sm text-[#6f8579]">상품을 선택해주세요</div>}</div><div className="space-y-2 border-t border-dashed border-white/25 p-3.5"><Input value={sellerName} onChange={setSellerName} placeholder="판매자명" className="bg-white text-ink" /><div className="grid grid-cols-2 gap-2">{[['CASH', '현금'], ['BANK_TRANSFER', '계좌이체']].map(([key, label]) => <button key={key} onClick={() => setPaymentMethod(key)} className={`min-h-12 rounded-[10px] px-2 py-3 font-bold ${paymentMethod === key ? 'bg-amber-pos text-ink' : 'bg-white/10 text-white'}`}>{label}</button>)}</div><button disabled={!cart.length || saving} onClick={finalizeSale} className="w-full rounded-[10px] bg-cash px-2 py-4 font-bold text-white disabled:bg-[#4a5850]">판매 완료</button><button onClick={() => cart.length && confirm('장바구니를 비울까요?') && setCart([])} className="w-full rounded-lg border border-white/25 py-2 text-xs text-[#c9c4b4]">비우기</button></div></aside></main>;
}

function SettingsScreen({ productFilters, setProductFilters, managedProducts, editingCode, setEditingCode, saveProductField, resetDefaults, setGroups }) {
  return <main className="flex-1 overflow-y-auto p-4 md:p-6"><Panel title="상품 목록"><ProductFilters filters={productFilters} setFilters={setProductFilters} /><div className="overflow-x-auto"><table className="w-full min-w-[1200px] border-collapse text-[12.5px]"><thead><tr className="bg-register text-left text-[#eef3ee]">{['상품코드', '굿즈종류', '버튜버', '제작자', '사이즈', '판매가격', '초기/현재', '세트명', '세트가격', '활성여부', '수정'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{managedProducts.map((p) => <ProductRow key={p.productCode} product={p} editing={editingCode === p.productCode} onEdit={() => setEditingCode(p.productCode)} onClose={() => setEditingCode('')} onSave={saveProductField} />)}</tbody></table></div><button className="mt-3 rounded-md bg-danger px-4 py-2 text-sm text-white" onClick={resetDefaults}>기본 상품으로 초기화</button></Panel><Panel title="세트별 보기"><div className="grid gap-3 md:grid-cols-2">{setGroups.length ? setGroups.map((g) => <div key={g.name} className="rounded-lg border border-line bg-[#fbfaf5] p-3"><div className="font-bold">{g.name}</div><div className="text-sm text-register-2">{won(g.price)}원</div><div className="mt-1 text-xs text-[#6b6555]">{g.description || '설명 없음'}</div><div className="mt-2 text-xs font-bold">포함 상품 수 {g.products.length}개</div><div className="mt-1 text-xs leading-5">{g.products.map((p) => `${p.goodsType}/${p.vtuberName}/${p.creatorName}`).join(', ')}</div></div>) : <p className="text-sm text-[#8a8370]">setGroupName이 등록된 상품이 없습니다.</p>}</div></Panel></main>;
}

function SalesLogScreen({ orderFilters, setOrderFilters, salesTab, setSalesTab, filteredOrders, expandedOrderId, setExpandedOrderId, ordersLoading, creatorSummary, vtuberSummary, goodsTypeSummary }) {
  return <main className="flex-1 overflow-y-auto p-4 md:p-6"><SalesFilters filters={orderFilters} setFilters={setOrderFilters} /><div className="mb-3 flex flex-wrap gap-2">{[['orders', '주문내역'], ['creator', '제작자별 요약'], ['vtuber', '버튜버별 요약'], ['goods', '굿즈종류별 요약']].map(([key, label]) => <button key={key} onClick={() => setSalesTab(key)} className={`min-h-10 rounded-md border px-4 py-2 text-sm ${salesTab === key ? 'border-register bg-register text-white' : 'border-line bg-white'}`}>{label}</button>)}</div>{salesTab === 'orders' ? <OrdersTable orders={filteredOrders} expandedOrderId={expandedOrderId} setExpandedOrderId={setExpandedOrderId} loading={ordersLoading} /> : <SummaryTable rows={salesTab === 'creator' ? creatorSummary : salesTab === 'vtuber' ? vtuberSummary : goodsTypeSummary} title={salesTab === 'creator' ? '제작자' : salesTab === 'vtuber' ? '버튜버' : '굿즈종류'} />}</main>;
}

function LoginPage({ loginId, setLoginId, loginPassword, setLoginPassword, loginError, onSubmit }) { return <div className="flex h-full items-center justify-center bg-register px-4 text-ink"><form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border-[3px] border-amber-pos bg-paper p-6 shadow-2xl"><div className="mb-5 text-center"><div className="display-font text-2xl font-bold text-register">부스 포스기</div><p className="mt-1 text-sm text-[#6b6555]">관리자 로그인 후 이용할 수 있습니다.</p></div><label className="mb-3 block text-sm font-bold">아이디<Input value={loginId} onChange={setLoginId} autoFocus className="mt-1" /></label><label className="mb-3 block text-sm font-bold">패스워드<Input type="password" value={loginPassword} onChange={setLoginPassword} className="mt-1" /></label>{loginError && <div className="mb-3 rounded bg-danger px-3 py-2 text-xs text-white">{loginError}</div>}<button className="w-full rounded-lg bg-register px-4 py-3 font-bold text-white">로그인</button></form></div>; }
function SectionTitle({ children }) { return <div className="my-3.5 flex items-center gap-2 text-xs uppercase tracking-[1.5px] text-[#6b6555] after:h-px after:flex-1 after:bg-line">{children}</div>; }
function Panel({ title, children }) { return <section className="mb-4 rounded-[10px] border border-line bg-white p-3.5"><h2 className="mb-2.5 text-[15px] font-bold">{title}</h2>{children}</section>; }
function Input({ value, onChange, className = '', ...props }) { return <input {...props} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`w-full rounded border border-line p-2 text-[13px] ${className}`} />; }
function Select({ value, onChange, children }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-10 rounded border border-line bg-white p-2 text-[13px]">{children}</select>; }
function ProductCard({ product, stock, onClick }) { const soldout = stock <= 0; return <button disabled={soldout} onClick={onClick} className={`relative min-h-[150px] rounded-[12px] border p-3 text-left shadow-[0_2px_0_#d9d4c4] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed ${soldout ? 'border-line bg-gray-100 opacity-50' : 'border-line bg-white'}`}><div className="text-base font-bold">{product.goodsType}</div><div className="mt-1 text-sm">{product.vtuberName} / {product.creatorName}</div><div className="mt-1 text-xs text-[#6b6555]">{product.size || '-'}</div><div className="mt-2 text-lg font-bold text-register-2">{won(product.price)}원</div><div className="mt-1 text-sm">남은수량 {stock}개</div>{product.setGroupName && <div className="mt-2 rounded bg-[#fff8ea] p-1.5 text-xs text-[#6b6555]">{product.setGroupName} {product.setPrice ? `${won(product.setPrice)}원` : ''}</div>}</button>; }
function ProductFilters({ filters, setFilters }) { const patch = (k, v) => setFilters((f) => ({ ...f, [k]: v })); return <div className="mb-3 flex flex-wrap gap-2"><Select value={filters.vtuberName} onChange={(v) => patch('vtuberName', v)}><option value="">버튜버 전체</option>{VTUBERS.map((x) => <option key={x}>{x}</option>)}</Select><Select value={filters.creatorName} onChange={(v) => patch('creatorName', v)}><option value="">제작자 전체</option>{CREATORS.map((x) => <option key={x}>{x}</option>)}</Select><Select value={filters.goodsType} onChange={(v) => patch('goodsType', v)}><option value="">굿즈 전체</option>{GOODS_TYPES.map((x) => <option key={x}>{x}</option>)}</Select><Select value={filters.isActive} onChange={(v) => patch('isActive', v)}><option value="">활성 전체</option><option value="true">활성</option><option value="false">비활성</option></Select><div className="min-w-[220px] flex-1"><Input value={filters.keyword} onChange={(v) => patch('keyword', v)} placeholder="키워드" /></div></div>; }
function ProductRow({ product: p, editing, onEdit, onClose, onSave }) { const cell = (field, type = 'text') => editing ? <Input type={type} value={p[field] ?? ''} onChange={(v) => onSave(p, field, v)} /> : (field === 'price' || field === 'setPrice' ? `${won(p[field])}원` : String(p[field] ?? '-')); return <tr><td className="mono border-b border-line p-2 text-[11px]">{p.productCode}</td><td className="border-b border-line p-2">{cell('goodsType')}</td><td className="border-b border-line p-2">{cell('vtuberName')}</td><td className="border-b border-line p-2">{cell('creatorName')}</td><td className="border-b border-line p-2">{cell('size')}</td><td className="border-b border-line p-2">{cell('price', 'number')}</td><td className="border-b border-line p-2">- / {editing ? <Input type="number" value={p.stockQty} onChange={(v) => onSave(p, 'stockQty', v)} /> : `${p.stockQty}개`}</td><td className="border-b border-line p-2">{cell('setGroupName')}</td><td className="border-b border-line p-2">{cell('setPrice', 'number')}</td><td className="border-b border-line p-2">{editing ? <Select value={String(p.isActive)} onChange={(v) => onSave(p, 'isActive', v === 'true')}><option value="true">활성</option><option value="false">비활성</option></Select> : (p.isActive ? '활성' : '비활성')}</td><td className="border-b border-line p-2"><button className="rounded bg-register-2 px-3 py-2 text-xs text-white" onClick={editing ? onClose : onEdit}>{editing ? '닫기' : '수정'}</button>{editing && <div className="mt-1"><Input value={p.setDescription || ''} onChange={(v) => onSave(p, 'setDescription', v)} placeholder="세트설명" /></div>}</td></tr>; }
function SalesFilters({ filters, setFilters }) { const patch = (k, v) => setFilters((f) => ({ ...f, [k]: v })); return <Panel title="판매내역 필터"><div className="flex flex-wrap gap-2"><Input type="date" value={filters.fromDate} onChange={(v) => patch('fromDate', v)} className="w-auto" /><Input type="date" value={filters.toDate} onChange={(v) => patch('toDate', v)} className="w-auto" /><Select value={filters.paymentMethod} onChange={(v) => patch('paymentMethod', v)}><option value="">결제수단 전체</option><option value="CASH">현금</option><option value="BANK_TRANSFER">계좌이체</option></Select><Select value={filters.syncStatus} onChange={(v) => patch('syncStatus', v)}><option value="">동기화 전체</option>{Object.entries(SYNC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select><Select value={filters.vtuberName} onChange={(v) => patch('vtuberName', v)}><option value="">버튜버 전체</option>{VTUBERS.map((x) => <option key={x}>{x}</option>)}</Select><Select value={filters.creatorName} onChange={(v) => patch('creatorName', v)}><option value="">제작자 전체</option>{CREATORS.map((x) => <option key={x}>{x}</option>)}</Select><Select value={filters.goodsType} onChange={(v) => patch('goodsType', v)}><option value="">굿즈 전체</option>{GOODS_TYPES.map((x) => <option key={x}>{x}</option>)}</Select><div className="min-w-[240px] flex-1"><Input value={filters.keyword} onChange={(v) => patch('keyword', v)} placeholder="주문번호 / 상품코드 / 굿즈 / 버튜버 / 제작자 / 판매자" /></div></div></Panel>; }
function OrdersTable({ orders, expandedOrderId, setExpandedOrderId, loading }) { return <table className="w-full border-collapse bg-white text-[12.5px]"><thead><tr className="bg-register text-left text-[#eef3ee]">{['주문번호', '판매일시', '결제수단', '상품수량합계', '총금액', '동기화상태', '판매자', '상세보기'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{loading && <tr><td colSpan="8" className="p-4 text-center">불러오는 중...</td></tr>}{orders.slice().reverse().map((o) => { const items = o.payload?.items || []; const open = expandedOrderId === o.localOrderId; return <OrderRows key={o.localOrderId} order={o} items={items} open={open} setExpandedOrderId={setExpandedOrderId} />; })}</tbody></table>; }
function OrderRows({ order: o, items, open, setExpandedOrderId }) { return <><tr><td className="mono border-b border-line p-2">{o.localOrderId}</td><td className="border-b border-line p-2">{new Date(o.createdAt).toLocaleString('ko-KR')}</td><td className="border-b border-line p-2">{PAY_LABEL[o.payload?.paymentMethod]}</td><td className="border-b border-line p-2">{items.reduce((s, i) => s + Number(i.qty || 0), 0)}개</td><td className="mono border-b border-line p-2">{won(o.payload?.totalAmount)}원</td><td className="border-b border-line p-2">{SYNC_LABEL[o.syncStatus]}</td><td className="border-b border-line p-2">{o.payload?.sellerName || '-'}</td><td className="border-b border-line p-2"><button className="rounded border border-register px-2 py-1" onClick={() => setExpandedOrderId(open ? '' : o.localOrderId)}>{open ? '닫기' : '상세'}</button></td></tr>{open && <tr><td colSpan="8" className="border-b border-line bg-[#fbfaf5] p-2"><table className="w-full text-xs"><thead><tr>{['상품코드', '굿즈종류', '버튜버', '제작자', '단가', '수량', '금액', '세트명'].map((h) => <th key={h} className="p-1 text-left">{h}</th>)}</tr></thead><tbody>{items.map((it, idx) => <tr key={`${it.productCode}-${idx}`}><td className="p-1">{it.productCode}</td><td className="p-1">{it.goodsType}</td><td className="p-1">{it.vtuberName}</td><td className="p-1">{it.creatorName}</td><td className="p-1">{won(it.unitPrice)}원</td><td className="p-1">{it.qty}</td><td className="p-1">{won(it.lineTotal)}원</td><td className="p-1">{it.setGroupName || '-'}</td></tr>)}</tbody></table></td></tr>}</>; }
function SummaryTable({ rows, title }) { return <table className="w-full border-collapse bg-white text-[13px]"><thead><tr className="bg-register text-left text-[#eef3ee]"><th className="p-2">{title}</th><th className="p-2">판매수량</th><th className="p-2">매출금액</th><th className="p-2">주문건수</th><th className="p-2">현금매출</th><th className="p-2">계좌이체매출</th></tr></thead><tbody>{rows.map((r) => <tr key={r.name}><td className="border-b border-line p-2 font-bold">{r.name}</td><td className="border-b border-line p-2">{r.qty}개</td><td className="border-b border-line p-2">{won(r.amount)}원</td><td className="border-b border-line p-2">{r.orderCount}건</td><td className="border-b border-line p-2">{won(r.cashAmount)}원</td><td className="border-b border-line p-2">{won(r.bankTransferAmount)}원</td></tr>)}</tbody></table>; }