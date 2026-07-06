export const CURRENT_SEED_VERSION = 3;

const nowIso = () => new Date().toISOString();

function productName(product) {
  return [product.vtuberName, product.goodsType, product.creatorName ? `(${product.creatorName})` : ''].filter(Boolean).join(' ');
}

function product(index, goodsType, vtuberName, creatorName, stockQty, size, price, setCreatorName = null, setGroupName = null, setPrice = null, setDescription = null) {
  const productCode = `P${String(index).padStart(3, '0')}`;
  const createdAt = nowIso();
  const row = {
    id: productCode,
    productCode,
    goodsType,
    vtuberName,
    creatorName,
    stockQty,
    initialStockQty: stockQty,
    size: size || null,
    price,
    setCreatorName,
    setGroupName,
    setPrice,
    setDescription,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  };
  return { ...row, name: productName(row), stock: stockQty };
}

export function getDefaultProducts() {
  return [
    product(1, '장패드', '이세계정서', '세페일', 12, '800x400x4T', 25000),
    product(2, '아크릴키링', '카후', '세페일', 22, '70x100 mm', 8000, '세페일', '아크릴키링 5개 세트', 35000),
    product(3, '아크릴키링', '리메', '세페일', 16, '70x100 mm', 8000, '세페일', '아크릴키링 5개 세트', 35000),
    product(4, '아크릴키링', '이세계정서', '세페일', 12, '70x100 mm', 8000, '세페일', '아크릴키링 5개 세트', 35000),
    product(5, '아크릴키링', '하루사루히', '세페일', 22, '70x100 mm', 8000, '세페일', '아크릴키링 5개 세트', 35000),
    product(6, '아크릴키링', '코코', '세페일', 12, '70x100 mm', 8000, '세페일', '아크릴키링 5개 세트', 35000),
    product(7, '누들스토퍼', '코코', '짱고래', 20, '80x160mm', 12000),
    product(8, '아크릴키링', '하루사루히', '짱고래', 30, '40x60mm', 6000),
    product(9, '회지', '카후', '짱고래', 50, '210x297mm', 8000),
    product(10, '아크릴스탠드액자', '리메', '기은', 2, '100x150mm', 20000),
    product(11, '엽서', '시엘', '기은', 50, '100x150mm', 1000),
    product(12, '엽서', '아스', '기은', 50, '100x150mm', 1000),
    product(13, '아크릴스탠드', '카후', '기은', 15, '90x170mm', 15000, '기은', '아크릴스탠드 5개 세트', 70000),
    product(14, '아크릴스탠드', '리메', '기은', 10, '69x170mm', 15000, '기은', '아크릴스탠드 5개 세트', 70000),
    product(15, '아크릴스탠드', '이세계정서', '기은', 15, '92x170mm', 15000, '기은', '아크릴스탠드 5개 세트', 70000),
    product(16, '아크릴스탠드', '하루사루히', '기은', 10, '102x180mm', 15000, '기은', '아크릴스탠드 5개 세트', 70000),
    product(17, '아크릴스탠드', '코코', '기은', 10, '80x180mm', 15000, '기은', '아크릴스탠드 5개 세트', 70000),
    product(18, '캔뱃지', '카후', '기은', 30, '58mm', 4000, '기은', '캔뱃지 5개 세트', 15000),
    product(19, '캔뱃지', '리메', '기은', 20, '58mm', 4000, '기은', '캔뱃지 5개 세트', 15000),
    product(20, '캔뱃지', '이세계정서', '기은', 30, '58mm', 4000, '기은', '캔뱃지 5개 세트', 15000),
    product(21, '캔뱃지', '하루사루히', '기은', 20, '58mm', 4000, '기은', '캔뱃지 5개 세트', 15000),
    product(22, '캔뱃지', '코코', '기은', 20, '58mm', 4000, '기은', '캔뱃지 5개 세트', 15000),
    product(23, '아크릴 포토카드', '카후', 'Ama', 20, '86.00mm X 54.00mm', 1000),
    product(24, '엽서', '카후', '민수', 8, '105x148mm', 2000, '민수', '엽서 2개 세트', 3000),
    product(25, '엽서', '카후', '민수', 8, '105x148mm', 2000, '민수', '엽서 2개 세트', 3000),
    product(26, '띠부씰', '카후', '민수', 5, '40*50', 2000, '민수', '띠부씰 3개', 2000, '랜덤'),
    product(27, '스티커', 'V.W.P', '민수', 5, '60mm', 4000),
    product(28, '스티커', '카후', '민수', 5, '없음', 0),
    product(29, '스티커', '카후', '민수', 5, '없음', 0),
    product(30, '스티커', '카후', '민수', 5, '없음', 0),
    product(31, '스티커', '카후', '민수', 5, '없음', 0),
    product(32, '아크릴스탠드', '카후', '레이', 25, '170*93mm', 15000),
    product(33, '아크릴스탠드액자', '이세계정서', '레이', 25, '175*145mm', 15000),
    product(34, '티셔츠', 'V.W.P', '나글이', 4, 'M', 25000),
    product(35, '띠부씰', '카후', '나글이', 20, '40*50mm', 1000, '나글이', '띠부씰 3개 세트', 2000),
    product(36, '띠부씰', '카후', '나글이', 20, '40*50mm', 1000, '나글이', '띠부씰 3개 세트', 2000),
    product(37, '띠부씰', '카후', '나글이', 20, '40*50mm', 1000, '나글이', '띠부씰 3개 세트', 2000),
    product(38, '스티커', 'V.W.P', '나글이', 90, 'A6', 5000),
    product(39, '스티커', '츠미바', '나글이', 90, 'A6', 5000),
    product(40, '아크릴키링', '카후', '나글이', 25, '27*44mm', 6000, '나글이', '아크릴키링 5개 세트', 25000),
    product(41, '아크릴키링', '리메', '나글이', 25, '30*44mm', 6000, '나글이', '아크릴키링 5개 세트', 25000),
    product(42, '아크릴키링', '이세계정서', '나글이', 25, '39*43mm', 6000, '나글이', '아크릴키링 5개 세트', 25000),
    product(43, '아크릴키링', '하루사루히', '나글이', 25, '38*45mm', 6000, '나글이', '아크릴키링 5개 세트', 25000),
    product(44, '아크릴키링', '코코', '나글이', 25, '33*44mm', 6000, '나글이', '아크릴키링 5개 세트', 25000),
  ];
}

