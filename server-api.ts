import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { PRODUCTS, STORE_INFO, EXCHANGE_RATE } from './src/data/products.js';
import type { Order, StoreSettings } from './src/types/store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Data file paths (Vercel Serverless mounts /var/task read-only, so runtime writes use /tmp)
const IS_VERCEL = Boolean(process.env.VERCEL);
const SEED_DATA_DIR = fs.existsSync(path.resolve(process.cwd(), 'data', 'store-db.json'))
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(__dirname, 'data');
const SEED_DB_FILE = path.join(SEED_DATA_DIR, 'store-db.json');
const RUNTIME_DB_FILE = IS_VERCEL ? '/tmp/mspn-store-db.json' : SEED_DB_FILE;

if (!IS_VERCEL && !fs.existsSync(SEED_DATA_DIR)) {
  fs.mkdirSync(SEED_DATA_DIR, { recursive: true });
}

// Default initial state
const defaultSettings: StoreSettings = {
  storeName: STORE_INFO.name,
  taglineKh: STORE_INFO.taglineKh,
  bannerText:
    '✨ ទទួលកម្ម៉ង់ទំនិញ Pre-order ពីប្រទេសចិន គុណភាពល្អ តម្លៃសមរម្យ រង់ចាំ ៧-១៤ ថ្ងៃ · សេវាដឹកទូទាំង ២៥ ខេត្ត-ក្រុង ✨',
  waitDays: STORE_INFO.waitDays,
  ownerName: STORE_INFO.ownerName,
  usdAccount: STORE_INFO.usdAccount,
  khrAccount: STORE_INFO.khrAccount,
  telegramHandle: STORE_INFO.telegramHandle,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  phone1: STORE_INFO.phone1,
  phone2: STORE_INFO.phone2,
  deliveryNoticeKh: STORE_INFO.deliveryKh,
  exchangeRate: EXCHANGE_RATE,
  adminPin: '1234',
};

interface DbState {
  settings: StoreSettings;
  products: any[];
  orders: Order[];
}

function loadDb(): DbState {
  try {
    const dbPathToRead = fs.existsSync(RUNTIME_DB_FILE)
      ? RUNTIME_DB_FILE
      : fs.existsSync(SEED_DB_FILE)
      ? SEED_DB_FILE
      : '';

    if (dbPathToRead) {
      const data = fs.readFileSync(dbPathToRead, 'utf-8');
      const parsed = JSON.parse(data);
      const storedProducts: any[] = Array.isArray(parsed.products) ? parsed.products : PRODUCTS;

      // Only backfill missing fields for legacy items that predate images/colors support; never restore deleted images or deleted products
      const defaultMap = new Map(PRODUCTS.map((p) => [p.id, p]));
      const enrichedProducts = storedProducts.map((prod) => {
        const def = defaultMap.get(prod.id);
        if (!def) return prod;
        return {
          ...prod,
          images: Array.isArray(prod.images)
            ? prod.images
            : def.images || (prod.image ? [prod.image] : []),
          colors: Array.isArray(prod.colors) ? prod.colors : def.colors || [],
        };
      });

      const state: DbState = {
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
        products: enrichedProducts,
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      };

      if (IS_VERCEL && !fs.existsSync(RUNTIME_DB_FILE)) {
        saveDb(state);
      }
      return state;
    }
  } catch (err) {
    console.error('Error reading db file:', err);
  }

  // Initial state
  const initial: DbState = {
    settings: defaultSettings,
    products: PRODUCTS,
    orders: [],
  };
  saveDb(initial);
  return initial;
}

function saveDb(state: DbState) {
  try {
    fs.writeFileSync(RUNTIME_DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

let db = loadDb();

function escapeTelegramHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Telegram Bot Helper
async function sendTelegramNotification(
  token: string,
  chatId: string,
  message: string,
  photoBase64?: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || !chatId) {
    return { success: false, error: 'Telegram Bot Token ឬ Chat ID មិនទាន់បានកំណត់' };
  }

  try {
    // If photo is provided, send photo with caption (send full text separately if > 1024 chars so HTML & links never truncate)
    if (photoBase64 && photoBase64.startsWith('data:image')) {
      const match = photoBase64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const imageType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const needsSeparateMessage = message.length > 1024;
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append(
          'caption',
          needsSeparateMessage ? '🧾 <b>វិក្កយបត្របង់ប្រាក់ (Payment Slip)</b>' : message
        );
        formData.append('parse_mode', 'HTML');
        formData.append(
          'photo',
          new Blob([buffer], { type: `image/${imageType}` }),
          `slip.${imageType}`
        );

        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const photoData = await photoRes.json();
        if (photoData.ok) {
          if (!needsSeparateMessage) {
            return { success: true };
          }
          // Send complete un-truncated message right after the slip photo
          const fullRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'HTML',
            }),
          });
          const fullData = await fullRes.json();
          if (fullData.ok) {
            return { success: true };
          }
          return { success: false, error: fullData.description || 'Telegram API Error' };
        }
        console.warn('sendPhoto failed, falling back to sendMessage:', photoData.description);
      }
    }

    // Text fallback
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true };
    }
    return { success: false, error: data.description || 'Telegram API Error' };
  } catch (err: any) {
    console.error('Telegram notification error:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}

// ----------------- API ENDPOINTS -----------------

// 1. Get Store Settings & Public Info
app.get('/api/settings', (_req, res) => {
  const { adminPin, telegramBotToken, ...publicSettings } = db.settings;
  res.json({
    settings: {
      ...publicSettings,
      hasBotToken: Boolean(telegramBotToken),
    },
  });
});

// 2. Admin Get Full Settings (requires PIN)
app.post('/api/admin/settings', (req, res) => {
  const { pin } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវ (Invalid PIN)' });
  }
  res.json({ settings: db.settings });
});

// 3. Admin Update Settings (requires PIN)
app.put('/api/admin/settings', (req, res) => {
  const { pin, newSettings } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវ (Invalid PIN)' });
  }

  db.settings = {
    ...db.settings,
    ...newSettings,
  };
  saveDb(db);
  res.json({ success: true, settings: db.settings });
});

