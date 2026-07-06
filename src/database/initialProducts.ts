import type { Product } from './dexie';

const NOW = '2026-01-01T00:00:00.000Z';

type InitialProduct = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;

const setInfo = {
  sepeilAk: {
    setGroupName: '세페일 아크릴키링 세트',
    setPrice: 35000,
    setDescription: '아크릴키링 5개 세트 35000',
  },
  gieunStand: {
    setGroupName: '기은 아크릴스탠드 세트',
    setPrice: 70000,
    setDescription: '아크릴스탠드 5개 세트 70000',
  },
  gieunCanBadge: {
    setGroupName: '기은 캔뱃지 세트',
    setPrice: 15000,
    setDescription: '캔뱃지 5개 세트 15000',
  },
  minsuPostcard: {
    setGroupName: '민수 엽서 세트',
    setPrice: 3000,
    setDescription: '엽서 2개 세트 3000',
  },
  minsuSeal: {
    setGroupName: '민수 띠부씰 세트',
    setPrice: 2000,
    setDescription: '띠부씰 3개 랜덤 세트 2000',
  },
  nagleAk: {
    setGroupName: '나글이 아크릴키링 세트',
    setPrice: 25000,
    setDescription: '아크릴키링 5개 세트 25000',
  },
} satisfies Record<string, Pick<Product, 'setGroupName' | 'setPrice' | 'setDescription'>>;