export function getDefaultBundles() {
  return [
    { id: 'b1', name: '세페일 아크릴키링 5개 세트', price: 35000, items: [{ productId: 'P002', qty: 1 }, { productId: 'P003', qty: 1 }, { productId: 'P004', qty: 1 }, { productId: 'P005', qty: 1 }, { productId: 'P006', qty: 1 }] },
    { id: 'b2', name: '기은 아크릴스탠드 5개 세트', price: 70000, items: [{ productId: 'P013', qty: 1 }, { productId: 'P014', qty: 1 }, { productId: 'P015', qty: 1 }, { productId: 'P016', qty: 1 }, { productId: 'P017', qty: 1 }] },
    { id: 'b3', name: '기은 캔뱃지 5개 세트', price: 15000, items: [{ productId: 'P018', qty: 1 }, { productId: 'P019', qty: 1 }, { productId: 'P020', qty: 1 }, { productId: 'P021', qty: 1 }, { productId: 'P022', qty: 1 }] },
    { id: 'b4', name: '민수 엽서 2개 세트', price: 3000, items: [{ productId: 'P024', qty: 1 }, { productId: 'P025', qty: 1 }] },
    { id: 'b5', name: '민수 띠부씰 3개 2000 랜덤', price: 2000, items: [{ productId: 'P026', qty: 3 }] },
    { id: 'b6', name: '나글이 띠부씰 3개 세트', price: 2000, items: [{ productId: 'P035', qty: 1 }, { productId: 'P036', qty: 1 }, { productId: 'P037', qty: 1 }] },
    { id: 'b7', name: '나글이 아크릴키링 5개 세트', price: 25000, items: [{ productId: 'P040', qty: 1 }, { productId: 'P041', qty: 1 }, { productId: 'P042', qty: 1 }, { productId: 'P043', qty: 1 }, { productId: 'P044', qty: 1 }] },
  ];
}