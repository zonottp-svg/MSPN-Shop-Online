import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { PRODUCTS, Product, STORE_INFO, EXCHANGE_RATE } from '../data/products';
import { Order, StoreSettings } from '../types/store';

export interface StorePublicSettingsDoc {
  storeName: string;
  taglineKh: string;
  bannerText: string;
  waitDays: string;
  ownerName: string;
  usdAccount: string;
  khrAccount: string;
  telegramHandle: string;
  phone1: string;
  phone2: string;
  deliveryNoticeKh: string;
  exchangeRate: number;
  catalogInitialized: boolean;
  updatedAt?: any;
}

export interface AdminConfigDoc {
  telegramBotToken: string;
  telegramChatId: string;
  adminPin: string;
  updatedAt?: any;
}

const DEFAULT_BANNER_TEXT =
  '✨ ទទួលកម្ម៉ង់ទំនិញ Pre-order ពីប្រទេសចិន គុណភាពល្អ តម្លៃសមរម្យ រង់ចាំ ៧-១៤ ថ្ងៃ · សេវាដឹកទូទាំង ២៥ ខេត្ត-ក្រុង ✨';

export const DEFAULT_PUBLIC_SETTINGS: Omit<StorePublicSettingsDoc, 'updatedAt'> = {
  storeName: STORE_INFO.name,
  taglineKh: STORE_INFO.taglineKh,
  bannerText: DEFAULT_BANNER_TEXT,
  waitDays: STORE_INFO.waitDays,
  ownerName: STORE_INFO.ownerName,
  usdAccount: STORE_INFO.usdAccount,
  khrAccount: STORE_INFO.khrAccount,
  telegramHandle: STORE_INFO.telegramHandle,
  phone1: STORE_INFO.phone1,
  phone2: STORE_INFO.phone2,
  deliveryNoticeKh: STORE_INFO.deliveryKh,
  exchangeRate: EXCHANGE_RATE,
  catalogInitialized: false,
};

function sanitizeId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned.slice(0, 128) || `id-${Date.now()}`;
}

function buildProductPayload(product: Partial<Product>, idOverride?: string) {
  const safeId = sanitizeId(idOverride || product.id || `p-${Date.now()}`);
  const rawGallery = Array.isArray(product.images)
    ? product.images.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).slice(0, 12)
    : [];
  const primaryImage =
    (typeof product.image === 'string' && product.image.trim()) ||
    rawGallery[0] ||
    '/assets/images/product_tshirt_streetwear_1794414887323.jpg';
  const normalizedGallery = rawGallery.length > 0 ? rawGallery : [primaryImage];

  const normalizedSizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes.map((s) => String(s || '').trim().slice(0, 80)).filter(Boolean).slice(0, 24)
      : ['Free Size'];

  const normalizedColors = Array.isArray(product.colors)
    ? product.colors
        .filter((c) => c && typeof c.name === 'string' && c.name.trim())
        .slice(0, 20)
        .map((c) => ({
          name: String(c.name).trim().slice(0, 80),
          hex: String(c.hex || '#111111').trim().slice(0, 20),
          ...(c.image ? { image: String(c.image).slice(0, 600000) } : {}),
        }))
    : [];

  const payload: Record<string, any> = {
    id: safeId,
    code: String(product.code || `MSPN-${Date.now().toString().slice(-4)}`).trim().slice(0, 64),
    nameKh: String(product.nameKh || 'ទំនិញថ្មី').trim().slice(0, 300),
    nameEn: String(product.nameEn || '').trim().slice(0, 300),
    category: String(product.category || 'clothing').trim().slice(0, 64) || 'clothing',
    categoryKh: String(product.categoryKh || 'ខោអាវ').trim().slice(0, 100) || 'ខោអាវ',
    priceUsd: Number.isFinite(Number(product.priceUsd)) ? Math.max(0, Number(product.priceUsd)) : 0,
    image: primaryImage.slice(0, 600000),
    images: normalizedGallery.map((img) => img.slice(0, 600000)),
    sizes: normalizedSizes.length > 0 ? normalizedSizes : ['Free Size'],
    colors: normalizedColors,
    descriptionKh: String(product.descriptionKh || '').trim().slice(0, 4000),
    rating: Number.isFinite(Number(product.rating)) ? Math.min(5, Math.max(0, Number(product.rating))) : 5.0,
    reviewCount: Number.isFinite(Number(product.reviewCount)) ? Math.max(0, Number(product.reviewCount)) : 1,
    sortOrder: Number.isFinite(Number((product as any).sortOrder))
      ? Number((product as any).sortOrder)
      : Date.now(),
  };

  if (Number.isFinite(Number(product.originalPriceUsd)) && Number(product.originalPriceUsd) > 0) {
    payload.originalPriceUsd = Number(product.originalPriceUsd);
  }
  if (typeof product.sourceUrl === 'string' && product.sourceUrl.trim()) {
    payload.sourceUrl = product.sourceUrl.trim().slice(0, 1500);
  }
  if (typeof product.badge === 'string' && product.badge.trim()) {
    payload.badge = product.badge.trim().slice(0, 80);
  }

  return { safeId, payload };
}

