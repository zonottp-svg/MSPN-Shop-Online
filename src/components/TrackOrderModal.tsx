import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Phone,
  Send,
  AlertCircle,
  Calendar,
  Building2,
  Check,
  Copy,
} from 'lucide-react';
import { Order } from '../types/store';
import { STORE_INFO, formatUsd, formatKhr } from '../data/products';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performTrack(initialQuery);
    }
  }, [initialQuery, isOpen]);

  const performTrack = async (searchTarget: string) => {
    const q = searchTarget.trim();
    if (!q) {
      setErrorMsg('សូមបញ្ចូលលេខទូរសព្ទ ឬលេខកូដបញ្ជាទិញ');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'មិនអាចស្វែងរកបានទេ');
      }

      setOrders(data.orders || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performTrack(query);
  };

  const handleCopy = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  if (!isOpen) return null;

  // Timeline steps definition
  const getStepIndex = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'pending':
        return 0; // Order placed, awaiting slip review
      case 'verified':
        return 1; // Payment verified
      case 'china_transit':
        return 2; // Departed China warehouse
      case 'arrived_phnom_penh':
        return 3; // Arrived in Phnom Penh
      case 'delivered':
        return 4; // Delivered
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const trackingSteps = [
    { title: 'បានកុម្ម៉ង់ទំនិញ', desc: 'ប្រព័ន្ធបានកត់ត្រាការបញ្ជាទិញ' },
    { title: 'ផ្ទៀងផ្ទាត់ការទូទាត់', desc: 'បានពិនិត្យ Slip ABA និងកក់ទំនិញរួច' },
    { title: 'កំពុងដឹកពីចិន', desc: 'ទំនិញចេញពីឃ្លាំងចិន (រង់ចាំ ៧-១៤ ថ្ងៃ)' },
    { title: 'មកដល់ភ្នំពេញ', desc: 'រៀបចំវេចខ្ចប់ផ្ញើជូនតាមខេត្ត' },
    { title: 'បានប្រគល់ជូន', desc: 'ទំនិញបានដឹកជូនដល់ដៃអតិថិជន' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">តាមដានស្ថានភាពទំនិញ Pre-Order</h3>
              <p className="text-[11px] text-neutral-400">Track Order Shipment from China</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
            aria-label="បិទ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Search Box */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-800">
              បញ្ចូលលេខទូរសព្ទរបស់អ្នក ឬលេខកូដបញ្ជាទិញ (Order ID)៖
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ឧ. 0961234567 ឬ MSPN-123456"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-neutral-900 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
              >
                {isLoading ? (
                  <span>កំពុងស្វែងរក...</span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>ស្វែងរក</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              💡 គន្លឹះ៖ គ្រាន់តែវាយលេខទូរសព្ទដែលអ្នកបានកុម្ម៉ង់ នោះប្រព័ន្ធនឹងបង្ហាញរាល់ទំនិញរបស់អ្នកភ្លាមៗ។
            </p>
          </form>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Search Results */}
          {hasSearched && !isLoading && orders.length === 0 && (
            <div className="py-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200 p-6">
              <Package className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
              <p className="font-bold text-neutral-800 text-sm">រកមិនឃើញការបញ្ជាទិញទេ</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                សូមពិនិត្យមើលលេខទូរសព្ទ ឬលេខកូដបញ្ជាទិញម្តងទៀត ឬទាក់ទងមកកាន់ Telegram របស់ហាងដើម្បីសាកសួរផ្ទាល់។
              </p>
              <a
                href={STORE_INFO.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-50 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-100 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ឆាតសួរ Telegram @{STORE_INFO.telegramHandle}</span>
              </a>
            </div>
          )}

          {orders.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-neutral-500 pb-1 border-b">
                <span>រកឃើញការបញ្ជាទិញចំនួន <strong>{orders.length}</strong></span>
                <span>ចុចលើកូដដើម្បីចម្លង</span>
              </div>

              {orders.map((order) => {
                const currentStepIdx = getStepIndex(order.paymentStatus);
                const isCancelled = order.paymentStatus === 'cancelled';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
                  >
                    {/* Order Bar */}
                    <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900 bg-white border px-2.5 py-1 rounded-lg">
                          #{order.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.id)}
                          className="text-neutral-400 hover:text-neutral-700 text-xs p-1"
                          title="ចម្លងកូដ"
                        >
                          {copiedOrderId === order.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-xs text-neutral-400">
                          កុម្ម៉ង់នៅ៖ {new Date(order.createdAt).toLocaleDateString('km-KH')}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isCancelled
                            ? 'bg-red-100 text-red-800'
                            : order.paymentStatus === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'china_transit'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isCancelled && '❌ បានបោះបង់'}
                        {order.paymentStatus === 'pending' && '⏳ រង់ចាំពិនិត្យ Slip'}
                        {order.paymentStatus === 'verified' && '✅ បានផ្ទៀងផ្ទាត់ការទូទាត់'}
                        {order.paymentStatus === 'china_transit' && '✈️ កំពុងដឹកពីចិន'}
                        {order.paymentStatus === 'arrived_phnom_penh' && '📦 មកដល់ភ្នំពេញ'}
                        {order.paymentStatus === 'delivered' && '🎉 បានដឹកជូនជោគជ័យ'}
                      </span>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Interactive Visual Progress Stepper */}
                      {!isCancelled ? (
                        <div>
                          <div className="relative flex justify-between items-center mb-6">
                            {/* Connecting line */}
                            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-neutral-200 z-0">
                              <div
                                className="h-full bg-rose-600 transition-all duration-500"
                                style={{
                                  width: `${(Math.max(0, currentStepIdx) / (trackingSteps.length - 1)) * 100}%`,
                                }}
                              />
                            </div>

                            {/* Steps circles */}
                            {trackingSteps.map((step, idx) => {
                              const isCompleted = idx <= currentStepIdx;
                              const isCurrent = idx === currentStepIdx;

                              return (
                                <div key={idx} className="relative z-10 flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                      isCompleted
                                        ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                                        : 'bg-white text-neutral-400 border-2 border-neutral-300'
                                    }`}
                                  >
                                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                  </div>
                                  <span
                                    className={`text-[10px] sm:text-[11px] font-semibold mt-1.5 text-center max-w-[70px] sm:max-w-[85px] leading-tight ${
                                      isCurrent
                                        ? 'text-rose-600 font-bold'
                                        : isCompleted
                                        ? 'text-neutral-800'
                                        : 'text-neutral-400'
                                    }`}
                                  >
                                    {step.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Current Status Highlight Card */}
                          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start gap-3 text-xs">
                            <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-neutral-900">
                                {trackingSteps[currentStepIdx]?.title}
                              </p>
                              <p className="text-neutral-600 text-[11px]">
                                {trackingSteps[currentStepIdx]?.desc}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">
                          ការបញ្ជាទិញនេះត្រូវបានបោះបង់។ ប្រសិនបើមានចម្ងល់ សូមទាក់ទងមកកាន់ហាង។
                        </div>
                      )}

                      {/* Shipment Tracking Details (if entered by Admin) */}
                      {(order.carrierName || order.trackingNumber || order.estimatedArrival || order.trackingNote) && (
                        <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2 text-xs">
                          <p className="font-bold text-sky-900 flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-sky-600" />
                            <span>ព័ត៌មានដឹកជញ្ជូនជាក់ស្តែង៖</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {order.carrierName && (
                              <div>
                                <span className="text-neutral-500">សេវាដឹកជញ្ជូន៖ </span>
                                <strong className="text-neutral-800">{order.carrierName}</strong>
                              </div>
                            )}
                            {order.trackingNumber && (
                              <div>
                                <span className="text-neutral-500">លេខកូដកញ្ចប់ (Tracking #)៖ </span>
                                <strong className="font-mono text-neutral-800">{order.trackingNumber}</strong>
                              </div>
                            )}
                            {order.estimatedArrival && (
                              <div>
                                <span className="text-neutral-500">កាលបរិច្ឆេទរំពឹងទុក៖ </span>
                                <strong className="text-rose-600">{order.estimatedArrival}</strong>
                              </div>
                            )}
                          </div>
                          {order.trackingNote && (
                            <p className="text-[11px] text-sky-800 bg-white/70 p-2 rounded-lg border border-sky-100 mt-1">
                              📝 ចំណាំពីហាង៖ {order.trackingNote}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Items & Shipping summary */}
                      <div className="pt-2 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-semibold text-neutral-800 mb-1.5">ទំនិញដែលបានកុម្ម៉ង់ ({order.items.length})៖</p>
                          <div className="space-y-1 text-neutral-600 text-[11px]">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>{it.productNameKh} ({it.selectedSize}) x{it.quantity}</span>
                                <span className="font-mono font-bold">${it.totalPriceUsd.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 flex justify-between font-bold text-neutral-900 text-xs">
                            <span>ទឹកប្រាក់សរុប៖</span>
                            <span className="text-rose-600">{formatUsd(order.totalUsd)} ({formatKhr(order.totalUsd)})</span>
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold text-neutral-800 mb-1.5">ព័ត៌មានអ្នកទទួល៖</p>
                          <p className="text-neutral-700 font-bold">{order.customerName}</p>
                          <p className="text-neutral-500 text-[11px]">ទូរសព្ទ៖ {order.customerPhone}</p>
                          <p className="text-neutral-500 text-[11px]">ទីតាំង៖ {order.customerAddress}</p>
                        </div>
                      </div>

                      {/* Quick Telegram / Phone Support */}
                      <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-neutral-400 text-[11px]">ត្រូវការសួរនាំបន្ថែម?</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`${STORE_INFO.telegramUrl}?text=${encodeURIComponent(
                              `សួស្តី MSPN ONLINE STORE! ខ្ញុំចង់សួរនាំពីការកុម្ម៉ង់កូដ #${order.id} របស់ខ្ញុំ៖`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg font-semibold text-[11px] transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>ឆាត Telegram</span>
                          </a>
                          <a
                            href={`tel:${STORE_INFO.phone1Raw}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg font-semibold text-[11px] transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>ខលសួរ</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
