import { Product } from '../data/products';

export interface OrderItem {
  productId: string;
  productCode: string;
  productNameKh: string;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
  sourceUrl?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerTelegram?: string;
  customerNote?: string;
  items: OrderItem[];
  totalUsd: number;
  totalKhr: number;
  paymentMethod: 'aba_khqr' | 'deposit_aba';
  paymentSlipUrl?: string; // base64 or storage url
  paymentStatus: 'pending' | 'verified' | 'china_transit' | 'arrived_phnom_penh' | 'delivered' | 'cancelled';
  telegramNotificationStatus: 'sent' | 'failed' | 'not_configured';
  telegramError?: string;
  trackingNumber?: string;
  carrierName?: string;
  estimatedArrival?: string;
  trackingNote?: string;
  updatedAt?: string;
}

export interface StoreSettings {
  storeName: string;
  taglineKh: string;
  bannerText: string;
  waitDays: string;
  ownerName: string;
  usdAccount: string;
  khrAccount: string;
  telegramHandle: string;
  telegramBotToken: string;
  telegramChatId: string;
  phone1: string;
  phone2: string;
  deliveryNoticeKh: string;
  exchangeRate: number;
  adminPin: string;
}