// 4. Test Telegram Bot
app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body || {};
  const botToken = token || db.settings.telegramBotToken;
  const targetChatId = chatId || db.settings.telegramChatId;

  if (!botToken || !targetChatId) {
    return res.status(400).json({ error: 'សូមបញ្ចូល Bot Token និង Chat ID ដើម្បីតេស្ត' });
  }

  const testMsg = `🔔 <b>MSPN ONLINE STORE - តេស្តភ្ជាប់ Telegram Bot</b>\n\n✅ ការភ្ជាប់ជោគជ័យ! រាល់ពេលមានអតិថិជនបញ្ជាទិញលើវេបសាយ ប្រព័ន្ធនឹងផ្ញើសារមកកាន់ទីនេះភ្លាមៗ។\n⏰ ម៉ោង៖ ${new Date().toLocaleString('km-KH')}`;

  const result = await sendTelegramNotification(botToken, targetChatId, testMsg);
  if (result.success) {
    res.json({ success: true, message: 'បានផ្ញើសារតេស្តទៅកាន់ Telegram ជោគជ័យ!' });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// 5. Get Products
app.get('/api/products', (_req, res) => {
  res.json({ products: db.products });
});

// 6. Admin Create Product
app.post('/api/admin/products', (req, res) => {
  const { pin, product } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'លេខកូដ PIN មិនត្រឹមត្រូវ (Invalid PIN)' });
  }
  if (!product || !String(product.nameKh || '').trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះទំនិញជាភាសាខ្មែរ' });
  }

  const newProduct = {
    ...product,
    id: `p-${Date.now()}`,
    code: product.code || `MSPN-${Date.now().toString().slice(-4)}`,
    category: product.category || 'clothing',
    categoryKh: product.categoryKh || 'ខោអាវ',
    priceUsd: Number(product.priceUsd) || 0,
    sizes: Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ['Free Size'],
    colors: Array.isArray(product.colors) ? product.colors : [],
    descriptionKh: product.descriptionKh || '',
    rating: product.rating || 5.0,
    reviewCount: product.reviewCount || 1,
  };

  db.products.unshift(newProduct);
  saveDb(db);
  res.json({ success: true, product: newProduct });
});

// 7. Admin Update Product
app.put('/api/admin/products/:id', (req, res) => {
  const { pin, product } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products[index] = { ...db.products[index], ...product };
  saveDb(db);
  res.json({ success: true, product: db.products[index] });
});

