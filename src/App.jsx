import { useEffect, useState } from 'react';

const AUTH_TOKEN_KEY = 'pos_admin_token';

const uid = () => Math.random().toString(36).slice(2, 9);
const won = (n) => Number(n || 0).toLocaleString('ko-KR');

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
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState('pos');
  const [products, setProducts] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [bundleRows, setBundleRows] = useState([{ productId: '', qty: 1 }]);
  const [bundleName, setBundleName] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');

  const applyState = (data) => {
    setProducts(data.products || []);
    setBundles(data.bundles || []);
    setSales(data.sales || []);
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setProducts([]);
    setBundles([]);
    setSales([]);
    setCart([]);
  };

  const loadState = async () => {
    setLoading(true);
    setError('');
    try {
      applyState(await requestJson('/api/pos'));
    } catch (err) {
      if (String(err.message).includes('인증')) logout();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadState(); }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await requestJson('/api/auth', { method: 'POST', body: JSON.stringify({ id: loginId, password: loginPassword }) });
      sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setToken(data.token);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const mutate = async (action, payload, success) => {
    setSaving(true);
    setError('');
    try {
      const data = await requestJson('/api/pos', { method: 'POST', body: JSON.stringify({ action, payload }) });
      applyState(data);
      success?.(data);
    } catch (err) {
      alert(err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const persistProducts = (next) => mutate('replaceProducts', { products: next });
  const persistBundles = (next) => mutate('replaceBundles', { bundles: next });

  const reservedQty = (productId, targetCart = cart) => targetCart.reduce((sum, line) => {
    if (line.type === 'product' && line.id === productId) return sum + line.qty;
    if (line.type === 'bundle') return sum + line.subItems.reduce((s, item) => s + (item.productId === productId ? item.qty * line.qty : 0), 0);
    return sum;
  }, 0);
  const availableStock = (product, targetCart = cart) => Math.max(0, (product?.stock || 0) - reservedQty(product?.id, targetCart));
  const bundleAvailable = (bundle, targetCart = cart) => {
    if (!bundle?.items?.length) return 0;
    return bundle.items.reduce((min, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return 0;
      return Math.min(min, Math.floor(availableStock(product, targetCart) / item.qty));
    }, Infinity);
  };
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);

  const addProduct = (product) => {
    if (availableStock(product) <= 0) return;
    setCart((prev) => {
      const line = prev.find((l) => l.type === 'product' && l.id === product.id);
      return line ? prev.map((l) => (l === line ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { type: 'product', id: product.id, name: product.name, unitPrice: product.price, qty: 1 }];
    });
  };
  const addBundle = (bundle) => {
    if (bundleAvailable(bundle) <= 0) return;
    setCart((prev) => {
      const line = prev.find((l) => l.type === 'bundle' && l.id === bundle.id);
      return line ? prev.map((l) => (l === line ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { type: 'bundle', id: bundle.id, name: bundle.name, unitPrice: bundle.price, qty: 1, subItems: bundle.items }];
    });
  };
  const updateCartQty = (index, diff) => {
    setCart((prev) => {
      const next = [...prev];
      const line = next[index];
      if (!line) return prev;
      if (diff > 0) {
        if (line.type === 'product') {
          const product = products.find((p) => p.id === line.id);
          if (availableStock(product, prev) <= 0) return prev;
        } else if (bundleAvailable(bundles.find((b) => b.id === line.id), prev) <= 0) return prev;
      }
      line.qty += diff;
      return line.qty <= 0 ? next.filter((_, i) => i !== index) : next;
    });
  };
  const finalizeSale = (method) => {
    if (!cart.length || saving) return;
    mutate('finalizeSale', { method, total, cart }, () => setCart([]));
  };
  const resetDefaults = () => {
    if (!confirm('현재 상품/세트 목록을 지우고 기본 44종 목록으로 되돌릴까요? (판매 내역은 유지됩니다)')) return;
    mutate('resetDefaults', {}, () => setCart([]));
  };
  const addBundleToSettings = () => {
    const price = Number(bundlePrice);
    const items = bundleRows.filter((r) => r.productId).map((r) => ({ productId: r.productId, qty: Number(r.qty) || 1 }));
    if (!bundleName.trim() || !price || !items.length) return alert('세트 이름, 판매가, 구성품을 모두 입력해주세요.');
    persistBundles([...bundles, { id: uid(), name: bundleName.trim(), price, items }]);
    setBundleName(''); setBundlePrice(''); setBundleRows([{ productId: '', qty: 1 }]);
  };
  const exportCsv = () => {
    const rows = sales.map((sale) => `"${new Date(sale.time).toLocaleString('ko-KR')}","${sale.method === 'cash' ? '현금' : '계좌이체'}","${sale.lines.map((l) => `${l.name} x${l.qty}`).join(' / ')}",${sale.total}`);
    const blob = new Blob([`\uFEFF시간,결제수단,구성,금액\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `sales_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  const voidSale = (sale) => {
    if (!confirm('이 거래를 취소하고 재고를 복구할까요?')) return;
    mutate('voidSale', { id: sale.id });
  };

  const stats = {
    total: sales.reduce((s, x) => s + x.total, 0),
    cash: sales.filter((x) => x.method === 'cash').reduce((s, x) => s + x.total, 0),
    transfer: sales.filter((x) => x.method === 'transfer').reduce((s, x) => s + x.total, 0),
  };

  if (!token) return <LoginPage loginId={loginId} setLoginId={setLoginId} loginPassword={loginPassword} setLoginPassword={setLoginPassword} loginError={loginError} onSubmit={login} />;
  if (loading) return <div className="flex h-full items-center justify-center bg-paper text-register"><div className="rounded-xl border border-line bg-white p-6 font-bold">DB에서 데이터를 불러오는 중...</div></div>;

  return <div className="flex h-full flex-col bg-paper text-ink">
    <header className="flex shrink-0 items-center justify-between border-b-[3px] border-amber-pos bg-register px-4 py-2.5 text-[#eef3ee]">
      <div className="flex items-center gap-2.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-pos" /><h1 className="display-font text-base font-semibold tracking-wide">부스 포스기</h1>{saving && <span className="text-xs text-amber-pos">저장 중...</span>}</div>
      <nav className="flex gap-1.5">{[['pos', '판매'], ['settings', '상품/세트 관리'], ['log', '판매 내역']].map(([key, label]) => <button key={key} onClick={() => setScreen(key)} className={`rounded-md border px-3.5 py-2 text-[13px] ${screen === key ? 'border-amber-pos bg-amber-pos font-bold text-ink' : 'border-white/20 bg-white/10'}`}>{label}</button>)}<button onClick={loadState} className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs">새로고침</button><button onClick={logout} className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs">로그아웃</button></nav>
    </header>
    {error && <div className="bg-danger px-4 py-2 text-sm text-white">{error}</div>}

    {screen === 'pos' && <main className="flex min-h-0 flex-1">
      <section className="flex-[1.35] overflow-y-auto p-3.5">
        <SectionTitle>굿즈</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">{products.map((p) => <ItemButton key={p.id} soldout={availableStock(p) <= 0} stock={`남음 ${availableStock(p)}`} name={p.name} price={p.price} onClick={() => addProduct(p)} />)}</div>
        {!!bundles.length && <><SectionTitle>세트 할인</SectionTitle><div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">{bundles.map((b) => <ItemButton key={b.id} bundle soldout={bundleAvailable(b) <= 0} stock={bundleAvailable(b) <= 0 ? '품절' : `가능 ${bundleAvailable(b)}`} name={b.name} price={b.price} onClick={() => addBundle(b)} />)}</div></>}
      </section>
      <aside className="flex w-[390px] min-w-[340px] max-w-[420px] flex-col bg-register text-[#eef3ee]">
        <div className="border-b border-dashed border-white/25 px-4.5 py-3.5"><div className="text-[11px] uppercase tracking-[2px] text-[#9db3a8]">합계</div><div className="text-[34px] font-bold">{won(total)}<span className="ml-1 text-lg text-[#9db3a8]">원</span></div></div>
        <div className="flex-1 overflow-y-auto px-3 py-1.5">{cart.length ? cart.map((line, i) => <div key={`${line.type}-${line.id}`} className="flex items-center gap-2 border-b border-white/10 px-1.5 py-2.5"><div className="flex-1 text-[13.5px]">{line.type === 'bundle' && <span className="mr-1 rounded bg-amber-pos px-1.5 py-0.5 text-[9px] text-ink">SET</span>}{line.name}<div className="text-xs text-[#9db3a8]">{won(line.unitPrice)}원</div></div><button className="h-6.5 w-6.5 rounded-md bg-white/10" onClick={() => updateCartQty(i, -1)}>−</button><span className="w-5 text-center text-sm">{line.qty}</span><button className="h-6.5 w-6.5 rounded-md bg-white/10" onClick={() => updateCartQty(i, 1)}>+</button><div className="mono w-[70px] text-right text-[13.5px] font-bold">{won(line.unitPrice * line.qty)}</div><button className="text-[#c98a8a]" onClick={() => setCart(cart.filter((_, idx) => idx !== i))}>✕</button></div>) : <div className="px-5 py-10 text-center text-sm text-[#6f8579]">굿즈를 선택해주세요</div>}</div>
        <div className="border-t border-dashed border-white/25 p-3.5"><div className="flex gap-2.5"><button disabled={!cart.length || saving} onClick={() => finalizeSale('cash')} className="flex-1 rounded-[10px] bg-cash px-2 py-4 font-bold text-white disabled:bg-[#4a5850]">현금 결제</button><button disabled={!cart.length || saving} onClick={() => finalizeSale('transfer')} className="flex-1 rounded-[10px] bg-transfer px-2 py-4 font-bold text-white disabled:bg-[#4a5850]">계좌이체 결제</button></div><button onClick={() => cart.length && confirm('장바구니를 비울까요?') && setCart([])} className="mt-2 w-full rounded-lg border border-white/25 py-2 text-xs text-[#c9c4b4]">비우기</button></div>
      </aside>
    </main>}

    {screen === 'settings' && <main className="flex-1 overflow-y-auto p-4 md:p-6"><div className="grid gap-5 xl:grid-cols-2">
      <Panel title="굿즈 목록 (가격 / 수량)"><div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]"><thead><tr className="text-left"><th className="border-b border-line p-1">이름</th><th className="border-b border-line p-1">가격</th><th className="border-b border-line p-1">수량</th><th /></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td className="border-b border-line p-1"><Input value={p.name} onChange={(v) => persistProducts(products.map((x) => x.id === p.id ? { ...x, name: v } : x))} /></td><td className="border-b border-line p-1"><Input type="number" value={p.price} className="w-[78px]" onChange={(v) => persistProducts(products.map((x) => x.id === p.id ? { ...x, price: Number(v) || 0 } : x))} /></td><td className="border-b border-line p-1"><Input type="number" value={p.stock} className="w-[70px]" onChange={(v) => persistProducts(products.map((x) => x.id === p.id ? { ...x, stock: Number(v) || 0 } : x))} /></td><td className="border-b border-line p-1"><button className="rounded bg-danger px-2 py-1 text-[11px] text-white" onClick={() => { if (confirm('이 굿즈를 삭제할까요? 세트 구성에서도 제거됩니다.')) { persistProducts(products.filter((x) => x.id !== p.id)); persistBundles(bundles.map((b) => ({ ...b, items: b.items.filter((it) => it.productId !== p.id) })).filter((b) => b.items.length)); } }}>삭제</button></td></tr>)}</tbody></table></div><button className="mt-2.5 rounded-md bg-register-2 px-3.5 py-2 text-[13px] text-white" onClick={() => persistProducts([...products, { id: uid(), name: '새 굿즈', price: 0, stock: 0 }])}>+ 굿즈 추가</button><button className="ml-2 mt-2.5 rounded-md bg-danger px-3.5 py-2 text-[13px] text-white" onClick={resetDefaults}>기본 44종 목록으로 초기화</button></Panel>
      <Panel title="세트 할인 구성"><div className="space-y-2.5">{bundles.length ? bundles.map((b) => <div key={b.id} className="rounded-lg border border-line bg-[#fbfaf5] p-2.5"><div className="flex justify-between text-[13px] font-bold"><span>{b.name} — {won(b.price)}원</span><button className="rounded bg-danger px-2 py-1 text-[11px] text-white" onClick={() => confirm('세트를 삭제할까요?') && persistBundles(bundles.filter((x) => x.id !== b.id))}>삭제</button></div><div className="mt-1 text-xs text-[#6b6555]">{b.items.map((it) => `${products.find((p) => p.id === it.productId)?.name || '???'} x${it.qty}`).join(', ')}</div></div>) : <p className="text-xs text-[#8a8370]">등록된 세트가 없습니다</p>}</div><div className="mt-3 flex flex-col gap-2 border-t border-dashed border-line pt-3"><Input value={bundleName} onChange={setBundleName} placeholder="세트 이름 (예: 아크릴+포카 세트)" />{bundleRows.map((row, idx) => <div className="flex gap-1.5" key={idx}><select className="flex-1 rounded border border-line p-1.5 text-xs" value={row.productId} onChange={(e) => setBundleRows(bundleRows.map((r, i) => i === idx ? { ...r, productId: e.target.value } : r))}><option value="">굿즈 선택</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><Input type="number" className="w-[60px]" value={row.qty} onChange={(v) => setBundleRows(bundleRows.map((r, i) => i === idx ? { ...r, qty: Number(v) || 1 } : r))} /></div>)}<button className="self-start rounded bg-transfer px-2.5 py-1.5 text-xs text-white" onClick={() => setBundleRows([...bundleRows, { productId: '', qty: 1 }])}>+ 구성품 추가</button><Input type="number" value={bundlePrice} onChange={setBundlePrice} placeholder="세트 판매가 (원)" /><button className="self-start rounded-md bg-register-2 px-3.5 py-2 text-[13px] text-white" onClick={addBundleToSettings}>세트 저장</button></div></Panel>
    </div></main>}

    {screen === 'log' && <main className="flex-1 overflow-y-auto p-4 md:p-6"><div className="mb-4 grid gap-3.5 md:grid-cols-4"><Stat label="총 판매액" value={`${won(stats.total)}원`} /><Stat label="현금" value={`${won(stats.cash)}원`} /><Stat label="계좌이체" value={`${won(stats.transfer)}원`} /><Stat label="거래 건수" value={sales.length} /></div><div className="mb-2.5 flex gap-2"><button className="rounded-md bg-register-2 px-3 py-2 text-xs text-white" onClick={exportCsv}>CSV로 내보내기</button><button className="rounded-md bg-danger px-3 py-2 text-xs text-white" onClick={() => confirm('모든 판매 내역을 삭제할까요? (재고는 복구되지 않습니다)') && mutate('clearSales')}>판매 내역 초기화</button></div><table className="w-full border-collapse bg-white text-[12.5px]"><thead><tr className="bg-register text-left text-[#eef3ee]"><th className="p-2">시간</th><th className="p-2">결제수단</th><th className="p-2">구성</th><th className="p-2">금액</th><th /></tr></thead><tbody>{sales.slice().reverse().map((s) => <tr key={s.id}><td className="mono border-b border-line p-2">{new Date(s.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td><td className="border-b border-line p-2"><span className={`rounded px-2 py-0.5 text-[11px] text-white ${s.method === 'cash' ? 'bg-cash' : 'bg-transfer'}`}>{s.method === 'cash' ? '현금' : '계좌이체'}</span></td><td className="border-b border-line p-2">{s.lines.map((l) => `${l.name} x${l.qty}`).join(', ')}</td><td className="mono border-b border-line p-2">{won(s.total)}원</td><td className="border-b border-line p-2"><button className="rounded border border-danger px-2 py-1 text-[10px] text-danger" onClick={() => voidSale(s)}>취소</button></td></tr>)}</tbody></table></main>}
  </div>;
}

function LoginPage({ loginId, setLoginId, loginPassword, setLoginPassword, loginError, onSubmit }) {
  return <div className="flex h-full items-center justify-center bg-register px-4 text-ink">
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border-[3px] border-amber-pos bg-paper p-6 shadow-2xl">
      <div className="mb-5 text-center"><div className="display-font text-2xl font-bold text-register">부스 포스기</div><p className="mt-1 text-sm text-[#6b6555]">관리자 로그인 후 이용할 수 있습니다.</p></div>
      <label className="mb-3 block text-sm font-bold">아이디<Input value={loginId} onChange={setLoginId} autoFocus className="mt-1" /></label>
      <label className="mb-3 block text-sm font-bold">패스워드<Input type="password" value={loginPassword} onChange={setLoginPassword} className="mt-1" /></label>
      {loginError && <div className="mb-3 rounded bg-danger px-3 py-2 text-xs text-white">{loginError}</div>}
      <button className="w-full rounded-lg bg-register px-4 py-3 font-bold text-white">로그인</button>
      <p className="mt-4 text-xs leading-5 text-[#8a8370]">Vercel 환경변수 <b>ADMIN_ID</b>, <b>ADMIN_PASSWORD</b>, <b>AUTH_SECRET</b>를 설정하세요.</p>
    </form>
  </div>;
}

function SectionTitle({ children }) { return <div className="my-3.5 flex items-center gap-2 text-xs uppercase tracking-[1.5px] text-[#6b6555] after:h-px after:flex-1 after:bg-line">{children}</div>; }
function ItemButton({ name, price, stock, soldout, bundle, onClick }) { return <button disabled={soldout} onClick={onClick} className={`relative flex min-h-[74px] flex-col justify-between rounded-[10px] border p-3 text-left shadow-[0_2px_0_#d9d4c4] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${bundle ? 'border-amber-pos bg-[#fff8ea]' : 'border-line bg-white'}`}>{bundle && <span className="absolute left-2 top-2 rounded bg-amber-pos px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">SET</span>}<span className="absolute right-2 top-2 rounded-lg bg-[#f1eee2] px-1.5 py-0.5 text-[10px] text-[#8a8370]">{stock}</span><span className={`text-sm font-semibold leading-tight ${bundle ? 'mt-3.5' : ''}`}>{name}</span><span className={`mt-1.5 text-[15px] font-bold ${bundle ? 'text-amber-pos' : 'text-register-2'}`}>{won(price)}원</span></button>; }
function Panel({ title, children }) { return <section className="rounded-[10px] border border-line bg-white p-3.5"><h2 className="mb-2.5 text-[15px] font-bold">{title}</h2>{children}</section>; }
function Input({ value, onChange, className = '', ...props }) { return <input {...props} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded border border-line p-1.5 text-[13px] ${className}`} />; }
function Stat({ label, value }) { return <div className="rounded-[10px] border border-line bg-white p-3.5"><div className="text-[11px] uppercase tracking-wide text-[#8a8370]">{label}</div><div className="mono mt-1 text-2xl font-bold">{value}</div></div>; }