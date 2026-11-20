import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Send,
  CreditCard,
  ArrowRight,
  Clock,
  Package,
  Truck,
  Check,
  CheckCircle2,
  Copy,
  RefreshCw,
  History,
  AlertCircle,
  Plane,
  Ban,
} from 'lucide-react';
import { CartItem } from '../types/cart';
import { Order } from '../types/store';
import { formatUsd, formatKhr, STORE_INFO } from '../data/products';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  recentOrders?: Order[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onOpenAbaPay: (totalUsd: number, description: string) => void;
  onOpenCheckout: () => void;
  onTrackOrder?: (orderId: string) => void;
  onRemoveOrderHistory?: (orderId: string) => void;
  onClearOrderHistory?: () => void;
  onRefreshOrderHistory?: () => Promise<void>;
  initialTab?: 'cart' | 'history';
}

const ORDER_STATUS_CONFIG: Record<
  Order['paymentStatus'],
  { labelKh: string; labelEn: string; pillClass: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    labelKh: 'រង់ចាំផ្ទៀងផ្ទាត់',
    labelEn: 'Pending',
    pillClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    Icon: Clock,
  },
  verified: {
    labelKh: 'បានផ្ទៀងផ្ទាត់',
    labelEn: 'Verified',
    pillClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Icon: CheckCircle2,
  },
  china_transit: {
    labelKh: 'កំពុងដឹកពីចិន',
    labelEn: 'In Transit',
    pillClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    Icon: Plane,
  },
  arrived_phnom_penh: {
    labelKh: 'មកដល់ភ្នំពេញ',
    labelEn: 'Arrived PP',
    pillClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    Icon: Package,
  },
  delivered: {
    labelKh: 'បានដឹកជូន',
    labelEn: 'Delivered',
    pillClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    Icon: Check,
  },
  cancelled: {
    labelKh: 'បានបោះបង់',
    labelEn: 'Cancelled',
    pillClass: 'bg-red-50 text-red-700 border border-red-200',
    Icon: Ban,
  },
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  recentOrders = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenAbaPay,
  onOpenCheckout,
  onTrackOrder,
  onRemoveOrderHistory,
  onClearOrderHistory,
  onRefreshOrderHistory,
  initialTab = 'cart',
}) => {
  const [activeTab, setActiveTab] = useState<'cart' | 'history'>(initialTab);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const totalUsd = items.reduce((sum, item) => sum + item.product.priceUsd * item.quantity, 0);
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const generateTelegramMessage = () => {
    let msg = `សួស្តី ${STORE_INFO.name}! ខ្ញុំចង់កុម្ម៉ង់ទំនិញ Pre-order ពីប្រទេសចិន៖\n`;
    msg += `═══════════════════════\n`;
    items.forEach((item, index) => {
      msg += `${index + 1}. ${item.product.nameKh}\n`;
      msg += `   • កូដ៖ ${item.product.code}\n`;
      msg += `   • ទំហំ៖ ${item.selectedSize}\n`;
      msg += `   • ពណ៌៖ ${item.selectedColor.name}\n`;
      msg += `   • ចំនួន៖ ${item.quantity} x ${formatUsd(item.product.priceUsd)}\n`;
      msg += `   • សរុប៖ ${formatUsd(item.product.priceUsd * item.quantity)}\n`;
      if (item.product.sourceUrl) {
        msg += `   • លីងទំនិញ៖ ${item.product.sourceUrl}\n`;
      }
      msg += `\n`;
    });
    msg += `═══════════════════════\n`;
    msg += `💰 ទឹកប្រាក់សរុប៖ ${formatUsd(totalUsd)} (${formatKhr(totalUsd)})\n`;
    msg += `\nតើខ្ញុំអាចផ្ញើ Slip ទូទាត់តាម ABA Bank (${STORE_INFO.ownerName}) មកកាន់អ្នកឥឡូវនេះបានទេ?`;
    return encodeURIComponent(msg);
  };

  const handlePayViaAba = () => {
    const desc = `កុម្ម៉ង់ទំនិញ ${totalItemCount} មុខ (${items.map((i) => i.product.code).join(', ')})`;
    onOpenAbaPay(totalUsd, desc);
  };

  const handleCopy = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleRefresh = async () => {
    if (!onRefreshOrderHistory || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshOrderHistory();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatOrderDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('km-KH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Segmented Tabs */}
        <div className="border-b border-neutral-200 bg-neutral-50/80">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-rose-600" />
              <h2 className="font-bold text-neutral-900 text-base">កន្ត្រក & ប្រវត្តិទិញ</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 flex items-center justify-center transition"
              aria-label="បិទ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Segmented Switcher */}
          <div className="px-4 pb-3">
            <div className="flex items-center p-1 bg-neutral-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('cart')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'cart'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>កន្ត្រកទំនិញ</span>
                {totalItemCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums">
                    {totalItemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>ប្រវត្តិបញ្ជាទិញ</span>
                {recentOrders.length > 0 && (
                  <span className="bg-neutral-800 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums">
                    {recentOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: CART ITEMS */}
        {activeTab === 'cart' && (
          <>
            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-8 h-8 text-neutral-400 stroke-1" />
                  </div>
                  <p className="font-semibold text-neutral-800 text-base mb-1">
                    មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ
                  </p>
                  <p className="text-xs text-neutral-400 max-w-xs mb-5">
                    សូមជ្រើសរើសខោអាវ ស្បែកជើង ខ្សែក្រវ៉ាត់ ឬនាឡិកាដែលអ្នកពេញចិត្ត ដើម្បីកុម្ម៉ង់ Pre-order។
                  </p>

                  <div className="space-y-2 w-full max-w-xs">
                    <button
                      onClick={onClose}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition"
                    >
                      <span>មើលទំនិញទាំងអស់</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {recentOrders.length > 0 && (
                      <button
                        onClick={() => setActiveTab('history')}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-100 text-neutral-800 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition"
                      >
                        <History className="w-3.5 h-3.5 text-neutral-600" />
                        <span>មើលប្រវត្តិបញ្ជាទិញ ({recentOrders.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Itemized list */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex gap-3 items-start"
                      >
                        <img
                          src={item.selectedColor.image || item.product.image}
                          alt={item.product.nameKh}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-lg object-cover shrink-0 bg-neutral-200 border border-neutral-200"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-semibold text-neutral-900 line-clamp-1">
                              {item.product.nameKh}
                            </h4>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="text-neutral-400 hover:text-red-500 p-0.5 transition"
                              title="លុបចេញ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Variants */}
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                            <span>
                              ទំហំ៖ <strong className="text-neutral-800">{item.selectedSize}</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              ពណ៌៖ <strong className="text-neutral-800">{item.selectedColor.name}</strong>
                            </span>
                          </div>

                          {/* Price & Quantity Controls */}
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-200/60">
                            <div className="text-xs font-bold text-neutral-900 tabular-nums">
                              {formatUsd(item.product.priceUsd * item.quantity)}
                            </div>

                            <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold tabular-nums text-neutral-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pre-order Delivery Notice */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                    <p className="font-semibold">📦 កាលវិភាគ Pre-Order ពីចិន៖</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      ទំនិញនឹងមកដល់ភ្នំពេញក្នុងរយៈពេល ៧-១៤ ថ្ងៃ។ អ្នកអាចជ្រើសរើសកក់ប្រាក់ ៥០% ឬទូទាត់ពេញតាម ABA Bank។
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            {items.length > 0 && (
              <div className="p-5 border-t border-neutral-200 bg-neutral-50/80 space-y-3">
                {/* Subtotal calculation */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-neutral-500">
                    <span>តម្លៃទំនិញសរុប</span>
                    <span className="font-mono">{formatUsd(totalUsd)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-neutral-200/60">
                    <span className="font-bold text-neutral-900 text-sm">ទឹកប្រាក់សរុប (Total)</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-rose-600 tabular-nums">
                        {formatUsd(totalUsd)}
                      </span>
                      <span className="text-xs text-neutral-500 ml-1.5 tabular-nums">
                        ≈ {formatKhr(totalUsd)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2">
                  {/* PRIMARY: In-website checkout with Telegram bot notification */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCheckout();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-[0.99]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>បញ្ជាទិញលើវេបសាយ (ភ្ជាប់ Telegram Bot)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Secondary Telegram Checkout */}
                    <a
                      href={`${STORE_INFO.telegramUrl}?text=${generateTelegramMessage()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="truncate">ឆាត Telegram</span>
                    </a>

                    {/* ABA KHQR Trigger */}
                    <button
                      type="button"
                      onClick={handlePayViaAba}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#003756] hover:bg-[#002b44] text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="truncate">ស្កេន ABA QR</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: LOCAL USER ORDER HISTORY */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Info Strip */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-200">
                <span className="font-semibold text-neutral-700">
                  ប្រវត្តិការកុម្ម៉ង់របស់អ្នក ({recentOrders.length})
                </span>
                <div className="flex items-center gap-2">
                  {onRefreshOrderHistory && recentOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-600 hover:text-neutral-900 transition disabled:opacity-50"
                      title="ទាញយកបច្ចុប្បន្នភាពស្ថានភាព"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
                      <span>{isRefreshing ? 'កំពុងផ្ទុក...' : 'Refresh'}</span>
                    </button>
                  )}
                  {recentOrders.length > 0 && onClearOrderHistory && (
                    showClearConfirm ? (
                      <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                        <span className="text-[10px] text-red-700 font-bold">លុបទាំងអស់?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onClearOrderHistory();
                            setShowClearConfirm(false);
                          }}
                          className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.2 rounded hover:bg-red-700"
                        >
                          បាទ/ចាស
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="text-[10px] text-neutral-600 hover:text-neutral-900"
                        >
                          ទេ
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(true)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-semibold transition"
                      >
                        សម្អាតទាំងអស់
                      </button>
                    )
                  )}
                </div>
              </div>

              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                    <History className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-800 text-sm">
                      មិនទាន់មានប្រវត្តិបញ្ជាទិញក្នុងឧបករណ៍នេះទេ
                    </p>
                    <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      រាល់ពេលដែលអ្នកបញ្ជាទិញលើវេបសាយ ព័ត៌មាននៃការកុម្ម៉ង់នឹងត្រូវរក្សាទុកនៅត្រង់នេះដោយស្វ័យប្រវត្តិ។
                    </p>
                  </div>

                  <div className="pt-2">
                    {onTrackOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onTrackOrder('');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded-xl text-xs transition"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>ស្វែងរកតាមលេខទូរសព្ទ (Track Order)</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const statusCfg =
                      ORDER_STATUS_CONFIG[order.paymentStatus] || ORDER_STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.Icon;

                    return (
                      <div
                        key={order.id}
                        className="bg-neutral-50 rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs hover:border-neutral-300 transition-colors"
                      >
                        {/* Order Card Header */}
                        <div className="p-3.5 bg-white border-b border-neutral-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md">
                              #{order.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(order.id)}
                              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded"
                              title="ចម្លងលេខកូដ"
                            >
                              {copiedOrderId === order.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Color-Coded Status Pill Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${statusCfg.pillClass}`}
                          >
                            <StatusIcon className="w-3 h-3 shrink-0" />
                            <span>{statusCfg.labelKh}</span>
                            <span className="opacity-70 font-semibold text-[10px]">
                              ({statusCfg.labelEn})
                            </span>
                          </span>
                        </div>

                        {/* Order Content */}
                        <div className="p-3.5 space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>កាលបរិច្ឆេទ៖ {formatOrderDate(order.createdAt)}</span>
                            <span>{order.paymentMethod === 'deposit_aba' ? 'កក់ 50% ABA' : 'ABA KHQR'}</span>
                          </div>

                          {/* Ordered Items summary */}
                          <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-neutral-200/70 text-xs">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-baseline gap-2 text-neutral-700">
                                <span className="line-clamp-1">
                                  {it.productNameKh} <span className="text-neutral-400 font-mono text-[11px]">({it.selectedSize}) x{it.quantity}</span>
                                </span>
                                <span className="font-mono font-bold shrink-0 text-neutral-900">
                                  ${it.totalPriceUsd.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-neutral-100 flex justify-between items-baseline font-bold">
                              <span className="text-neutral-600 text-xs">សរុប៖</span>
                              <div className="text-right">
                                <span className="text-rose-600 text-sm">{formatUsd(order.totalUsd)}</span>
                                <span className="text-neutral-500 text-[11px] ml-1">≈ {formatKhr(order.totalUsd)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Tracking Details if updated by Admin */}
                          {(order.carrierName || order.trackingNumber || order.estimatedArrival) && (
                            <div className="p-2.5 bg-sky-50/80 rounded-xl border border-sky-200 text-xs text-sky-900 space-y-1">
                              <p className="font-bold flex items-center gap-1 text-[11px]">
                                <Truck className="w-3.5 h-3.5 text-sky-600" />
                                <span>ព័ត៌មានដឹកជញ្ជូនជាក់ស្តែង៖</span>
                              </p>
                              {order.carrierName && (
                                <p className="text-[11px] text-sky-800">
                                  ក្រុមហ៊ុនដឹក៖ <strong>{order.carrierName}</strong>
                                </p>
                              )}
                              {order.trackingNumber && (
                                <p className="text-[11px] text-sky-800 font-mono">
                                  Tracking #: <strong>{order.trackingNumber}</strong>
                                </p>
                              )}
                              {order.estimatedArrival && (
                                <p className="text-[11px] text-rose-600 font-semibold">
                                  រំពឹងមកដល់៖ {order.estimatedArrival}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              {onTrackOrder && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onTrackOrder(order.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>តាមដានទំនិញ</span>
                                </button>
                              )}

                              <a
                                href={`${STORE_INFO.telegramUrl}?text=${encodeURIComponent(
                                  `សួស្តី ${STORE_INFO.name}! ខ្ញុំចង់សួរនាំពីការកុម្ម៉ង់កូដ #${order.id} របស់ខ្ញុំ៖`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition"
                              >
                                <Send className="w-3 h-3" />
                                <span>Telegram</span>
                              </a>
                            </div>

                            {onRemoveOrderHistory && (
                              <button
                                type="button"
                                onClick={() => onRemoveOrderHistory(order.id)}
                                className="text-neutral-400 hover:text-red-500 p-1.5 rounded transition"
                                title="លុបចេញពីប្រវត្តិឧបករណ៍នេះ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom device storage note */}
            <div className="pt-4 mt-6 border-t border-neutral-200 text-center">
              <p className="text-[11px] text-neutral-400">
                🔒 ប្រវត្តិនេះត្រូវបានរក្សាទុកក្នុង Browser Storage នៃឧបករណ៍របស់អ្នកដោយសុវត្ថិភាព។
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