// 8. Admin Delete Product
app.delete('/api/admin/products/:id', (req, res) => {
  const pin = req.body?.pin || (req.query?.pin as string);
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// 9. Customer Place Order (Direct in website)
app.post('/api/orders', async (req, res) => {
  const orderData = req.body || {};

  if (!orderData.customerName || !orderData.customerPhone || !orderData.items || orderData.items.length === 0) {
    return res.status(400).json({ error: 'សូមបំពេញឈ្មោះ លេខទូរសព្ទ និងជ្រើសរើសទំនិញ' });
  }

  // Enrich items with product sourceUrl from DB if not sent by client
  const enrichedItems = (orderData.items as any[]).map((item) => {
    const dbProd = db.products.find(
      (p) => p.id === item.productId || (item.productCode && p.code === item.productCode)
    );
    const resolvedSourceUrl = item.sourceUrl || dbProd?.sourceUrl || '';
    return {
      ...item,
      ...(resolvedSourceUrl ? { sourceUrl: resolvedSourceUrl } : {}),
    };
  });

  const orderId = `MSPN-${Date.now().toString().slice(-6)}`;
  const newOrder: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    customerAddress: orderData.customerAddress || 'មិនបានបញ្ជាក់',
    customerTelegram: orderData.customerTelegram || '',
    customerNote: orderData.customerNote || '',
    items: enrichedItems,
    totalUsd: orderData.totalUsd,
    totalKhr: orderData.totalKhr,
    paymentMethod: orderData.paymentMethod || 'aba_khqr',
    paymentSlipUrl: orderData.paymentSlipUrl,
    paymentStatus: orderData.paymentSlipUrl ? 'verified' : 'pending',
    telegramNotificationStatus: 'not_configured',
  };

  // Build formatted HTML message for Telegram
  let tgMessage = `🛍️ <b>[${escapeTelegramHtml(db.settings.storeName)}] ការបញ្ជាទិញថ្មី #${escapeTelegramHtml(newOrder.id)}</b>\n`;
  tgMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
  tgMessage += `👤 <b>អតិថិជន៖</b> ${escapeTelegramHtml(newOrder.customerName)}\n`;
  tgMessage += `📞 <b>ទូរសព្ទ៖</b> <code>${escapeTelegramHtml(newOrder.customerPhone)}</code>\n`;
  tgMessage += `📍 <b>ទីតាំង៖</b> ${escapeTelegramHtml(newOrder.customerAddress)}\n`;
  if (newOrder.customerTelegram) {
    tgMessage += `💬 <b>Telegram៖</b> ${escapeTelegramHtml(newOrder.customerTelegram)}\n`;
  }
  if (newOrder.customerNote) {
    tgMessage += `📝 <b>ចំណាំ៖</b> ${escapeTelegramHtml(newOrder.customerNote)}\n`;
  }
  tgMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
  tgMessage += `📦 <b>ទំនិញដែលបានកុម្ម៉ង់ (${newOrder.items.length} មុខ)៖</b>\n`;

  newOrder.items.forEach((item, idx) => {
    tgMessage += `${idx + 1}. <b>${escapeTelegramHtml(item.productNameKh)}</b> (${escapeTelegramHtml(item.productCode)})\n`;
    tgMessage += `   ▫️ ទំហំ៖ ${escapeTelegramHtml(item.selectedSize)} | ពណ៌៖ ${escapeTelegramHtml(item.selectedColor)}\n`;
    tgMessage += `   ▫️ ចំនួន៖ ${item.quantity} x $${item.unitPriceUsd.toFixed(2)} = <b>$${item.totalPriceUsd.toFixed(2)}</b>\n`;
    if (item.sourceUrl) {
      const safeUrl = escapeTelegramHtml(item.sourceUrl.trim());
      if (/^https?:\/\//i.test(item.sourceUrl.trim())) {
        tgMessage += `   🔗 <b>លីងទំនិញ៖</b> <a href="${safeUrl}">${safeUrl}</a>\n`;
      } else {
        tgMessage += `   🔗 <b>លីងទំនិញ៖</b> ${safeUrl}\n`;
      }
    }
  });

  tgMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
  tgMessage += `💰 <b>សរុប៖ $${newOrder.totalUsd.toFixed(2)} (${newOrder.totalKhr.toLocaleString()} ៛)</b>\n`;
  tgMessage += `💳 <b>ការទូទាត់៖</b> ${newOrder.paymentMethod === 'aba_khqr' ? 'ABA Bank KHQR' : 'កក់ប្រាក់តាម ABA'}\n`;
  tgMessage += `🧾 <b>វិក្កយបត្រ (Slip)៖</b> ${newOrder.paymentSlipUrl ? '✅ មានភ្ជាប់រូបភាព' : '⏳ រង់ចាំពិនិត្យ'}\n`;
  tgMessage += `⏰ <b>កាលបរិច្ឆេទ៖</b> ${new Date().toLocaleString('km-KH')}`;

  // Dispatch to Telegram Bot if configured
  if (db.settings.telegramBotToken && db.settings.telegramChatId) {
    const tgResult = await sendTelegramNotification(
      db.settings.telegramBotToken,
      db.settings.telegramChatId,
      tgMessage,
      newOrder.paymentSlipUrl
    );

    if (tgResult.success) {
      newOrder.telegramNotificationStatus = 'sent';
    } else {
      newOrder.telegramNotificationStatus = 'failed';
      newOrder.telegramError = tgResult.error;
    }
  }

  // Save order to DB
  db.orders.unshift(newOrder);
  saveDb(db);

  res.json({
    success: true,
    order: newOrder,
    telegramNotificationStatus: newOrder.telegramNotificationStatus,
  });
});

// 10. Admin Get Orders
app.post('/api/admin/orders', (req, res) => {
  const { pin } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  res.json({ orders: db.orders });
});

// 11. Admin Update Order Status
app.patch('/api/admin/orders/:id/status', (req, res) => {
  const { pin, status } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.paymentStatus = status;
  saveDb(db);
  res.json({ success: true, order });
});

// 12. Customer Track Order by Phone or Order ID
app.get('/api/orders/track', (req, res) => {
  const query = ((req.query.q || req.query.phone || req.query.orderId || '') as string).trim();
  if (!query) {
    return res.status(400).json({ error: 'សូមបញ្ចូលលេខទូរសព្ទ ឬលេខកូដបញ្ជាទិញ' });
  }

  const cleanQuery = query.toLowerCase().replace(/[\s\-\(\)]/g, '');

  const matched = db.orders.filter((order) => {
    const cleanId = order.id.toLowerCase().replace(/[\s\-]/g, '');
    const cleanPhone = (order.customerPhone || '').replace(/[\s\-\(\)]/g, '');
    return cleanId.includes(cleanQuery) || cleanPhone.includes(cleanQuery);
  });

  // Strip internal/sensitive fields for public response
  const sanitized = matched.map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    items: o.items,
    totalUsd: o.totalUsd,
    totalKhr: o.totalKhr,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paymentSlipUploaded: Boolean(o.paymentSlipUrl),
    trackingNumber: o.trackingNumber,
    carrierName: o.carrierName,
    estimatedArrival: o.estimatedArrival,
    trackingNote: o.trackingNote,
    updatedAt: o.updatedAt,
  }));

  res.json({ success: true, count: sanitized.length, orders: sanitized });
});

// 13. Admin Update Tracking Details
app.patch('/api/admin/orders/:id/tracking', (req, res) => {
  const { pin, trackingNumber, carrierName, estimatedArrival, trackingNote, paymentStatus } = req.body || {};
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (carrierName !== undefined) order.carrierName = carrierName;
  if (estimatedArrival !== undefined) order.estimatedArrival = estimatedArrival;
  if (trackingNote !== undefined) order.trackingNote = trackingNote;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  order.updatedAt = new Date().toISOString();

  saveDb(db);
  res.json({ success: true, order });
});

