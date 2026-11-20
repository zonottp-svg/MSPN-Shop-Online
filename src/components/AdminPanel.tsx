import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Package,
  ShoppingBag,
  Settings,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Phone,
  Eye,
  RefreshCw,
  Clock,
  Save,
  Check,
  Truck,
  Copy,
  Calendar,
  MapPin,
  Link2,
  Upload,
  Loader2,
  Image as ImageIcon,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, ADMIN_EMAIL, db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ensureCatalogSeededInFirestore,
  subscribeStoreProducts,
  createProductInFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  loadAdminSettingsFromFirestore,
  saveAdminSettingsInFirestore,
  subscribeAdminOrders,
  updateOrderInFirestore,
  deleteOrderFromFirestore,
} from '../lib/storeFirestore';
import { Order, StoreSettings } from '../types/store';
import { Product, formatUsd, formatKhr } from '../data/products';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onRefreshData }) => {
  const [pin, setPin] = useState('1234');
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Slip Modal
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);

  // Edit Tracking Modal state
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    carrierName: '',
    trackingNumber: '',
    estimatedArrival: '',
    trackingNote: '',
    paymentStatus: '' as Order['paymentStatus'],
  });

  // Edit / Add Product State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  // Taobao Auto-Import State
  const [taobaoInput, setTaobaoInput] = useState('');
  const [taobaoScreenshot, setTaobaoScreenshot] = useState('');
  const [taobaoMarkupUsd, setTaobaoMarkupUsd] = useState<number>(5);
  const [taobaoGalleryImages, setTaobaoGalleryImages] = useState<string[]>([]);
  const [isImportingTaobao, setIsImportingTaobao] = useState(false);
  const [taobaoImportStatus, setTaobaoImportStatus] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
    priceCny?: number;
  } | null>(null);

  // Telegram test state
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Status Filter for Orders
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // In-app deletion confirmation states
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const safeParseJson = async (res: Response) => {
    const rawText = await res.text();
    if (!rawText) return {};
    try {
      return JSON.parse(rawText);
    } catch {
      return {
        _nonJson: true,
        error:
          res.status === 404
            ? 'រកមិនឃើញសេវា API របស់ហាងទេ (404)។ សូមពិនិត្យការដំឡើង Backend /api លើ Server ម្ដងទៀត។'
            : `ម៉ាស៊ីនមេត្រឡប់ទិន្នន័យមិនត្រឹមត្រូវ (HTTP ${res.status})។ សូមព្យាយាមម្ដងទៀត។`,
      };
    }
  };

  const checkIsAuthorizedAdmin = async (user: User | null): Promise<boolean> => {
    if (!user || !user.emailVerified) return false;
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
    try {
      const adminSnap = await getDoc(doc(db, 'admins', user.uid));
      return adminSnap.exists();
    } catch {
      return false;
    }
  };

  // Keep Firebase Auth state & live Firestore subscriptions synced while AdminPanel is open
  useEffect(() => {
    if (!isOpen) return;

    let unsubProducts: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      const authorized = await checkIsAuthorizedAdmin(user);

      if (!authorized || !user) {
        setAdminUser(user);
        setIsAuthenticated(false);
        unsubProducts?.();
        unsubOrders?.();
        return;
      }

      setAdminUser(user);
      setIsAuthenticated(true);
      setAuthError('');
      setUnauthorizedHost(null);

      // Subscribe immediately to Firestore live products & orders
      unsubProducts?.();
      unsubProducts = subscribeStoreProducts((liveProducts) => {
        if (!cancelled) setProducts(liveProducts);
      });

      unsubOrders?.();
      unsubOrders = subscribeAdminOrders(
        (fsOrders) => {
          if (!cancelled) setOrders(fsOrders);
        },
        (err) => console.warn('Firestore orders listener warning:', err)
      );

      // One-time safe seed from API/defaults + load settings
      try {
        let apiProducts: Product[] | undefined;
        let apiSettings: Partial<StoreSettings> | undefined;
        try {
          const [pRes, sRes] = await Promise.all([
            fetch('/api/products', { cache: 'no-store' }),
            fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: pin || '1234' }),
            }),
          ]);
          const pData = await safeParseJson(pRes);
          if (pRes.ok && Array.isArray(pData.products)) apiProducts = pData.products;
          const sData = await safeParseJson(sRes);
          if (sRes.ok && sData.settings) apiSettings = sData.settings;
        } catch {
          // Proceed with local defaults
        }

        await ensureCatalogSeededInFirestore(apiProducts);
        const fullSettings = await loadAdminSettingsFromFirestore(apiSettings);
        if (!cancelled) {
          setSettings(fullSettings);
          if (fullSettings.adminPin) setPin(fullSettings.adminPin);
        }
      } catch (initErr: any) {
        console.error('Admin Firestore init error:', initErr);
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubProducts?.();
      unsubOrders?.();
    };
  }, [isOpen]);

  // Google Admin Auth Handler (Required for Firestore Admin writes)
  const handleGoogleAdminLogin = async () => {
    setIsLoading(true);
    setAuthError('');
    setUnauthorizedHost(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const authorized = await checkIsAuthorizedAdmin(cred.user);
      if (!authorized) {
        await signOut(auth);
        throw new Error(
          `គណនី "${cred.user.email || ''}" មិនមែនជាម្ចាស់ហាងទេ។ សូមចូលដោយប្រើគណនី ${ADMIN_EMAIL} ។`
        );
      }
      setAdminUser(cred.user);
      setIsAuthenticated(true);
      onRefreshData?.();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedHost(host || 'domain-នេះ');
        setAuthError('');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('អ្នកបានបិទផ្ទាំង Google។ សូមចុចប៊ូតុងខាងក្រោមម្ដងទៀត។');
      } else {
        setAuthError(err?.message || 'មិនអាចចូលគណនី Google Admin បានទេ');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHost = async () => {
    if (!unauthorizedHost) return;
    try {
      await navigator.clipboard.writeText(unauthorizedHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      setAdminUser(null);
      setIsAuthenticated(false);
    }
  };

  const fetchOrders = async (currentPin = pin) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      });
      const data = await safeParseJson(res);
      if (res.ok && !data._nonJson && Array.isArray(data.orders)) {
        setOrders((prev) => {
          const map = new Map(prev.map((o) => [o.id, o]));
          (data.orders as Order[]).forEach((o) => {
            if (!map.has(o.id)) map.set(o.id, o);
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    // Products stay live-synced via Firestore subscription; refresh storefront callback
    onRefreshData?.();
  };

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderInFirestore(orderId, {
        paymentStatus: newStatus as Order['paymentStatus'],
      });
      fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, status: newStatus }),
      }).catch(() => {});
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, paymentStatus: newStatus as Order['paymentStatus'] } : o
        )
      );
      showNotification('success', 'បានកែប្រែស្ថានភាពការបញ្ជាទិញជោគជ័យ!');
    } catch {
      showNotification('error', 'មិនអាចកែប្រែបានទេ');
    }
  };

  // Open & Save Tracking
  const handleOpenTracking = (order: Order) => {
    setTrackingOrder(order);
    setTrackingForm({
      carrierName: order.carrierName || 'វីរៈប៊ុនថាំ (VET Express)',
      trackingNumber: order.trackingNumber || '',
      estimatedArrival: order.estimatedArrival || '៧-១៤ ថ្ងៃ',
      trackingNote: order.trackingNote || '',
      paymentStatus: order.paymentStatus,
    });
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingOrder) return;
    setIsLoading(true);

    try {
      await updateOrderInFirestore(trackingOrder.id, {
        carrierName: trackingForm.carrierName,
        trackingNumber: trackingForm.trackingNumber,
        estimatedArrival: trackingForm.estimatedArrival,
        trackingNote: trackingForm.trackingNote,
        paymentStatus: trackingForm.paymentStatus,
      });

      fetch(`/api/admin/orders/${trackingOrder.id}/tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          carrierName: trackingForm.carrierName,
          trackingNumber: trackingForm.trackingNumber,
          estimatedArrival: trackingForm.estimatedArrival,
          trackingNote: trackingForm.trackingNote,
          paymentStatus: trackingForm.paymentStatus,
        }),
      }).catch(() => {});

      setOrders((prev) =>
        prev.map((o) =>
          o.id === trackingOrder.id
            ? {
                ...o,
                carrierName: trackingForm.carrierName,
                trackingNumber: trackingForm.trackingNumber,
                estimatedArrival: trackingForm.estimatedArrival,
                trackingNote: trackingForm.trackingNote,
                paymentStatus: trackingForm.paymentStatus,
              }
            : o
        )
      );
      setTrackingOrder(null);
      showNotification('success', 'បានកែប្រែព័ត៌មានដឹកជញ្ជូន និងស្ថានភាព Tracking ជោគជ័យ!');
    } catch (err: any) {
      showNotification('error', err.message || 'មិនអាចកែប្រែបានទេ');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Order (In-App execution without window.confirm)
  const executeDeleteOrder = async (orderId: string) => {
    setIsDeleting(true);
    try {
      await deleteOrderFromFirestore(orderId);
      fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }).catch(() => {});
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setOrderToDelete(null);
      showNotification('success', `បានលុបការបញ្ជាទិញ #${orderId} ជោគជ័យ!`);
      onRefreshData?.();
    } catch (err: any) {
      showNotification('error', err.message || 'មិនអាចលុបបានទេ សូមពិនិត្យអ៊ីនធឺណិត');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsLoading(true);

    try {
      await saveAdminSettingsInFirestore(settings);
      fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, newSettings: settings }),
      }).catch(() => {});
      showNotification('success', 'បានរក្សាទុកការកំណត់ហាងជោគជ័យ!');
      onRefreshData?.();
    } catch (err: any) {
      showNotification('error', err.message || 'មិនអាចរក្សាទុកបានទេ');
    } finally {
      setIsLoading(false);
    }
  };

  // Test Telegram Bot
  const handleTestBot = async () => {
    if (!settings?.telegramBotToken || !settings?.telegramChatId) {
      showNotification('error', 'សូមបញ្ចូល Bot Token និង Chat ID មុនពេលតេស្ត');
      return;
    }
    setIsTestingBot(true);
    setBotTestResult(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.telegramBotToken,
          chatId: settings.telegramChatId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBotTestResult({ success: true, msg: '✅ បានផ្ញើសារសាកល្បងទៅ Telegram ជោគជ័យ! សូមបើកមើលក្នុង Telegram របស់អ្នក។' });
      } else {
        setBotTestResult({ success: false, msg: `❌ បរាជ័យ៖ ${data.error || 'Token ឬ Chat ID មិនត្រឹមត្រូវ'}` });
      }
    } catch (err: any) {
      setBotTestResult({ success: false, msg: `❌ បរាជ័យ៖ ${err.message}` });
    } finally {
      setIsTestingBot(false);
    }
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || isSavingProduct) return;

    setProductFormError(null);

    const cleanNameKh = (editingProduct.nameKh || '').trim();
    if (!cleanNameKh) {
      setProductFormError('សូមបញ្ចូលឈ្មោះទំនិញជាភាសាខ្មែរជាមុនសិន!');
      return;
    }

    if (isCustomCategoryMode && !(editingProduct.categoryKh || '').trim()) {
      setProductFormError('សូមបញ្ចូលឈ្មោះប្រភេទទំនិញថ្មីជាមុនសិន!');
      return;
    }

    const numericPrice = Number(editingProduct.priceUsd);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setProductFormError('សូមបញ្ចូលតម្លៃទំនិញជា USD ឱ្យធំជាង 0!');
      return;
    }

    const rawImages = Array.isArray(editingProduct.images) ? editingProduct.images.filter(Boolean) : [];
    const coverImage = (editingProduct.image || rawImages[0] || '').trim();
    if (!coverImage) {
      setProductFormError('សូមដាក់រូបភាពទំនិញយ៉ាងហោចណាស់ ១ សន្លឹក!');
      return;
    }

    const normalizedGallery = Array.from(
      new Set([coverImage, ...rawImages, ...(editingProduct.colors || []).map((c) => c.image).filter(Boolean) as string[]])
    );

    const rawSource = (editingProduct.sourceUrl || '').trim();
    const extractedSourceMatch = rawSource.match(/https?:\/\/[^\s"'<>\]】」]+/i);
    const cleanSourceUrl = extractedSourceMatch ? extractedSourceMatch[0].replace(/[.,;!?]+$/, '') : rawSource;

    const payloadProduct: Partial<Product> = {
      ...editingProduct,
      nameKh: cleanNameKh,
      priceUsd: numericPrice,
      sourceUrl: cleanSourceUrl,
      image: coverImage,
      images: normalizedGallery,
      sizes:
        Array.isArray(editingProduct.sizes) && editingProduct.sizes.length > 0
          ? editingProduct.sizes
          : ['Free Size'],
      colors: (editingProduct.colors || [])
        .map((c) => ({
          name: (c.name || '').trim(),
          hex: (c.hex || '#111111').trim(),
          ...(c.image ? { image: c.image } : {}),
        }))
        .filter((c) => Boolean(c.name)),
    };

    setIsSavingProduct(true);
    try {
      await ensureCatalogSeededInFirestore();
      const isEdit = Boolean(payloadProduct.id);
      const savedProduct = isEdit
        ? await updateProductInFirestore(payloadProduct as Partial<Product> & { id: string })
        : await createProductInFirestore(payloadProduct);

      // Best-effort sync to API backend for local server-db.json parity
      fetch(isEdit ? `/api/admin/products/${savedProduct.id}` : '/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, product: savedProduct }),
      }).catch(() => {});

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setNewGalleryUrl('');
      setProductFormError(null);
      showNotification('success', isEdit ? 'បានកែប្រែទំនិញជោគជ័យ!' : 'បានបន្ថែមទំនិញថ្មីជោគជ័យ!');
      onRefreshData?.();
    } catch (err: any) {
      const msg = err?.message || 'មិនអាចរក្សាទុកទំនិញបានទេ សូមព្យាយាមម្ដងទៀត';
      setProductFormError(msg);
      showNotification('error', msg);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product (Permanent in Firestore so deleted items never reappear)
  const executeDeleteProduct = async (productId: string) => {
    setIsDeleting(true);
    try {
      await ensureCatalogSeededInFirestore();
      await deleteProductFromFirestore(productId);
      fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }).catch(() => {});
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setProductToDelete(null);
      showNotification('success', 'បានលុបទំនិញចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍ជោគជ័យ!');
      onRefreshData?.();
    } catch (err: any) {
      showNotification('error', err.message || 'មិនអាចលុបទំនិញបានទេ');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetTaobaoImportState = () => {
    setTaobaoInput('');
    setTaobaoScreenshot('');
    setTaobaoGalleryImages([]);
    setTaobaoImportStatus(null);
    setProductFormError(null);
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject());
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Compress large phone images cleanly so multiple photos stay well within Firestore 1MB doc limit
  const compressImageFile = async (file: File, maxDim = 960, quality = 0.78): Promise<string> => {
    const rawUrl = await readFileAsDataUrl(file);
    if (file.size < 250 * 1024) return rawUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(rawUrl);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < rawUrl.length ? compressed : rawUrl);
        } catch {
          resolve(rawUrl);
        }
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    });
  };

  const handleTaobaoScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1280, 0.85);
      setTaobaoScreenshot(compressed);
    } finally {
      e.target.value = '';
    }
  };

  const handleMultiGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const dataUrls = await Promise.all(Array.from(files).map((f) => compressImageFile(f)));
      setProductFormError(null);
      setEditingProduct((prev) => {
        if (!prev) return prev;
        const existing = Array.isArray(prev.images) && prev.images.length > 0 ? prev.images : prev.image ? [prev.image] : [];
        const merged = Array.from(new Set([...existing, ...dataUrls]));
        return {
          ...prev,
          image: prev.image || merged[0] || '',
          images: merged,
        };
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleAddGalleryUrl = () => {
    const trimmed = newGalleryUrl.trim();
    if (!trimmed) return;
    setProductFormError(null);
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const existing = Array.isArray(prev.images) && prev.images.length > 0 ? prev.images : prev.image ? [prev.image] : [];
      const merged = Array.from(new Set([...existing, trimmed]));
      return {
        ...prev,
        image: prev.image || merged[0] || '',
        images: merged,
      };
    });
    setNewGalleryUrl('');
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    setTaobaoGalleryImages((prev) => prev.filter((u) => u !== urlToRemove));
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.images) ? prev.images : prev.image ? [prev.image] : [];
      const nextImages = current.filter((u) => u !== urlToRemove);
      const nextCover = prev.image === urlToRemove ? nextImages[0] || '' : prev.image;
      const nextColors = (prev.colors || []).map((c) =>
        c.image === urlToRemove ? { ...c, image: undefined } : c
      );
      return {
        ...prev,
        image: nextCover,
        images: nextImages,
        colors: nextColors,
      };
    });
  };

  const handleColorImageUpload = async (colorIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setProductFormError(null);
      setEditingProduct((prev) => {
        if (!prev) return prev;
        const nextColors = [...(prev.colors || [])];
        if (nextColors[colorIdx]) {
          nextColors[colorIdx] = { ...nextColors[colorIdx], image: dataUrl };
        }
        const existingImages = Array.isArray(prev.images) ? prev.images : prev.image ? [prev.image] : [];
        const nextImages = Array.from(new Set([...existingImages, dataUrl]));
        return {
          ...prev,
          image: prev.image || nextImages[0] || dataUrl,
          images: nextImages,
          colors: nextColors,
        };
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleImportTaobao = async (overrideInput?: string) => {
    const inputToUse = typeof overrideInput === 'string' ? overrideInput : taobaoInput;
    if (!inputToUse.trim() && !taobaoScreenshot) {
      setTaobaoImportStatus({
        type: 'error',
        text: 'សូមបិទភ្ជាប់លីង Taobao ឬបង្ហោះរូបភាព Screenshot ផលិតផលជាមុនសិន។',
      });
      return;
    }

    setIsImportingTaobao(true);
    setTaobaoImportStatus(null);

    try {
      const res = await fetch('/api/admin/import-taobao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          taobaoInput: inputToUse,
          imageBase64: taobaoScreenshot || undefined,
          profitMarginUsd: Number.isFinite(taobaoMarkupUsd) ? taobaoMarkupUsd : 5,
        }),
      });

      const data = await safeParseJson(res);
      if (!res.ok || data._nonJson || !data.success) {
        throw new Error(data.error || 'មិនអាចទាញទិន្នន័យពី Taobao បានទេ');
      }

      const imported = data.product || {};
      const importedGallery: string[] = Array.isArray(imported.images) && imported.images.length > 0
        ? imported.images
        : imported.image
        ? [imported.image]
        : [];
      setTaobaoGalleryImages(importedGallery);

      setEditingProduct((prev) => {
        if (!prev) return prev;
        const mergedGallery = importedGallery.length > 0
          ? importedGallery
          : Array.isArray(prev.images) && prev.images.length > 0
          ? prev.images
          : prev.image
          ? [prev.image]
          : [];
        return {
          ...prev,
          nameKh: imported.nameKh || prev.nameKh || '',
          nameEn: imported.nameEn || prev.nameEn || '',
          category: imported.category || prev.category || 'clothing',
          categoryKh: imported.categoryKh || prev.categoryKh || 'ខោអាវ',
          priceUsd: imported.priceUsd > 0 ? imported.priceUsd : prev.priceUsd || 0,
          originalPriceUsd: imported.originalPriceUsd || prev.originalPriceUsd,
          image: imported.image ? imported.image : mergedGallery[0] || prev.image || '',
          images: mergedGallery,
          sourceUrl: imported.sourceUrl || data.meta?.sourceUrl || data.meta?.extractedUrl || prev.sourceUrl || '',
          badge: imported.badge || prev.badge || 'ម៉ូដថ្មី',
          sizes:
            Array.isArray(imported.sizes) && imported.sizes.length > 0
              ? imported.sizes
              : prev.sizes || ['M', 'L', 'XL'],
          colors:
            Array.isArray(imported.colors) && imported.colors.length > 0
              ? imported.colors
              : prev.colors || [{ name: 'ខ្មៅ (Black)', hex: '#111111' }],
          descriptionKh: imported.descriptionKh || prev.descriptionKh || '',
        };
      });

      const hasWarning = Boolean(data.meta?.wasBlockedByTaobao || !data.meta?.hasRealImage);
      setTaobaoImportStatus({
        type: hasWarning ? 'warning' : 'success',
        text:
          data.meta?.statusMessageKh ||
          'បានទាញទិន្នន័យ និងបកប្រែជាភាសាខ្មែររួចរាល់! សូមពិនិត្យមើលម្ដងទៀតមុននឹងរក្សាទុក។',
        priceCny: data.meta?.priceCny || 0,
      });
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      const cleanMsg =
        rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')
          ? 'កូតា AI បកប្រែប្រចាំថ្ងៃបានអស់ហើយ (20 ដង/ថ្ងៃ លើ Free Tier) — អ្នកអាចបំពេញឈ្មោះ តម្លៃ និងរូបភាពដោយផ្ទាល់ខាងក្រោមបានធម្មតា!'
          : rawMsg || 'មានបញ្ហាក្នុងការទាញទិន្នន័យពី Taobao / 识货 / 微购相册';
      setTaobaoImportStatus({
        type: 'error',
        text: cleanMsg,
      });
    } finally {
      setIsImportingTaobao(false);
    }
  };

  const handleTaobaoPaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (
      /https?:\/\/[^\s]*(?:taobao\.com|tmall\.com|tb\.cn|1688\.com|shihuo\.cn|hupu\.com|szwego\.com|wsxcme\.com|wegooooo\.com)/i.test(
        pasted
      ) &&
      !isImportingTaobao
    ) {
      setTimeout(() => {
        handleImportTaobao(pasted);
      }, 60);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden h-[94vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
              ADM
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base leading-tight truncate">ផ្ទាំងគ្រប់គ្រងហាង (Admin)</h2>
              <p className="text-[11px] text-neutral-400 truncate">MSPN ONLINE STORE · ការបញ្ជាទិញ &amp; ទំនិញ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && adminUser?.email && (
              <div className="hidden sm:flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg text-[11px] text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{adminUser.email}</span>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="ml-1 text-neutral-400 hover:text-white flex items-center gap-1"
                  title="ចាកចេញពីគណនី Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate (Clean Single-Step Google Admin Sign-In) */}
        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-5 sm:p-6 bg-neutral-50 overflow-y-auto">
            <div className="max-w-sm w-full bg-white p-6 rounded-2xl shadow-lg border border-neutral-200 text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 text-base">ចូលផ្ទាំងគ្រប់គ្រង Admin</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  សម្រាប់គណនីម្ចាស់ហាង <span className="font-mono text-neutral-700">{ADMIN_EMAIL}</span>
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium text-left">
                  {authError}
                </div>
              )}

              {unauthorizedHost && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-2.5">
                  <p className="text-xs font-bold text-amber-900">
                    ត្រូវអនុញ្ញាត Domain នេះក្នុង Firebase ជាមុន (ធ្វើតែម្ដងគត់)៖
                  </p>

                  <div className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] font-mono text-neutral-800 truncate">{unauthorizedHost}</span>
                    <button
                      type="button"
                      onClick={handleCopyHost}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-[10px] font-bold shrink-0"
                    >
                      {copiedHost ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHost ? 'បានចម្លង' : 'Copy'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Authentication → Settings → Authorized domains → Add domain
                  </p>

                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>បើក Firebase បន្ថែម Domain</span>
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#111113] hover:bg-neutral-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#E6D5B8]" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-[#E6D5B8]" />
                )}
                <span>{isLoading ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'ចូលដោយប្រើគណនី Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
            {/* Navigation Tabs */}
            <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-neutral-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap shrink-0 ${
                    activeTab === 'orders'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ការបញ្ជាទិញ ({orders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap shrink-0 ${
                    activeTab === 'products'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>គ្រប់គ្រងទំនិញ ({products.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap shrink-0 ${
                    activeTab === 'settings'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>ការកំណត់ &amp; Bot</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  fetchOrders();
                  fetchProducts();
                  showNotification('success', 'បានទាញយកទិន្នន័យថ្មីជោគជ័យ');
                }}
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl shrink-0"
                title="ទាញយកទិន្នន័យឡើងវិញ (Refresh)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Notification alert */}
            {feedbackMsg && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* TAB 1: ORDERS MANAGEMENT */}
            {activeTab === 'orders' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Status Filter */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-neutral-500 font-medium mr-1">ចម្រោះតាម៖</span>
                    {['all', 'pending', 'verified', 'china_transit', 'delivered'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          orderStatusFilter === st
                            ? 'bg-rose-600 text-white'
                            : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {st === 'all' && 'ទាំងអស់'}
                        {st === 'pending' && 'រង់ចាំពិនិត្យ'}
                        {st === 'verified' && 'បានផ្ទៀងផ្ទាត់'}
                        {st === 'china_transit' && 'កំពុងដឹកពីចិន'}
                        {st === 'delivered' && 'បានដឹកជញ្ជូន'}
                      </button>
                    ))}
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-2xl border border-neutral-200">
                    <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                    <p className="font-bold text-neutral-800 text-sm">មិនទាន់មានការបញ្ជាទិញទេ</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      រាល់ពេលអតិថិជនកុម្ម៉ង់លើវេបសាយ ព័ត៌មាននឹងបង្ហាញនៅត្រង់នេះ និងផ្ញើទៅ Telegram Bot ភ្លាមៗ។
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders
                      .filter((o) => orderStatusFilter === 'all' || o.paymentStatus === orderStatusFilter)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                                #{order.id}
                              </span>
                              <span className="text-xs text-neutral-400 font-sans">
                                {new Date(order.createdAt).toLocaleString('km-KH')}
                              </span>
                              {order.telegramNotificationStatus === 'sent' && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <Send className="w-3 h-3" />
                                  Telegram Bot បានផ្ញើ
                                </span>
                              )}
                            </div>

                            {/* Status Selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-neutral-500">ស្ថានភាព៖</span>
                              <select
                                value={order.paymentStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                className="text-xs font-semibold px-2.5 py-1 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-hidden"
                              >
                                <option value="pending">⏳ រង់ចាំពិនិត្យ Slip</option>
                                <option value="verified">✅ បានផ្ទៀងផ្ទាត់ (បានកក់/បង់រួច)</option>
                                <option value="china_transit">✈️ កំពុង Pre-order ពីចិន</option>
                                <option value="arrived_phnom_penh">📦 មកដល់ភ្នំពេញ</option>
                                <option value="delivered">🎉 បានដឹកជូនអតិថិជន</option>
                                <option value="cancelled">❌ បានបោះបង់</option>
                              </select>
                            </div>
                          </div>

                          {/* Customer Details & Actions */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="space-y-1">
                              <p className="font-bold text-neutral-900 text-sm">{order.customerName}</p>
                              <div className="flex items-center gap-2 text-neutral-600">
                                <span>ទូរសព្ទ៖ <strong>{order.customerPhone}</strong></span>
                                <a
                                  href={`tel:${order.customerPhone}`}
                                  className="text-emerald-600 hover:text-emerald-700 font-bold"
                                  title="ខលទៅកាន់អតិថិជន"
                                >
                                  (ខល)
                                </a>
                              </div>
                              <p className="text-neutral-500">ទីតាំង៖ {order.customerAddress}</p>
                              {order.customerTelegram && (
                                <p className="text-sky-600 font-medium">Telegram: {order.customerTelegram}</p>
                              )}
                              {order.customerNote && (
                                <p className="text-amber-700 bg-amber-50 p-1.5 rounded-md mt-1">
                                  ចំណាំ៖ {order.customerNote}
                                </p>
                              )}
                            </div>

                            {/* Ordered Items */}
                            <div className="space-y-1">
                              <p className="font-semibold text-neutral-700">ទំនិញដែលបានកុម្ម៉ង់ ({order.items.length} មុខ)៖</p>
                              <div className="space-y-1 text-neutral-600 max-h-24 overflow-y-auto">
                                {order.items.map((it, idx) => (
                                  <div key={idx} className="border-b border-neutral-50 pb-1">
                                    <div className="flex justify-between gap-2">
                                      <span>{it.productNameKh} ({it.selectedSize}) x{it.quantity}</span>
                                      <span className="font-mono font-bold shrink-0">${it.totalPriceUsd.toFixed(2)}</span>
                                    </div>
                                    {it.sourceUrl && (
                                      <a
                                        href={it.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-orange-600 hover:text-orange-700 font-mono underline truncate max-w-full"
                                      >
                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{it.sourceUrl}</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="pt-1 flex justify-between font-bold text-neutral-900 text-sm">
                                <span>សរុប (Total)៖</span>
                                <span className="text-rose-600">{formatUsd(order.totalUsd)} ({order.totalKhr.toLocaleString()} ៛)</span>
                              </div>
                            </div>

                            {/* Payment Slip & Actions */}
                            <div className="space-y-2 flex flex-col justify-between">
                              <div>
                                <p className="font-semibold text-neutral-700 mb-1">វិក្កយបត្រ (Payment Slip)៖</p>
                                {order.paymentSlipUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingSlipUrl(order.paymentSlipUrl!)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-800 font-semibold"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-neutral-600" />
                                    <span>មើលរូបភាព Slip</span>
                                  </button>
                                ) : (
                                  <span className="text-neutral-400 italic">មិនបានភ្ជាប់ Slip ទេ</span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTracking(order)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition flex items-center gap-1"
                                  title="កែប្រែព័ត៌មានដឹកជញ្ជូន និង Tracking"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>{order.trackingNumber ? 'Tracking: ' + order.trackingNumber : 'ដាក់ Tracking'}</span>
                                </button>
                                <a
                                  href={`https://t.me/${order.customerTelegram?.replace('@', '') || ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition"
                                >
                                  ឆាត Telegram
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setOrderToDelete(order)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition ml-auto"
                                  title="លុបការបញ្ជាទិញ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>លុប</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Shipment info badge if populated */}
                          {(order.carrierName || order.trackingNumber || order.estimatedArrival) && (
                            <div className="pt-2 border-t border-neutral-100 text-[11px] flex flex-wrap items-center gap-3 text-neutral-600 bg-neutral-50/60 p-2 rounded-lg">
                              <span className="font-semibold text-neutral-800 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-rose-600" />
                                {order.carrierName || 'ដឹកជញ្ជូន'}
                              </span>
                              {order.trackingNumber && (
                                <span>កូដ៖ <strong className="font-mono text-neutral-800">{order.trackingNumber}</strong></span>
                              )}
                              {order.estimatedArrival && (
                                <span>មកដល់៖ <strong className="text-rose-600">{order.estimatedArrival}</strong></span>
                              )}
                              {order.trackingNote && (
                                <span className="text-neutral-500 italic">"{order.trackingNote}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PRODUCTS MANAGEMENT */}
            {activeTab === 'products' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">បញ្ជីផលិតផលក្នុងហាង</h3>
                    <p className="text-xs text-neutral-500">អ្នកអាចបន្ថែម កែប្រែតម្លៃ ឬលុបទំនិញបានគ្រប់ពេល</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetTaobaoImportState();
                      setNewGalleryUrl('');
                      setIsCustomCategoryMode(false);
                      const defaultImg = '/assets/images/product_tshirt_streetwear_1794414887323.jpg';
                      setEditingProduct({
                        code: `MSPN-${Date.now().toString().slice(-4)}`,
                        nameKh: '',
                        nameEn: '',
                        category: 'clothing',
                        categoryKh: 'ខោអាវ',
                        priceUsd: 15.0,
                        image: defaultImg,
                        images: [defaultImg],
                        sourceUrl: '',
                        badge: 'ម៉ូដថ្មី',
                        sizes: ['M', 'L', 'XL', '2XL'],
                        colors: [{ name: 'ខ្មៅ (Black)', hex: '#171717', image: defaultImg }],
                        descriptionKh: '',
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111113] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-[#C9A45C]" />
                    <span>បន្ថែមទំនិញថ្មី (Add Product)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex gap-3 items-start"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={prod.image}
                          alt={prod.nameKh}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-xl object-cover bg-neutral-100 border"
                        />
                        {Array.isArray(prod.images) && prod.images.length > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-[#111113] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-white">
                            +{prod.images.length - 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-neutral-400">{prod.code}</span>
                          <span className="text-[10px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded">
                            {prod.categoryKh}
                          </span>
                        </div>
                        <h4 className="font-bold text-neutral-900 text-xs line-clamp-1 mt-0.5">
                          {prod.nameKh}
                        </h4>
                        <p className="text-xs font-bold text-neutral-900 tabular-nums mt-1">
                          {formatUsd(prod.priceUsd)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={() => {
                              resetTaobaoImportState();
                              setNewGalleryUrl('');
                              setIsCustomCategoryMode(false);
                              const initImages =
                                Array.isArray(prod.images) && prod.images.length > 0
                                  ? prod.images
                                  : prod.image
                                  ? [prod.image]
                                  : [];
                              setEditingProduct({
                                ...prod,
                                images: initImages,
                              });
                              setIsProductModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>កែប្រែ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(prod)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>លុប</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS & TELEGRAM BOT */}
            {activeTab === 'settings' && settings && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Telegram Bot Setup Banner */}
                <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-5 text-white shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="bg-white/20 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                        ការភ្ជាប់ TELEGRAM BOT
                      </span>
                      <h3 className="text-lg font-bold mt-1">ភ្ជាប់ Telegram Bot សម្រាប់ទទួលដំណឹងការបញ្ជាទិញ</h3>
                      <p className="text-xs text-sky-100 mt-1 max-w-xl">
                        រាល់ពេលអតិថិជនចុច Place Order លើវេបសាយ Telegram Bot នឹងផ្ញើសារប្រាប់ឈ្មោះ, លេខទូរសព្ទ, ទំនិញ, និងរូបភាព Slip ទៅកាន់គណនីរបស់អ្នកភ្លាមៗ!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestBot}
                      disabled={isTestingBot}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-sky-700 rounded-xl text-xs font-bold shadow-md hover:bg-neutral-100 transition shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTestingBot ? 'កំពុងតេស្ត...' : 'តេស្តផ្ញើសារ (Test Bot)'}</span>
                    </button>
                  </div>

                  {botTestResult && (
                    <div className="mt-3 p-2.5 bg-black/20 rounded-xl text-xs font-medium">
                      {botTestResult.msg}
                    </div>
                  )}
                </div>

                {/* Settings Form */}
                <form onSubmit={handleSaveSettings} className="space-y-6 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
                  {/* Telegram Bot Credentials */}
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm mb-3 text-sky-600 flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      <span>ព័ត៌មានសម្ងាត់ Telegram Bot</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Telegram Bot Token
                        </label>
                        <input
                          type="text"
                          placeholder="ឧ. 123456789:ABCdefGhIJKlmNoPQRstuv..."
                          value={settings.telegramBotToken}
                          onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-hidden"
                        />
                        <p className="text-[11px] text-neutral-400 mt-1">
                          ទទួលបានពី @BotFather លើ Telegram
                        </p>
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Telegram Chat ID ឬ Channel ID
                        </label>
                        <input
                          type="text"
                          placeholder="ឧ. 987654321 ឬ @yourchannel"
                          value={settings.telegramChatId}
                          onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-hidden"
                        />
                        <p className="text-[11px] text-neutral-400 mt-1">
                          ឆាតទៅ @userinfobot ឬ @getidsbot ដើម្បីមើល Chat ID របស់អ្នក
                        </p>
                      </div>
                    </div>

                    {/* Quick Guide in Khmer */}
                    <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
                      <p className="font-bold text-neutral-800">💡 របៀបបង្កើត Telegram Bot ក្នុងរយៈពេល ១ នាទី៖</p>
                      <p>1. បើក Telegram រួចស្វែងរក <strong>@BotFather</strong> ហើយចុច Start</p>
                      <p>2. វាយពាក្យ <code>/newbot</code> រួចដាក់ឈ្មោះ Bot របស់អ្នក នោះអ្នកនឹងទទួលបាន <strong>Bot Token</strong></p>
                      <p>3. ស្វែងរក <strong>@userinfobot</strong> រួចចុច Start នោះវានឹងបង្ហាញលេខ <strong>Id</strong> របស់អ្នក (ជា Chat ID)</p>
                      <p>4. យក Bot Token និង Chat ID មកបិទភ្ជាប់ (Paste) ក្នុងប្រអប់ខាងលើ រួចចុច Start លើ Bot របស់អ្នកជាការស្រេច!</p>
                    </div>
                  </div>

                  <hr className="border-neutral-200" />

                  {/* ABA Banking Information */}
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm mb-3 text-[#003756] flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>ព័ត៌មានគណនី ABA Bank (KHQR)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          ឈ្មោះម្ចាស់គណនី (Account Name)
                        </label>
                        <input
                          type="text"
                          value={settings.ownerName}
                          onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          គណនី USD
                        </label>
                        <input
                          type="text"
                          value={settings.usdAccount}
                          onChange={(e) => setSettings({ ...settings, usdAccount: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          គណនី KHR (រៀល)
                        </label>
                        <input
                          type="text"
                          value={settings.khrAccount}
                          onChange={(e) => setSettings({ ...settings, khrAccount: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-neutral-200" />

                  {/* Store Contacts & Delivery */}
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm mb-3">ទំនាក់ទំនង & កាលវិភាគ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Telegram Handle ផ្ទាល់ខ្លួន
                        </label>
                        <input
                          type="text"
                          value={settings.telegramHandle}
                          onChange={(e) => setSettings({ ...settings, telegramHandle: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          លេខទូរសព្ទទី ១
                        </label>
                        <input
                          type="text"
                          value={settings.phone1}
                          onChange={(e) => setSettings({ ...settings, phone1: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          លេខទូរសព្ទទី ២
                        </label>
                        <input
                          type="text"
                          value={settings.phone2}
                          onChange={(e) => setSettings({ ...settings, phone2: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          អត្ថបទ Banner ជូនដំណឹងខាងលើ
                        </label>
                        <input
                          type="text"
                          value={settings.bannerText}
                          onChange={(e) => setSettings({ ...settings, bannerText: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          លេខកូដសម្ងាត់ Admin PIN ថ្មី
                        </label>
                        <input
                          type="text"
                          value={settings.adminPin}
                          onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isLoading ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែ (Save Changes)'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-size Slip Viewing Modal */}
      {viewingSlipUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-md w-full bg-white rounded-2xl p-4 text-center">
            <button
              onClick={() => setViewingSlipUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 hover:bg-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-neutral-900 text-sm mb-3">វិក្កយបត្រផ្ទេរប្រាក់ ABA Slip</h4>
            <img
              src={viewingSlipUrl}
              alt="ABA Payment Slip"
              className="w-full max-h-[75vh] object-contain rounded-xl border"
            />
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Fixed Top Header + Pinned Taobao Auto-Import Bar */}
            <div className="p-5 pb-3 border-b border-neutral-100 bg-white shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-neutral-900 text-base">
                  {editingProduct.id ? 'កែប្រែព័ត៌មានទំនិញ' : 'បន្ថែមទំនិញថ្មី'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Taobao / 识货 (Shihuo) Link Auto-Import + Khmer Translation */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/75 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-orange-900">
                    <Link2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>បិទភ្ជាប់លីង Taobao / 识货 / 微购相册 (ទាញស្វ័យប្រវត្តិ + បកប្រែខ្មែរ/អង់គ្លេស)</span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Paste លីង Taobao, 识货 (shihuo.cn), ឬ 微购相册 (szwego.com) ទីនេះ..."
                    value={taobaoInput}
                    onChange={(e) => setTaobaoInput(e.target.value)}
                    onPaste={handleTaobaoPaste}
                    className="flex-1 px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs focus:outline-hidden focus:border-orange-500 placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleImportTaobao()}
                    disabled={isImportingTaobao}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition shrink-0"
                  >
                    {isImportingTaobao ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>កំពុងទាញ...</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5" />
                        <span>ទាញទិន្នន័យ</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-900">
                    <span>បូកថ្លៃដឹក+ចំណេញ ($):</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={taobaoMarkupUsd}
                      onChange={(e) => setTaobaoMarkupUsd(parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-0.5 bg-white border border-orange-200 rounded-lg font-mono text-center text-xs"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-orange-100/60 border border-orange-200 rounded-lg text-[11px] font-semibold text-orange-800 cursor-pointer transition">
                      <Upload className="w-3 h-3" />
                      <span>{taobaoScreenshot ? 'បានភ្ជាប់ Screenshot ✓' : 'ភ្ជាប់ Screenshot (បើលីងបិទ)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleTaobaoScreenshotUpload}
                        className="hidden"
                      />
                    </label>
                    {taobaoScreenshot && (
                      <button
                        type="button"
                        onClick={() => setTaobaoScreenshot('')}
                        className="text-[11px] text-neutral-500 hover:text-red-600 font-medium"
                      >
                        ដករូបចេញ
                      </button>
                    )}
                  </div>
                </div>

                {taobaoImportStatus && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-2 overflow-hidden ${
                      taobaoImportStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : taobaoImportStatus.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {taobaoImportStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="break-words">{taobaoImportStatus.text}</p>
                      {taobaoImportStatus.priceCny ? (
                        <p className="font-mono text-[10px] opacity-80">
                          តម្លៃដើម: ¥{taobaoImportStatus.priceCny} + ថ្លៃដឹក/ចំណេញ ${taobaoMarkupUsd}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} noValidate className="p-5 pt-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  ឈ្មោះទំនិញជាភាសាខ្មែរ *
                </label>
                <input
                  type="text"
                  placeholder="ឧ. អាវយឺតដៃខ្លី Streetwear ម៉ូដថ្មី"
                  value={editingProduct.nameKh || ''}
                  onChange={(e) => {
                    setProductFormError(null);
                    setEditingProduct({ ...editingProduct, nameKh: e.target.value });
                  }}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  ឈ្មោះជាភាសាអង់គ្លេស
                </label>
                <input
                  type="text"
                  value={editingProduct.nameEn || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameEn: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    ប្រភេទទំនិញ (បង្កើតស្វ័យប្រវត្តិលើវេបសាយ)
                  </label>
                  {(() => {
                    const baseCatMap: Record<string, string> = {
                      clothing: 'ខោអាវ',
                      shoes: 'ស្បែកជើង',
                      belts: 'ខ្សែក្រវ៉ាត់',
                      watch: 'នាឡិកា',
                      accessories: 'គ្រឿងតុបតែង',
                      bags: 'កាបូប',
                      eyewear: 'វ៉ែនតា',
                      hats: 'មួក',
                      sports: 'សម្ភារៈកីឡា',
                      electronics: 'គ្រឿងអេឡិចត្រូនិក',
                      beauty: 'គ្រឿងសម្អាង',
                      perfume: 'ទឹកអប់',
                    };
                    products.forEach((p) => {
                      if (p.category && p.categoryKh && !baseCatMap[p.category]) {
                        baseCatMap[p.category] = p.categoryKh;
                      }
                    });
                    if (editingProduct.category && editingProduct.categoryKh && !baseCatMap[editingProduct.category]) {
                      baseCatMap[editingProduct.category] = editingProduct.categoryKh;
                    }

                    return (
                      <div className="space-y-1.5">
                        <select
                          value={isCustomCategoryMode ? '__custom__' : editingProduct.category || 'clothing'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              setIsCustomCategoryMode(true);
                              setEditingProduct({
                                ...editingProduct,
                                category: `cat-${Date.now().toString().slice(-4)}`,
                                categoryKh: '',
                              });
                            } else {
                              setIsCustomCategoryMode(false);
                              setEditingProduct({
                                ...editingProduct,
                                category: val,
                                categoryKh: baseCatMap[val] || val,
                              });
                            }
                          }}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-medium"
                        >
                          {Object.entries(baseCatMap).map(([slug, labelKh]) => (
                            <option key={slug} value={slug}>
                              {labelKh}
                            </option>
                          ))}
                          <option value="__custom__">+ បង្កើតប្រភេទថ្មីដោយខ្លួនឯង...</option>
                        </select>

                        {isCustomCategoryMode && (
                          <input
                            type="text"
                            required
                            placeholder="វាយឈ្មោះប្រភេទថ្មី (ឧ. កាបូបស្ពាយ)"
                            value={editingProduct.categoryKh || ''}
                            onChange={(e) => {
                              const label = e.target.value;
                              const asciiSlug = label
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-|-$/g, '');
                              setEditingProduct({
                                ...editingProduct,
                                categoryKh: label,
                                category: asciiSlug || editingProduct.category || `cat-${Date.now().toString().slice(-4)}`,
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-hidden focus:border-neutral-900"
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    តម្លៃគិតជា USD ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editingProduct.priceUsd ?? ''}
                    onChange={(e) => {
                      setProductFormError(null);
                      const val = e.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        priceUsd: val === '' ? 0 : parseFloat(val) || 0,
                      });
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-mono font-bold"
                  />
                </div>
              </div>

              {/* Source URL for Telegram Order Forwarding */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  លីងប្រភពទំនិញ Taobao / 识货 / 微购相册 (ផ្ញើចូល Telegram ស្វ័យប្រវត្តិពេលភ្ញៀវកុម្ម៉ង់)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://item.taobao.com/... ឬ https://www.szwego.com/..."
                    value={editingProduct.sourceUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sourceUrl: e.target.value })}
                    className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-mono text-[11px] text-neutral-700"
                  />
                  {editingProduct.sourceUrl && (
                    <a
                      href={editingProduct.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 shrink-0"
                      title="បើកមើលលីង"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Multi-Photo Gallery Manager */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-neutral-900">
                      រូបភាពទំនិញច្រើនសន្លឹក (Gallery Photos) *
                    </label>
                    <p className="text-[10px] text-neutral-500">
                      បង្ហោះរូបបានច្រើនសន្លឹកព្រមគ្នា ហើយចុចលើរូបណាមួយដើម្បីតាំងជា "រូបមេ"
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111113] text-white text-[11px] font-bold hover:bg-neutral-800 cursor-pointer transition shrink-0">
                    <ImageIcon className="w-3.5 h-3.5 text-[#C9A45C]" />
                    <span>+ បង្ហោះច្រើនសន្លឹក</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultiGalleryUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Gallery Grid Preview */}
                {(() => {
                  const gallery = Array.from(
                    new Set(
                      [
                        ...(editingProduct.image ? [editingProduct.image] : []),
                        ...(Array.isArray(editingProduct.images) ? editingProduct.images : []),
                        ...taobaoGalleryImages,
                      ].filter(Boolean)
                    )
                  );
                  return (
                    gallery.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {gallery.map((imgUrl, idx) => {
                          const isCover = editingProduct.image === imgUrl;
                          return (
                            <div
                              key={`${imgUrl.slice(0, 32)}-${idx}`}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 group bg-white ${
                                isCover ? 'border-[#B8924A] ring-2 ring-[#B8924A]/25' : 'border-stone-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          image: imgUrl,
                                          images: Array.from(new Set([imgUrl, ...(prev.images || []), ...gallery])),
                                        }
                                      : prev
                                  )
                                }
                                className="w-full h-full block"
                                title="ចុចដើម្បីតាំងជារូបមេ (Cover)"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Gallery ${idx + 1}`}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                              {isCover ? (
                                <span className="absolute bottom-1 left-1 right-1 text-center bg-[#111113]/90 text-[#E6D5B8] text-[9px] font-bold py-0.5 rounded">
                                  រូបមេ
                                </span>
                              ) : (
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-mono px-1 rounded">
                                  #{idx + 1}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(imgUrl)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition"
                                title="លុបរូបនេះ"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )
                  );
                })()}

                {/* Add Image URL Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="បិទភ្ជាប់ Link រូបភាពបន្ថែម (https://...)"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGalleryUrl();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-neutral-900 text-neutral-700 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryUrl}
                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-neutral-900 font-bold rounded-lg text-[11px] transition shrink-0"
                  >
                    + បន្ថែម Link
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  ទំហំ (Sizes - បំបែកដោយសញ្ញាក្បៀស)
                </label>
                <input
                  type="text"
                  placeholder="M, L, XL, 2XL"
                  value={Array.isArray(editingProduct.sizes) ? editingProduct.sizes.join(', ') : ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      sizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Color Variant Manager with Photo Mapping */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-neutral-900">
                      ពណ៌ និងដូររូបភាពតាមពណ៌ (Colors & Photo Switch)
                    </label>
                    <p className="text-[10px] text-neutral-500">
                      ភ្ជាប់រូបភាពឱ្យពណ៌នីមួយៗ — ពេលអតិថិជនចុចរើសពណ៌ រូបភាពទំនិញនឹងដូរតាមភ្លាមៗ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct((prev) =>
                        prev
                          ? {
                              ...prev,
                              colors: [
                                ...(prev.colors || []),
                                { name: 'ពណ៌ថ្មី', hex: '#171717', image: prev.image || undefined },
                              ],
                            }
                          : prev
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#111113] text-white text-[11px] font-bold hover:bg-neutral-800 transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C9A45C]" />
                    <span>បន្ថែមពណ៌</span>
                  </button>
                </div>

                {(() => {
                  const galleryChoices = Array.from(
                    new Set(
                      [
                        ...(editingProduct.image ? [editingProduct.image] : []),
                        ...(Array.isArray(editingProduct.images) ? editingProduct.images : []),
                        ...(editingProduct.colors || []).map((c) => c.image).filter(Boolean) as string[],
                      ].filter(Boolean)
                    )
                  );
                  const colorsList = Array.isArray(editingProduct.colors) ? editingProduct.colors : [];

                  if (colorsList.length === 0) {
                    return (
                      <p className="text-[11px] text-neutral-400 italic py-2 text-center">
                        មិនទាន់មានពណ៌ទេ — សូមចុច "+ បន្ថែមពណ៌"
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {colorsList.map((col, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-xl border border-stone-200"
                        >
                          {/* Hex Color Picker */}
                          <input
                            type="color"
                            value={/^#[0-9A-Fa-f]{6}$/.test(col.hex) ? col.hex : '#171717'}
                            onChange={(e) => {
                              const next = [...colorsList];
                              next[idx] = { ...next[idx], hex: e.target.value };
                              setEditingProduct({ ...editingProduct, colors: next });
                            }}
                            className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white shrink-0"
                            title="រើសកូដពណ៌"
                          />

                          {/* Color Name */}
                          <input
                            type="text"
                            placeholder="ឈ្មោះពណ៌ (ឧ. ខ្មៅ)"
                            value={col.name}
                            onChange={(e) => {
                              const next = [...colorsList];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setEditingProduct({ ...editingProduct, colors: next });
                            }}
                            className="flex-1 min-w-[110px] px-2.5 py-1.5 bg-neutral-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
                          />

                          {/* Linked Photo Preview + Selector */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {col.image ? (
                              <img
                                src={col.image}
                                alt={col.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                <ImageIcon className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <select
                              value={col.image || ''}
                              onChange={(e) => {
                                const next = [...colorsList];
                                next[idx] = {
                                  ...next[idx],
                                  image: e.target.value || undefined,
                                };
                                setEditingProduct({ ...editingProduct, colors: next });
                              }}
                              className="px-2 py-1.5 bg-neutral-50 border border-stone-200 rounded-lg text-[11px] font-medium max-w-[115px] focus:outline-hidden"
                            >
                              <option value="">ប្រើរូបមេ</option>
                              {galleryChoices.map((gUrl, gIdx) => (
                                <option key={`${gUrl.slice(0, 20)}-${gIdx}`} value={gUrl}>
                                  រូបទី #{gIdx + 1} {gUrl === editingProduct.image ? '(មេ)' : ''}
                                </option>
                              ))}
                            </select>

                            {/* Direct Upload Photo for This Color */}
                            <label
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-neutral-700 cursor-pointer transition shrink-0"
                              title="បង្ហោះរូបសម្រាប់ពណ៌នេះ"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleColorImageUpload(idx, e)}
                                className="hidden"
                              />
                            </label>

                            {/* Delete Color */}
                            <button
                              type="button"
                              onClick={() => {
                                const next = colorsList.filter((_, cIdx) => cIdx !== idx);
                                setEditingProduct({ ...editingProduct, colors: next });
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                              title="លុបពណ៌នេះ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  ការពិពណ៌នាពីទំនិញ
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.descriptionKh || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, descriptionKh: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              {productFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{productFormError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProductFormError(null);
                    setIsProductModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-neutral-800 disabled:opacity-60"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>កំពុងរក្សាទុក...</span>
                    </>
                  ) : (
                    <span>រក្សាទុកទំនិញ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipment & Tracking Editor Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setTrackingOrder(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-neutral-900 text-base">
                កែប្រែព័ត៌មានដឹកជញ្ជូន (Tracking) #{trackingOrder.id}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              សម្រាប់អតិថិជន៖ <strong>{trackingOrder.customerName}</strong> ({trackingOrder.customerPhone})
            </p>

            <form onSubmit={handleSaveTracking} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  ស្ថានភាពទំនិញបច្ចុប្បន្ន (Shipment Status) *
                </label>
                <select
                  value={trackingForm.paymentStatus}
                  onChange={(e) =>
                    setTrackingForm({ ...trackingForm, paymentStatus: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-semibold"
                >
                  <option value="pending">⏳ រង់ចាំពិនិត្យ Slip (Order Received)</option>
                  <option value="verified">✅ បានផ្ទៀងផ្ទាត់ការទូទាត់ (Payment Verified)</option>
                  <option value="china_transit">✈️ កំពុងដឹកពីប្រទេសចិន (In Transit from China)</option>
                  <option value="arrived_phnom_penh">📦 ទំនិញមកដល់ភ្នំពេញ (Arrived in Phnom Penh)</option>
                  <option value="delivered">🎉 បានដឹកជូនដល់ដៃអតិថិជន (Delivered)</option>
                  <option value="cancelled">❌ បានបោះបង់ (Cancelled)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    សេវាដឹកជញ្ជូន (Carrier / Logistics)
                  </label>
                  <input
                    type="text"
                    placeholder="ឧ. វីរៈប៊ុនថាំ (VET), J&T Express, ឡានចិន"
                    value={trackingForm.carrierName}
                    onChange={(e) =>
                      setTrackingForm({ ...trackingForm, carrierName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    លេខកូដកញ្ចប់ (Tracking #)
                  </label>
                  <input
                    type="text"
                    placeholder="ឧ. VET-123456 ឬ JT-98765"
                    value={trackingForm.trackingNumber}
                    onChange={(e) =>
                      setTrackingForm({ ...trackingForm, trackingNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  កាលបរិច្ឆេទរំពឹងទុកមកដល់ (Estimated Arrival)
                </label>
                <input
                  type="text"
                  placeholder="ឧ. 20-25 វិច្ឆិកា 2026 (៧-១៤ ថ្ងៃ)"
                  value={trackingForm.estimatedArrival}
                  onChange={(e) =>
                    setTrackingForm({ ...trackingForm, estimatedArrival: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  ចំណាំបន្ថែមសម្រាប់អតិថិជនមើលឃើញ (Tracking Note)
                </label>
                <textarea
                  rows={3}
                  placeholder="ឧ. ទំនិញបានវេចខ្ចប់ចេញពីឃ្លាំងចិនរួចរាល់ហើយ កំពុងដឹកមកព្រំដែនកម្ពុជា"
                  value={trackingForm.trackingNote}
                  onChange={(e) =>
                    setTrackingForm({ ...trackingForm, trackingNote: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-neutral-800"
                >
                  រក្សាទុកព័ត៌មាន Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Deletion In-App Modal */}
      {orderToDelete && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => !isDeleting && setOrderToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-base">បញ្ជាក់ការលុបការបញ្ជាទិញ</h4>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                តើអ្នកពិតជាចង់លុបការកុម្ម៉ង់កូដ <strong className="font-mono text-neutral-900">#{orderToDelete.id}</strong> (អតិថិជន៖ <strong>{orderToDelete.customerName}</strong>) មែនទេ?
              </p>
              <p className="text-[11px] text-red-500 mt-1">
                ⚠️ សកម្មភាពនេះនឹងលុបការបញ្ជាទិញចេញពីប្រព័ន្ធរហូត!
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition"
              >
                បោះបង់
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => executeDeleteOrder(orderToDelete.id)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'កំពុងលុប...' : 'លុបចេញឥឡូវនេះ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Deletion In-App Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => !isDeleting && setProductToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-base">បញ្ជាក់ការលុបទំនិញ</h4>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                តើអ្នកពិតជាចង់លុបទំនិញ <strong className="text-neutral-900">{productToDelete.nameKh}</strong> ({productToDelete.code}) មែនទេ?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition"
              >
                បោះបង់
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => executeDeleteProduct(productToDelete.id)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'កំពុងលុប...' : 'លុបចេញឥឡូវនេះ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