const rows: InitialProduct[] = [
  { productCode: 'SEPEIL-LPAD-ISEKAI-001', goodsType: '장패드', vtuberName: '이세계정서', creatorName: '세페일', price: 25000, stockQty: 12 },
  { productCode: 'SEPEIL-AK-KAFU-001', goodsType: '아크릴키링', vtuberName: '카후', creatorName: '세페일', price: 8000, stockQty: 22, ...setInfo.sepeilAk },
  { productCode: 'SEPEIL-AK-RIME-001', goodsType: '아크릴키링', vtuberName: '리메', creatorName: '세페일', price: 8000, stockQty: 16, ...setInfo.sepeilAk },
  { productCode: 'SEPEIL-AK-ISEKAI-001', goodsType: '아크릴키링', vtuberName: '이세계정서', creatorName: '세페일', price: 8000, stockQty: 12, ...setInfo.sepeilAk },
  { productCode: 'SEPEIL-AK-HARU-001', goodsType: '아크릴키링', vtuberName: '하루사루히', creatorName: '세페일', price: 8000, stockQty: 22, ...setInfo.sepeilAk },
  { productCode: 'SEPEIL-AK-KOKO-001', goodsType: '아크릴키링', vtuberName: '코코', creatorName: '세페일', price: 8000, stockQty: 12, ...setInfo.sepeilAk },
  { productCode: 'JJANG-STOP-KOKO-001', goodsType: '누들스토퍼', vtuberName: '코코', creatorName: '짱고래', price: 12000, stockQty: 20 },
  { productCode: 'JJANG-AK-HARU-001', goodsType: '아크릴키링', vtuberName: '하루사루히', creatorName: '짱고래', price: 6000, stockQty: 30 },
  { productCode: 'JJANG-BOOK-KAFU-001', goodsType: '회지', vtuberName: '카후', creatorName: '짱고래', price: 8000, stockQty: 50 },
  { productCode: 'GIEUN-FRAME-RIME-001', goodsType: '아크릴스탠드액자', vtuberName: '리메', creatorName: '기은', price: 20000, stockQty: 2 },
  { productCode: 'GIEUN-POST-CIEL-001', goodsType: '엽서', vtuberName: '시엘', creatorName: '기은', price: 1000, stockQty: 50 },
  { productCode: 'GIEUN-POST-ASU-001', goodsType: '엽서', vtuberName: '아스', creatorName: '기은', price: 1000, stockQty: 50 },
  { productCode: 'GIEUN-STAND-KAFU-001', goodsType: '아크릴스탠드', vtuberName: '카후', creatorName: '기은', price: 15000, stockQty: 15, ...setInfo.gieunStand },
  { productCode: 'GIEUN-STAND-RIME-001', goodsType: '아크릴스탠드', vtuberName: '리메', creatorName: '기은', price: 15000, stockQty: 10, ...setInfo.gieunStand },
  { productCode: 'GIEUN-STAND-ISEKAI-001', goodsType: '아크릴스탠드', vtuberName: '이세계정서', creatorName: '기은', price: 15000, stockQty: 15, ...setInfo.gieunStand },
  { productCode: 'GIEUN-STAND-HARU-001', goodsType: '아크릴스탠드', vtuberName: '하루사루히', creatorName: '기은', price: 15000, stockQty: 10, ...setInfo.gieunStand },
  { productCode: 'GIEUN-STAND-KOKO-001', goodsType: '아크릴스탠드', vtuberName: '코코', creatorName: '기은', price: 15000, stockQty: 10, ...setInfo.gieunStand },
  { productCode: 'GIEUN-BADGE-KAFU-001', goodsType: '캔뱃지', vtuberName: '카후', creatorName: '기은', price: 4000, stockQty: 30, ...setInfo.gieunCanBadge },
  { productCode: 'GIEUN-BADGE-RIME-001', goodsType: '캔뱃지', vtuberName: '리메', creatorName: '기은', price: 4000, stockQty: 20, ...setInfo.gieunCanBadge },
  { productCode: 'GIEUN-BADGE-ISEKAI-001', goodsType: '캔뱃지', vtuberName: '이세계정서', creatorName: '기은', price: 4000, stockQty: 30, ...setInfo.gieunCanBadge },
  { productCode: 'GIEUN-BADGE-HARU-001', goodsType: '캔뱃지', vtuberName: '하루사루히', creatorName: '기은', price: 4000, stockQty: 20, ...setInfo.gieunCanBadge },
  { productCode: 'GIEUN-BADGE-KOKO-001', goodsType: '캔뱃지', vtuberName: '코코', creatorName: '기은', price: 4000, stockQty: 20, ...setInfo.gieunCanBadge },
  { productCode: 'AMA-APC-KAFU-001', goodsType: '아크릴 포토카드', vtuberName: '카후', creatorName: 'Ama', price: 1000, stockQty: 20 },
  { productCode: 'MINSU-POST-KAFU-001', goodsType: '엽서', vtuberName: '카후', creatorName: '민수', price: 2000, stockQty: 8, size: 'A', ...setInfo.minsuPostcard },
  { productCode: 'MINSU-POST-KAFU-002', goodsType: '엽서', vtuberName: '카후', creatorName: '민수', price: 2000, stockQty: 8, size: 'B', ...setInfo.minsuPostcard },
  { productCode: 'MINSU-SEAL-KAFU-001', goodsType: '띠부씰', vtuberName: '카후', creatorName: '민수', price: 2000, stockQty: 5, ...setInfo.minsuSeal },
  { productCode: 'MINSU-STICKER-VWP-001', goodsType: '스티커', vtuberName: 'V.W.P', creatorName: '민수', price: 4000, stockQty: 5 },
  { productCode: 'MINSU-STICKER-KAFU-001', goodsType: '스티커', vtuberName: '카후', creatorName: '민수', price: 0, stockQty: 5, size: 'A' },
  { productCode: 'MINSU-STICKER-KAFU-002', goodsType: '스티커', vtuberName: '카후', creatorName: '민수', price: 0, stockQty: 5, size: 'B' },
  { productCode: 'MINSU-STICKER-KAFU-003', goodsType: '스티커', vtuberName: '카후', creatorName: '민수', price: 0, stockQty: 5, size: 'C' },
  { productCode: 'MINSU-STICKER-KAFU-004', goodsType: '스티커', vtuberName: '카후', creatorName: '민수', price: 0, stockQty: 5, size: 'D' },
  { productCode: 'REI-STAND-KAFU-001', goodsType: '아크릴스탠드', vtuberName: '카후', creatorName: '레이', price: 15000, stockQty: 25 },
  { productCode: 'REI-FRAME-ISEKAI-001', goodsType: '아크릴스탠드액자', vtuberName: '이세계정서', creatorName: '레이', price: 15000, stockQty: 25 },
  { productCode: 'NAGLE-TSHIRT-VWP-001', goodsType: '티셔츠', vtuberName: 'V.W.P', creatorName: '나글이', price: 30000, stockQty: 4, size: 'M' },
  { productCode: 'NAGLE-SEAL-KAFU-001', goodsType: '띠부씰', vtuberName: '카후', creatorName: '나글이', price: 2000, stockQty: 20, size: 'A' },
  { productCode: 'NAGLE-SEAL-KAFU-002', goodsType: '띠부씰', vtuberName: '카후', creatorName: '나글이', price: 2000, stockQty: 20, size: 'B' },
  { productCode: 'NAGLE-SEAL-KAFU-003', goodsType: '띠부씰', vtuberName: '카후', creatorName: '나글이', price: 2000, stockQty: 20, size: 'C' },
  { productCode: 'NAGLE-STICKER-VWP-001', goodsType: '스티커', vtuberName: 'V.W.P', creatorName: '나글이', price: 5000, stockQty: 90 },
  { productCode: 'NAGLE-STICKER-TSUMIBA-001', goodsType: '스티커', vtuberName: '츠미바', creatorName: '나글이', price: 5000, stockQty: 90 },
  { productCode: 'NAGLE-AK-KAFU-001', goodsType: '아크릴키링', vtuberName: '카후', creatorName: '나글이', price: 6000, stockQty: 25, ...setInfo.nagleAk },
  { productCode: 'NAGLE-AK-RIME-001', goodsType: '아크릴키링', vtuberName: '리메', creatorName: '나글이', price: 6000, stockQty: 25, ...setInfo.nagleAk },
  { productCode: 'NAGLE-AK-ISEKAI-001', goodsType: '아크릴키링', vtuberName: '이세계정서', creatorName: '나글이', price: 6000, stockQty: 25, ...setInfo.nagleAk },
  { productCode: 'NAGLE-AK-HARU-001', goodsType: '아크릴키링', vtuberName: '하루사루히', creatorName: '나글이', price: 6000, stockQty: 25, ...setInfo.nagleAk },
  { productCode: 'NAGLE-AK-KOKO-001', goodsType: '아크릴키링', vtuberName: '코코', creatorName: '나글이', price: 6000, stockQty: 25, ...setInfo.nagleAk },
];

export const initialProducts: Product[] = rows.map((product) => ({
  ...product,
  size: product.size ?? null,
  setGroupName: product.setGroupName ?? null,
  setPrice: product.setPrice ?? null,
  setDescription: product.setDescription ?? null,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
}));

export const legacyProductCodeById = Object.fromEntries(
  initialProducts.map((product, index) => [`p${index + 1}`, product.productCode]),
) as Record<string, string>;