// 14. Admin Delete Order
app.delete('/api/admin/orders/:id', (req, res) => {
  const pin = req.body?.pin || (req.query?.pin as string);
  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  db.orders = db.orders.filter((o) => o.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// ----------------- TAOBAO AUTO-IMPORT + KHMER TRANSLATION -----------------
function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeImageUrl(raw: string): string {
  const cleaned = (raw || '').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('//')) return `https:${cleaned}`;
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned;
  return '';
}

function extractTaobaoInputDetails(rawInput: string) {
  const urlMatch = rawInput.match(/https?:\/\/[^\s"'<>\]】」]+/i);
  const extractedUrl = urlMatch ? urlMatch[0].replace(/[.,;!?]+$/, '') : '';
  const isShihuo = /shihuo\.cn|shihuo\.hupu\.com|识货/i.test(rawInput);
  const isWegou = /szwego\.com|wsxcme\.com|wegooooo\.com|微购相册|微商相册/i.test(rawInput);
  const wegouMatch = extractedUrl.match(
    /(?:theme_detail|goods_detail|weshop\/goods)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/i
  );
  const idMatch =
    extractedUrl.match(/[?&](?:id|goods_id|style_id|styleId|goodsId)=([A-Za-z0-9_-]{4,})/i) ||
    extractedUrl.match(/\/(?:item|detail|goods|style)\/(\d{4,})(?:\.htm|\.html)?/i) ||
    extractedUrl.match(/\/i(\d{6,})\.htm/i) ||
    rawInput.match(/\b(\d{8,14})\b/);
  const itemId = wegouMatch ? wegouMatch[2] : idMatch ? idMatch[1] : '';
  const shopId = wegouMatch ? wegouMatch[1] : '';
  const quoteMatch = rawInput.match(/「([^」]+)」|【([^】]+)】/);
  const shareTitle = (quoteMatch?.[1] || quoteMatch?.[2] || '').trim();
  return { extractedUrl, itemId, shopId, shareTitle, isShihuo, isWegou };
}

async function fetchTaobaoH5Detail(itemId: string) {
  const result = {
    title: '',
    images: [] as string[],
    priceText: '',
    skuProps: [] as { name: string; values: string[] }[],
    specsText: '',
    ok: false,
  };
  if (!itemId) return result;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);
  try {
    const apiUrl = `https://h5api.m.taobao.com/h5/mtop.taobao.detail.getdetail/6.0/?data=${encodeURIComponent(
      JSON.stringify({ itemNumId: itemId })
    )}`;
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        Referer: `https://detail.m.tmall.com/item.htm?id=${itemId}`,
        Accept: 'application/json, text/plain, */*',
      },
    });
    const text = await response.text();
    const json = JSON.parse(text);
    const data = json?.data;
    if (!data?.item) return result;

    result.title = data.item.title || '';
    if (Array.isArray(data.item.images)) {
      result.images = data.item.images
        .map((img: string) => normalizeImageUrl(img))
        .filter(Boolean)
        .slice(0, 8);
    }

    if (Array.isArray(data.skuBase?.props)) {
      result.skuProps = data.skuBase.props.map((prop: any) => ({
        name: String(prop.name || ''),
        values: Array.isArray(prop.values)
          ? prop.values.map((v: any) => String(v.name || '')).filter(Boolean).slice(0, 12)
          : [],
      }));
    }

    if (Array.isArray(data.props?.groupProps)) {
      const pairs: string[] = [];
      for (const group of data.props.groupProps) {
        for (const obj of Object.values(group || {}) as any[]) {
          if (Array.isArray(obj)) {
            for (const entry of obj) {
              for (const [k, v] of Object.entries(entry || {})) {
                pairs.push(`${k}: ${v}`);
              }
            }
          }
        }
      }
      result.specsText = pairs.slice(0, 18).join('; ');
    }

    if (Array.isArray(data.apiStack) && data.apiStack[0]?.value) {
      try {
        const stackVal = JSON.parse(data.apiStack[0].value);
        result.priceText =
          stackVal?.price?.price?.priceText ||
          stackVal?.price?.transmitPrice?.priceText ||
          stackVal?.price?.extraPrices?.[0]?.priceText ||
          '';
      } catch {
        // Ignore nested parse failure
      }
    }

    result.ok = Boolean(result.title || result.images.length > 0);
  } catch {
    // Graceful fallback if H5 API blocked
  } finally {
    clearTimeout(timer);
  }
  return result;
}