export function subscribeStoreProducts(
  onData: (products: Product[], catalogInitialized: boolean) => void,
  onError?: (err: Error) => void
) {
  let latestProducts: Product[] = [];
  let catalogInitialized = false;
  let productsLoaded = false;
  let settingsLoaded = false;

  const emitIfReady = () => {
    if (!productsLoaded) return;
    if (catalogInitialized || latestProducts.length > 0) {
      onData(latestProducts, true);
    } else if (settingsLoaded) {
      onData(PRODUCTS, false);
    }
  };

  const productsQuery = query(collection(db, 'products'), orderBy('sortOrder', 'desc'));
  const unsubProducts = onSnapshot(
    productsQuery,
    (snapshot) => {
      productsLoaded = true;
      latestProducts = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          ...raw,
          id: d.id,
        } as Product;
      });
      emitIfReady();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } catch (wrapped: any) {
        onError?.(wrapped);
      }
    }
  );

  const unsubStoreMeta = onSnapshot(
    doc(db, 'settings', 'store'),
    (snap) => {
      settingsLoaded = true;
      catalogInitialized = Boolean(snap.exists() && snap.data()?.catalogInitialized === true);
      emitIfReady();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/store');
      } catch (wrapped: any) {
        onError?.(wrapped);
      }
    }
  );

  return () => {
    unsubProducts();
    unsubStoreMeta();
  };
}

export function subscribeStorePublicSettings(onData: (settings: Partial<StoreSettings>) => void) {
  return onSnapshot(
    doc(db, 'settings', 'store'),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as Partial<StoreSettings>);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/store');
      } catch {
        // Fallback silently on storefront settings read error
      }
    }
  );
}

/**
 * Seeds the default 9 products + store settings ONCE in Firestore when `catalogInitialized` is not yet true.
 * Once `catalogInitialized === true`, deleting products removes them permanently and they will NEVER resurrect.
 */