async function fetchTaobaoMetadata(targetUrl: string) {
  const result = {
    finalUrl: targetUrl,
    resolvedItemId: '',
    title: '',
    description: '',
    images: [] as string[],
    priceCnyHints: [] as string[],
    wasBlocked: false,
    rawSnippet: '',
  };

  if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
    return result;
  }

  const isShihuoTarget = /shihuo\.cn|hupu\.com/i.test(targetUrl);
  const isWegouTarget = /szwego\.com|wsxcme\.com|wegooooo\.com/i.test(targetUrl);

  const fetchWithTimeout = async (urlToFetch: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    try {
      const response = await fetch(urlToFetch, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            isShihuoTarget || isWegouTarget
              ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
              : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          ...(isShihuoTarget ? { Referer: 'https://www.shihuo.cn/' } : {}),
          ...(isWegouTarget ? { Referer: 'https://www.szwego.com/' } : {}),
        },
      });
      const text = await response.text();
      return { finalUrl: response.url || urlToFetch, html: text, status: response.status };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let page = await fetchWithTimeout(targetUrl);
    result.finalUrl = page.finalUrl;

    // Follow JS or meta-refresh redirect if present
    const redirectMatch =
      page.html.match(/var\s+url\s*=\s*['"](https?:\/\/[^'"]+)['"]/i) ||
      page.html.match(/window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/i) ||
      page.html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'\s>]+)["']/i);
    if (redirectMatch && isSafeExternalUrl(redirectMatch[1])) {
      try {
        page = await fetchWithTimeout(redirectMatch[1]);
        result.finalUrl = page.finalUrl;
      } catch {
        // Keep initial response if redirect fetch fails
      }
    }

    const resolvedIdMatch =
      result.finalUrl.match(/[?&](?:id|goods_id|style_id|styleId|goodsId)=([A-Za-z0-9_-]{4,})/i) ||
      result.finalUrl.match(/\/(?:item|detail|goods|style)\/(\d{4,})(?:\.htm|\.html)?/i) ||
      targetUrl.match(/(?:theme_detail|goods_detail|weshop\/goods)\/[A-Za-z0-9_-]+\/([A-Za-z0-9_-]+)/i) ||
      page.html.match(/itemId["']?\s*[:=]\s*["']?(\d{8,14})/i);
    result.resolvedItemId = resolvedIdMatch ? resolvedIdMatch[1] : '';

    const html = page.html || '';
    const lowerHtml = html.toLowerCase();
    const isNowShihuo = /shihuo\.cn|hupu\.com/i.test(result.finalUrl) || isShihuoTarget;
    const isNowWegou = /szwego\.com|wsxcme\.com|wegooooo\.com/i.test(result.finalUrl) || isWegouTarget;

    if (
      lowerHtml.includes('punish') ||
      lowerHtml.includes('_____tmd_____') ||
      lowerHtml.includes('rgv587_flag') ||
      lowerHtml.includes('sec.taobao.com') ||
      lowerHtml.includes('login.taobao.com') ||
      result.finalUrl.includes('login.taobao.com') ||
      result.finalUrl.includes('sec.taobao.com')
    ) {
      result.wasBlocked = true;
    }

    // Secondary attempt via world.taobao.com if Taobao main page was blocked and we have an itemId
    let activeHtml = html;
    if (result.wasBlocked && result.resolvedItemId && !isNowShihuo && !isNowWegou) {
      try {
        const worldPage = await fetchWithTimeout(`https://world.taobao.com/item/${result.resolvedItemId}.htm`);
        if (worldPage.html && !worldPage.html.toLowerCase().includes('punish')) {
          activeHtml = worldPage.html;
          result.wasBlocked = false;
        }
      } catch {
        // Keep original
      }
    }

    // For 微购相册 hash-routed links (#/theme_detail/<shopId>/<goodsId>), also try /weshop/goods/<shopId>/<goodsId>
    if (isNowWegou) {
      const wegouHashMatch = targetUrl.match(
        /#\/(?:theme_detail|goods_detail)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/i
      );
      if (wegouHashMatch) {
        try {
          const parsedTarget = new URL(targetUrl);
          const ssrCandidate = `${parsedTarget.origin}/weshop/goods/${wegouHashMatch[1]}/${wegouHashMatch[2]}`;
          if (isSafeExternalUrl(ssrCandidate)) {
            const ssrPage = await fetchWithTimeout(ssrCandidate);
            if (ssrPage.html && ssrPage.html.length > activeHtml.length) {
              activeHtml = ssrPage.html;
            }
          }
        } catch {
          // Keep initial response
        }
      }
    }

    const getMeta = (prop: string) => {
      const m1 = activeHtml.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
      );
      const m2 = activeHtml.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
      );
      return (m1?.[1] || m2?.[1] || '').trim();
    };

    const titleTag = (activeHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim();
    const ogTitle = getMeta('og:title');
    result.title = ogTitle || (titleTag && !/login|登录|验证码|安全验证/i.test(titleTag) ? titleTag : '');
    result.description = getMeta('og:description') || getMeta('description');

    const candidateImgs = new Set<string>();
    const ogImg = normalizeImageUrl(getMeta('og:image'));
    if (ogImg) candidateImgs.add(ogImg);

    // Match Taobao/Tmall alicdn, 识货 (hupucdn), and 微购相册 (szwego/wsxcme/wegooooo/xcimg) images
    const cdnMatches =
      activeHtml.match(
        /(?:https?:)?\/\/(?:img|gw|gd\d+|cbu01\.alicdn\.com|shihuo\.hupucdn\.com|xcimg\.szwego\.com|[^"'\\\s<>)]*\.szwego\.com|[^"'\\\s<>)]*\.wsxcme\.com|[^"'\\\s<>)]*\.wegooooo\.com|[^"'\\\s<>)]*\.hupucdn\.com|[^"'\\\s<>)]*\.hoopchina\.com\.cn|[^"'\\\s<>)]*\.alicdn\.com|[^"'\\\s<>)]*\.geilicdn\.com)\/[^"'\\\s<>)]+\.(?:jpg|jpeg|png|webp)/gi
      ) || [];
    for (const img of cdnMatches.slice(0, 16)) {
      const normalized = normalizeImageUrl(img);
      if (
        normalized &&
        !normalized.includes('favicon') &&
        !normalized.includes('logo') &&
        !normalized.includes('avatar') &&
        !normalized.includes('icon')
      ) {
        candidateImgs.add(normalized);
      }
    }

    // For 识货 & 微购相册 pages, also check JSON image fields/arrays
    if (isNowShihuo || isNowWegou) {
      const jsonPicMatches =
        activeHtml.match(
          /"(?:img|pic|image|logo|cover|img_url|imgSrc|headImg)"\s*:\s*"((?:https?:)?\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
        ) || [];
      for (const m of jsonPicMatches.slice(0, 12)) {
        const urlPart = m.replace(/^"[^"]+"\s*:\s*"/, '').replace(/"$/, '');
        const normalized = normalizeImageUrl(urlPart);
        if (normalized && !normalized.includes('avatar') && !normalized.includes('icon')) {
          candidateImgs.add(normalized);
        }
      }

      const arrayImgMatches = activeHtml.match(/"imgs(?:Src)?"\s*:\s*\[([^\]]+)\]/gi) || [];
      for (const arrBlock of arrayImgMatches.slice(0, 3)) {
        const urlsInArr = arrBlock.match(/https?:\/\/[^"'\s,\]]+\.(?:jpg|jpeg|png|webp)[^"'\s,\]]*/gi) || [];
        for (const u of urlsInArr.slice(0, 8)) {
          const normalized = normalizeImageUrl(u);
          if (normalized && !normalized.includes('avatar') && !normalized.includes('icon')) {
            candidateImgs.add(normalized);
          }
        }
      }
    }

    result.images = Array.from(candidateImgs).slice(0, 8);

    const priceMatches =
      activeHtml.match(
        /(?:[¥￥💰]\s*\d+(?:\.\d{1,2})?|"(?:price|min_price|official_price|lowestPrice|wholesalePrice|pfPrice)"\s*:\s*"?\d+(?:\.\d{1,2})?"?)/gi
      ) || [];
    result.priceCnyHints = Array.from(new Set(priceMatches)).slice(0, 8);

    // Extract embedded state snippet if present for richer AI context
    const stateMatch = activeHtml.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    const plainText = activeHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    result.rawSnippet = (stateMatch ? stateMatch[1].slice(0, 1600) + ' | ' : '') + plainText.slice(0, 1400);
  } catch {
    result.wasBlocked = true;
  }

  return result;
}

// 15. Admin Import Product from Taobao / 识货 (Shihuo) / 微购相册 Link / Share Text / Screenshot
app.post('/api/admin/import-taobao', async (req, res) => {
  const {
    pin,
    taobaoInput,
    imageBase64,
    exchangeRateCnyToUsd = 7.1,
    profitMarginUsd = 5,
  } = req.body || {};

  if (pin !== db.settings.adminPin) {
    return res.status(401).json({ error: 'លេខកូដសម្ងាត់ Admin មិនត្រឹមត្រូវ (Invalid PIN)' });
  }

  const rawInput = typeof taobaoInput === 'string' ? taobaoInput.trim() : '';
  const hasImage = typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/');

  if (!rawInput && !hasImage) {
    return res.status(400).json({ error: 'សូមបញ្ចូលលីង Taobao / 识货 / 微购相册 ឬបង្ហោះរូបភាព Screenshot ផលិតផល' });
  }

  const isMiniProgram = /#小程序:\/\//i.test(rawInput);
  const { extractedUrl, itemId, shareTitle, isShihuo, isWegou } = extractTaobaoInputDetails(rawInput);

  if (isMiniProgram && !extractedUrl && !hasImage) {
    return res.status(400).json({
      error:
        'លីង "#小程序://..." គឺជាលីងបើកក្នុង WeChat (Mini Program) ដែលប្រព័ន្ធខាងក្រៅមិនអាចបើកទាញទិន្នន័យដោយផ្ទាល់បានទេ។ សូមចម្លងជាលីងវេបសាយ (https://...) ឬភ្ជាប់រូបភាព Screenshot ទំនិញជំនួសវិញ!',
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({
      error: 'ម៉ាស៊ីនមេមិនទាន់បានកំណត់ GEMINI_API_KEY សម្រាប់បកប្រែភាសាខ្មែរទេ។ (សូមបន្ថែម GEMINI_API_KEY ក្នុង Vercel Environment Variables)',
    });
  }

  const scraped = extractedUrl
    ? await fetchTaobaoMetadata(extractedUrl)
    : {
        finalUrl: '',
        resolvedItemId: '',
        title: '',
        description: '',
        images: [] as string[],
        priceCnyHints: [] as string[],
        wasBlocked: false,
        rawSnippet: '',
      };

  const finalItemId = itemId || scraped.resolvedItemId;
  const h5Detail =
    finalItemId && !isShihuo && !isWegou && /^\d+$/.test(finalItemId)
      ? await fetchTaobaoH5Detail(finalItemId)
      : {
          title: '',
          images: [] as string[],
          priceText: '',
          skuProps: [] as { name: string; values: string[] }[],
          specsText: '',
          ok: false,
        };

  const combinedTitle = h5Detail.title || scraped.title || shareTitle;
  const combinedImages = Array.from(new Set([...h5Detail.images, ...scraped.images])).slice(0, 8);
  const combinedPriceHints = [h5Detail.priceText ? `¥${h5Detail.priceText}` : '', ...scraped.priceCnyHints].filter(
    Boolean
  );

  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const isQuotaError = (err: any) => {
    const msg = String(err?.message || err || '');
    return (
      err?.status === 429 ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.toLowerCase().includes('quota')
    );
  };

  const generateWithModelFallback = async (makeRequest: (modelName: string) => Promise<any>) => {
    try {
      return await makeRequest('gemini-4-hydrogen');
    } catch (primaryErr: any) {
      if (isQuotaError(primaryErr)) {
        return await makeRequest('gemini-3.1-flash-lite');
      }
      throw primaryErr;
    }
  };

  // Step 1: Grounded URL / Search lookup only when title could not be scraped at all (conserves daily API quota)
  let groundedSummary = '';
  const needsGrounding = Boolean(extractedUrl) && !combinedTitle && !hasImage;

  if (needsGrounding) {
    try {
      const lookupPrompt = [
        isWegou
          ? 'Find real product details for this 微购相册 (Szwego / wsxcme.com / wegooooo.com) album item.'
          : isShihuo
          ? 'Find real product details for this 识货 (Shihuo / shihuo.cn) item.'
          : 'Find real product details for this Taobao/Tmall/1688 item.',
        extractedUrl ? `URL: ${extractedUrl}` : '',
        scraped.finalUrl && scraped.finalUrl !== extractedUrl ? `Resolved URL: ${scraped.finalUrl}` : '',
        finalItemId ? `Item ID: ${finalItemId}` : '',
        rawInput ? `Raw Input: ${rawInput}` : '',
        'Return factual details found: exact product title, brand/model, category, price in CNY (¥), material/specs, available sizes, available colors/colorways, and any real direct product image URL (e.g., img.alicdn.com, shihuo.hupucdn.com, xcimg.szwego.com) if available. Do not invent URLs or prices.',
      ]
        .filter(Boolean)
        .join('\n');

      const groundedRes = await generateWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: lookupPrompt,
          config: {
            tools: [{ urlContext: {} }, { googleSearch: {} }],
          },
        })
      );
      groundedSummary = groundedRes.text || '';
    } catch (groundErr: any) {
      console.warn('Source grounded lookup warning:', groundErr?.message || groundErr);
    }
  }

  // Existing categories in the catalog so AI reuses existing slugs cleanly or creates a fitting new one
  const existingCategoriesMap = new Map<string, string>();
  db.products.forEach((p) => {
    if (p.category && p.categoryKh) {
      existingCategoriesMap.set(p.category, p.categoryKh);
    }
  });
  const existingCategoriesText = Array.from(existingCategoriesMap.entries())
    .map(([slug, kh]) => `"${slug}" (${kh})`)
    .join(', ');

  const rate = Number(exchangeRateCnyToUsd) > 0 ? Number(exchangeRateCnyToUsd) : 7.1;
  const margin = Number(profitMarginUsd) >= 0 ? Number(profitMarginUsd) : 5;
  const preservedHashUrl =
    extractedUrl.includes('#') &&
    scraped.finalUrl &&
    scraped.finalUrl.split('#')[0] === extractedUrl.split('#')[0]
      ? extractedUrl
      : scraped.finalUrl || extractedUrl || '';

  // Step 2: Structured JSON Extraction + Natural Cambodian Khmer E-Commerce Translation
  try {
    const skuSummary =
      h5Detail.skuProps.length > 0
        ? h5Detail.skuProps.map((p) => `${p.name}: ${p.values.join(', ')}`).join(' | ')
        : '(none)';

    const platformLabel = isWegou
      ? '微购相册 (Szwego / Weishang Album)'
      : isShihuo
      ? '识货 (Shihuo)'
      : 'Taobao / Tmall / China Marketplace';

    const systemAndUserPrompt = `You are a Cambodian fashion & lifestyle e-commerce merchandising assistant for "MSPN ONLINE STORE" (Pre-order from China).
Analyze ALL provided product signals (Taobao / Tmall / 识货 Shihuo / 微购相册 Szwego link or share text, H5 API SKU/specs, scraped HTML metadata, grounded web lookup, and optional product screenshot) and output structured JSON for the store's product form.

Input signals:
- Platform detected: ${platformLabel}
- Raw user input: ${rawInput || '(none)'}
- Extracted URL: ${extractedUrl || '(none)'}
- Final resolved URL: ${scraped.finalUrl || '(none)'}
- Item ID: ${finalItemId || '(none)'}
- Share title snippet: ${shareTitle || '(none)'}
- H5 API title: ${h5Detail.title || '(none)'}
- H5 SKU options (sizes & colors): ${skuSummary}
- H5 Product specifications/material: ${h5Detail.specsText || '(none)'}
- Direct scrape blocked by anti-bot: ${scraped.wasBlocked && !h5Detail.ok ? 'YES' : 'NO'}
- Scraped title: ${scraped.title || '(none)'}
- Scraped description: ${scraped.description || '(none)'}
- Price hints (CNY): ${combinedPriceHints.join(', ') || '(none)'}
- Product image URLs: ${combinedImages.join(', ') || '(none)'}
- Scraped page text snippet: ${scraped.rawSnippet || '(none)'}
- Grounded search/URL context notes: ${groundedSummary || '(none)'}

Existing store categories: ${existingCategoriesText || '"clothing" (ខោអាវ), "shoes" (ស្បែកជើង), "belts" (ខ្សែក្រវ៉ាត់), "watch" (នាឡិកា), "accessories" (គ្រឿងតុបតែង)'}

Rules:
1. "nameKh": Translate/adapt the product title into catchy, natural Cambodian e-commerce Khmer (concise & accurate).
2. "nameEn": Clean, accurate English product name & colorway/model translated from the source product.
3. "descriptionKh": Write a clear, persuasive product description in natural Khmer (2-4 sentences) describing style, fabric/material, fit, usage, and Pre-Order 7-14 days from China.
4. "category": Choose an appropriate lowercase English slug. Reuse an existing store category slug when the product belongs there ("clothing", "shoes", "belts", "watch", "accessories"), OR create a clean new category slug if the product is a distinct type (e.g. "bags", "eyewear", "hats", "sports", "electronics", "beauty", "perfume").
5. "categoryKh": Matching natural Khmer category name for "category" (e.g. "ខោអាវ", "ស្បែកជើង", "ខ្សែក្រវ៉ាត់", "នាឡិកា", "គ្រឿងតុបតែង", or for new types: "កាបូប", "វ៉ែនតា", "មួក", "សម្ភារៈកីឡា", "គ្រឿងអេឡិចត្រូនិក", "គ្រឿងសម្អាង", "ទឹកអប់").
6. "priceCny": Extract the CNY (¥) price as a number if found in the input, H5 API, scrape, grounded notes, or screenshot; otherwise 0.
7. "priceUsd": If priceCny > 0, calculate ((priceCny / ${rate}) + ${margin}) rounded to nearest 0.50 (minimum 5). If priceCny == 0, estimate a sensible USD price or 0 if completely unknown.
8. "originalPriceUsd": Roughly 1.25x priceUsd rounded to nearest integer (or 0 if priceUsd == 0).
9. "image": Choose the best REAL product image URL from Product image URLs or Grounded notes (must be a real http/https URL, e.g. img.alicdn.com, shihuo.hupucdn.com, xcimg.szwego.com). NEVER fabricate or guess an image URL — return "" if no real image URL was retrieved.
10. "badge": Short Khmer merchandising badge like "ម៉ូដថ្មី", "ពេញនិយម", or "Pre-Order".
11. "sizes": Extract real sizes from H5 SKU / scraped data / Shihuo size table if available, otherwise realistic sizes for the product (e.g. ["M", "L", "XL", "2XL"] for clothing, ["39", "40", "41", "42", "43"] for shoes, ["Free Size"] for bags/belts/watch/accessories).
12. "colors": Extract real colors/colorways from H5 SKU / scraped data / Shihuo / screenshot if available (translated clearly e.g. "ខ្មៅ (Black)", "ស (White)", "ខៀវ (Navy)"), as 1-5 objects { "name": string, "hex": string }.
13. "statusMessageKh": One concise Khmer sentence summarizing what was auto-filled (mention if Taobao/识货 blocked automatic image/price access and suggest uploading a screenshot or verifying the image/price).`;

    const parts: any[] = [{ text: systemAndUserPrompt }];
    if (hasImage) {
      const imgMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (imgMatch) {
        parts.push({
          inlineData: {
            mimeType: imgMatch[1],
            data: imgMatch[2],
          },
        });
      }
    }

    const structuredRes = await generateWithModelFallback((model) =>
      ai.models.generateContent({
        model,
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nameKh: { type: Type.STRING },
              nameEn: { type: Type.STRING },
              descriptionKh: { type: Type.STRING },
              category: { type: Type.STRING },
              categoryKh: { type: Type.STRING },
              priceCny: { type: Type.NUMBER },
              priceUsd: { type: Type.NUMBER },
              originalPriceUsd: { type: Type.NUMBER },
              image: { type: Type.STRING },
              badge: { type: Type.STRING },
              sizes: { type: Type.ARRAY, items: { type: Type.STRING } },
              colors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                  },
                  required: ['name', 'hex'],
                },
              },
              statusMessageKh: { type: Type.STRING },
            },
            required: [
              'nameKh',
              'nameEn',
              'descriptionKh',
              'category',
              'categoryKh',
              'priceCny',
              'priceUsd',
              'image',
              'sizes',
              'colors',
              'statusMessageKh',
            ],
          },
        },
      })
    );

    const parsed = JSON.parse(structuredRes.text || '{}');
    const rawCatSlug = String(parsed.category || 'clothing')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const category = rawCatSlug || 'clothing';

    const defaultCatKhMap: Record<string, string> = {
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
    const categoryKh =
      existingCategoriesMap.get(category) ||
      (typeof parsed.categoryKh === 'string' && parsed.categoryKh.trim()) ||
      defaultCatKhMap[category] ||
      'ទំនិញផ្សេងៗ';

    const normalizedImg = normalizeImageUrl(parsed.image || combinedImages[0] || '');
    const galleryImages = Array.from(new Set([normalizedImg, ...combinedImages].filter(Boolean))).slice(0, 8);

    const cleanedColors =
      Array.isArray(parsed.colors) && parsed.colors.length > 0
        ? parsed.colors
            .map((c: any, idx: number) => ({
              name: String(c?.name || '').trim(),
              hex: String(c?.hex || '#111111').trim() || '#111111',
              ...(galleryImages[idx] ? { image: galleryImages[idx] } : {}),
            }))
            .filter((c: any) => Boolean(c.name))
        : [{ name: 'ខ្មៅ (Black)', hex: '#111111', ...(galleryImages[0] ? { image: galleryImages[0] } : {}) }];

    const priceCny = Number(parsed.priceCny) || 0;
    const computedPriceUsd =
      priceCny > 0
        ? Math.max(1, Math.round((priceCny / rate + margin) * 2) / 2)
        : Number(parsed.priceUsd) || 0;
    const originalPriceUsd =
      Number(parsed.originalPriceUsd) > computedPriceUsd
        ? Number(parsed.originalPriceUsd)
        : computedPriceUsd > 0
        ? Math.round(computedPriceUsd * 1.25)
        : 0;

    res.json({
      success: true,
      product: {
        nameKh: parsed.nameKh || '',
        nameEn: parsed.nameEn || '',
        descriptionKh: parsed.descriptionKh || '',
        category,
        categoryKh,
        priceUsd: computedPriceUsd,
        originalPriceUsd: originalPriceUsd || undefined,
        image: normalizedImg,
        images: galleryImages,
        sourceUrl: preservedHashUrl,
        badge: parsed.badge || 'ម៉ូដថ្មី',
        sizes: Array.isArray(parsed.sizes) && parsed.sizes.length > 0 ? parsed.sizes : ['M', 'L', 'XL'],
        colors: cleanedColors,
      },
      meta: {
        priceCny,
        extractedUrl,
        sourceUrl: preservedHashUrl,
        platform: isWegou ? 'wegou' : isShihuo ? 'shihuo' : 'taobao',
        itemId: finalItemId,
        wasBlockedByTaobao: scraped.wasBlocked && !h5Detail.ok && !normalizedImg && !hasImage,
        hasRealImage: Boolean(normalizedImg),
        statusMessageKh: parsed.statusMessageKh || 'បានបកប្រែ និងបំពេញទិន្នន័យរួចរាល់!',
      },
    });
  } catch (err: any) {
    console.error('Source link import error:', err);

    if (isQuotaError(err)) {
      const cnyMatch = (combinedPriceHints[0] || rawInput).match(/[¥￥💰]\s*(\d+(?:\.\d{1,2})?)/);
      const fallbackPriceCny = cnyMatch ? parseFloat(cnyMatch[1]) : 0;
      const fallbackPriceUsd =
        fallbackPriceCny > 0 ? Math.max(1, Math.round((fallbackPriceCny / rate + margin) * 2) / 2) : 0;

      if (combinedTitle || combinedImages.length > 0 || fallbackPriceCny > 0) {
        return res.json({
          success: true,
          product: {
            nameKh: combinedTitle || '',
            nameEn: combinedTitle || '',
            descriptionKh: 'ទំនិញ Pre-Order គុណភាពល្អ នាំចូលផ្ទាល់ពីប្រទេសចិន រង់ចាំ ៧-១៤ ថ្ងៃ។',
            category: 'clothing',
            categoryKh: 'ខោអាវ',
            priceUsd: fallbackPriceUsd,
            image: combinedImages[0] || '',
            images: combinedImages,
            sourceUrl: preservedHashUrl,
            badge: 'ម៉ូដថ្មី',
            sizes: ['M', 'L', 'XL'],
            colors: [
              {
                name: 'ខ្មៅ (Black)',
                hex: '#111111',
                ...(combinedImages[0] ? { image: combinedImages[0] } : {}),
              },
            ],
          },
          meta: {
            priceCny: fallbackPriceCny,
            extractedUrl,
            sourceUrl: preservedHashUrl,
            platform: isWegou ? 'wegou' : isShihuo ? 'shihuo' : 'taobao',
            itemId: finalItemId,
            wasBlockedByTaobao: combinedImages.length === 0,
            hasRealImage: combinedImages.length > 0,
            statusMessageKh:
              'កូតា AI បកប្រែប្រចាំថ្ងៃបានអស់ (Free Tier 20 ដង/ថ្ងៃ) ប៉ុន្តែប្រព័ន្ធបានទាញរូបភាព និងទិន្នន័យពីលីងជូន — សូមកែឈ្មោះជាភាសាខ្មែរខាងក្រោម!',
          },
        });
      }

      return res.status(429).json({
        error:
          'កូតា AI បកប្រែស្វ័យប្រវត្តិប្រចាំថ្ងៃបានអស់ហើយ (Free Tier កំណត់ 20 ដង/ថ្ងៃ)។ អ្នកនៅតែអាចបំពេញឈ្មោះ តម្លៃ រូបភាព និងលីងទំនិញដោយផ្ទាល់ខាងក្រោម ហើយរក្សាទុកបានធម្មតា!',
      });
    }

    res.status(500).json({
      error:
        'មិនអាចទាញទិន្នន័យពីលីងនេះបានទេ សូមពិនិត្យលីងម្ដងទៀត ឬបំពេញព័ត៌មាន និងបង្ហោះរូបភាពទំនិញដោយផ្ទាល់ខាងក្រោម។',
    });
  }
});

export default app;