export async function ensureCatalogSeededInFirestore(initialApiProducts?: Product[]): Promise<void> {
  const storeRef = doc(db, 'settings', 'store');
  let storeSnap;
  try {
    storeSnap = await getDoc(storeRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/store');
  }

  if (storeSnap.exists() && storeSnap.data()?.catalogInitialized === true) {
    return;
  }

  let existingProductsSnap;
  try {
    existingProductsSnap = await getDocs(collection(db, 'products'));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
  }

  const batch = writeBatch(db);

  if (existingProductsSnap.empty) {
    const seedList =
      Array.isArray(initialApiProducts) && initialApiProducts.length > 0 ? initialApiProducts : PRODUCTS;
    const baseTime = Date.now();
    seedList.forEach((prod, idx) => {
      const { safeId, payload } = buildProductPayload(
        {
          ...prod,
          sortOrder: baseTime - idx * 1000,
        } as any,
        prod.id
      );
      batch.set(doc(db, 'products', safeId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  batch.set(storeRef, {
    ...DEFAULT_PUBLIC_SETTINGS,
    ...(storeSnap.exists() ? storeSnap.data() : {}),
    catalogInitialized: true,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/store');
  }
}

export async function createProductInFirestore(product: Partial<Product>): Promise<Product> {
  const generatedId = product.id ? sanitizeId(product.id) : `p-${Date.now()}`;
  const { safeId, payload } = buildProductPayload(
    {
      ...product,
      sortOrder: Date.now(),
    } as any,
    generatedId
  );

  try {
    await setDoc(doc(db, 'products', safeId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `products/${safeId}`);
  }

  return payload as Product;
}

export async function updateProductInFirestore(product: Partial<Product> & { id: string }): Promise<Product> {
  const safeId = sanitizeId(product.id);
  const { payload } = buildProductPayload(product, safeId);
  const { id: _id, ...updatableFields } = payload;

  // Ensure removed optional fields don't remain stale or invalid
  try {
    await updateDoc(doc(db, 'products', safeId), {
      ...updatableFields,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${safeId}`);
  }

  return payload as Product;
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const safeId = sanitizeId(productId);
  try {
    await deleteDoc(doc(db, 'products', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${safeId}`);
  }
}

export async function loadAdminSettingsFromFirestore(fallbackSettings?: Partial<StoreSettings>): Promise<StoreSettings> {
  let publicData: Partial<StorePublicSettingsDoc> = {};
  let adminData: Partial<AdminConfigDoc> = {};

  try {
    const publicSnap = await getDoc(doc(db, 'settings', 'store'));
    if (publicSnap.exists()) {
      publicData = publicSnap.data() as StorePublicSettingsDoc;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/store');
  }

  try {
    const adminSnap = await getDoc(doc(db, 'adminConfig', 'telegram'));
    if (adminSnap.exists()) {
      adminData = adminSnap.data() as AdminConfigDoc;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'adminConfig/telegram');
  }

  return {
    storeName: publicData.storeName || fallbackSettings?.storeName || DEFAULT_PUBLIC_SETTINGS.storeName,
    taglineKh: publicData.taglineKh || fallbackSettings?.taglineKh || DEFAULT_PUBLIC_SETTINGS.taglineKh,
    bannerText: publicData.bannerText || fallbackSettings?.bannerText || DEFAULT_PUBLIC_SETTINGS.bannerText,
    waitDays: publicData.waitDays || fallbackSettings?.waitDays || DEFAULT_PUBLIC_SETTINGS.waitDays,
    ownerName: publicData.ownerName || fallbackSettings?.ownerName || DEFAULT_PUBLIC_SETTINGS.ownerName,
    usdAccount: publicData.usdAccount || fallbackSettings?.usdAccount || DEFAULT_PUBLIC_SETTINGS.usdAccount,
    khrAccount: publicData.khrAccount || fallbackSettings?.khrAccount || DEFAULT_PUBLIC_SETTINGS.khrAccount,
    telegramHandle:
      publicData.telegramHandle || fallbackSettings?.telegramHandle || DEFAULT_PUBLIC_SETTINGS.telegramHandle,
    telegramBotToken: adminData.telegramBotToken ?? fallbackSettings?.telegramBotToken ?? '',
    telegramChatId: adminData.telegramChatId ?? fallbackSettings?.telegramChatId ?? '',
    phone1: publicData.phone1 || fallbackSettings?.phone1 || DEFAULT_PUBLIC_SETTINGS.phone1,
    phone2: publicData.phone2 || fallbackSettings?.phone2 || DEFAULT_PUBLIC_SETTINGS.phone2,
    deliveryNoticeKh:
      publicData.deliveryNoticeKh || fallbackSettings?.deliveryNoticeKh || DEFAULT_PUBLIC_SETTINGS.deliveryNoticeKh,
    exchangeRate: Number(publicData.exchangeRate || fallbackSettings?.exchangeRate || EXCHANGE_RATE),
    adminPin: adminData.adminPin || fallbackSettings?.adminPin || '1234',
  };
}

export async function saveAdminSettingsInFirestore(settings: StoreSettings): Promise<void> {
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'settings', 'store'),
    {
      storeName: String(settings.storeName || DEFAULT_PUBLIC_SETTINGS.storeName).slice(0, 120),
      taglineKh: String(settings.taglineKh || '').slice(0, 300),
      bannerText: String(settings.bannerText || '').slice(0, 500),
      waitDays: String(settings.waitDays || '').slice(0, 80),
      ownerName: String(settings.ownerName || '').slice(0, 120),
      usdAccount: String(settings.usdAccount || '').slice(0, 64),
      khrAccount: String(settings.khrAccount || '').slice(0, 64),
      telegramHandle: String(settings.telegramHandle || '').slice(0, 80),
      phone1: String(settings.phone1 || '').slice(0, 40),
      phone2: String(settings.phone2 || '').slice(0, 40),
      deliveryNoticeKh: String(settings.deliveryNoticeKh || '').slice(0, 300),
      exchangeRate: Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : EXCHANGE_RATE,
      catalogInitialized: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(
    doc(db, 'adminConfig', 'telegram'),
    {
      telegramBotToken: String(settings.telegramBotToken || '').slice(0, 200),
      telegramChatId: String(settings.telegramChatId || '').slice(0, 80),
      adminPin: String(settings.adminPin || '1234').slice(0, 32),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/store');
  }
}

export async function saveOrderInFirestore(order: Order, customerUid?: string | null): Promise<void> {
  const safeId = sanitizeId(order.id);
  const payload: Record<string, any> = {
    id: safeId,
    customerName: String(order.customerName || '').slice(0, 120),
    customerPhone: String(order.customerPhone || '').slice(0, 40),
    customerAddress: String(order.customerAddress || 'មិនបានបញ្ជាក់').slice(0, 400),
    items: Array.isArray(order.items) ? order.items.slice(0, 50) : [],
    totalUsd: Number(order.totalUsd) || 0,
    totalKhr: Number(order.totalKhr) || 0,
    paymentMethod: order.paymentMethod === 'deposit_aba' ? 'deposit_aba' : 'aba_khqr',
    paymentStatus: order.paymentStatus === 'verified' ? 'verified' : 'pending',
    telegramNotificationStatus: order.telegramNotificationStatus || 'not_configured',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (customerUid) payload.customerUid = String(customerUid).slice(0, 128);
  if (order.customerTelegram) payload.customerTelegram = String(order.customerTelegram).slice(0, 100);
  if (order.customerNote) payload.customerNote = String(order.customerNote).slice(0, 500);
  if (order.paymentSlipUrl) payload.paymentSlipUrl = String(order.paymentSlipUrl).slice(0, 650000);
  if (order.telegramError) payload.telegramError = String(order.telegramError).slice(0, 300);

  try {
    await setDoc(doc(db, 'orders', safeId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${safeId}`);
  }
}

export function subscribeAdminOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: Order[] = snap.docs.map((d) => {
        const raw = d.data();
        return {
          ...raw,
          id: d.id,
          createdAt:
            raw.createdAt && typeof raw.createdAt.toDate === 'function'
              ? raw.createdAt.toDate().toISOString()
              : String(raw.createdAt || new Date().toISOString()),
          updatedAt:
            raw.updatedAt && typeof raw.updatedAt.toDate === 'function'
              ? raw.updatedAt.toDate().toISOString()
              : raw.updatedAt,
        } as Order;
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch (wrapped: any) {
        onError?.(wrapped);
      }
    }
  );
}

export async function updateOrderInFirestore(
  orderId: string,
  updates: Partial<
    Pick<
      Order,
      'paymentStatus' | 'trackingNumber' | 'carrierName' | 'estimatedArrival' | 'trackingNote'
    >
  >
): Promise<void> {
  const safeId = sanitizeId(orderId);
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.paymentStatus !== undefined) payload.paymentStatus = updates.paymentStatus;
  if (updates.trackingNumber !== undefined) payload.trackingNumber = String(updates.trackingNumber).slice(0, 120);
  if (updates.carrierName !== undefined) payload.carrierName = String(updates.carrierName).slice(0, 120);
  if (updates.estimatedArrival !== undefined) payload.estimatedArrival = String(updates.estimatedArrival).slice(0, 120);
  if (updates.trackingNote !== undefined) payload.trackingNote = String(updates.trackingNote).slice(0, 500);

  try {
    await updateDoc(doc(db, 'orders', safeId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${safeId}`);
  }
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const safeId = sanitizeId(orderId);
  try {
    await deleteDoc(doc(db, 'orders', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${safeId}`);
  }
}

export async function fetchCustomerOrdersFromFirestore(uid: string): Promise<Order[]> {
  try {
    const q = query(collection(db, 'orders'), where('customerUid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const raw = d.data();
      return {
        ...raw,
        id: d.id,
        createdAt:
          raw.createdAt && typeof raw.createdAt.toDate === 'function'
            ? raw.createdAt.toDate().toISOString()
            : String(raw.createdAt || new Date().toISOString()),
      } as Order;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  }
}
