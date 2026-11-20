import React, { useState } from 'react';
import { X, CheckCircle2, Upload, AlertCircle, ShoppingBag, ArrowLeft, ArrowRight, Send, CreditCard, ShieldCheck, Truck, Copy, Check } from 'lucide-react';
import { CartItem } from '../types/cart';
import { Order } from '../types/store';
import { STORE_INFO, formatUsd, formatKhr } from '../data/products';
import { AbaKhqrCard } from './AbaKhqrCard';
import { auth } from '../lib/firebase';
import { saveOrderInFirestore } from '../lib/storeFirestore';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: (order: Order) => void;
  onTrackOrder?: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
  onTrackOrder,
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');

  // Customer form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [telegram, setTelegram] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'aba_khqr' | 'deposit_aba'>('aba_khqr');

  // Payment slip upload state
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  if (!isOpen) return null;

  const totalUsd = items.reduce((sum, item) => sum + item.product.priceUsd * item.quantity, 0);
  const totalKhr = Math.round(totalUsd * 4100);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage('ទំហំរូបភាពធំពេក (សូមជ្រើសរើសរូបតូចជាង 8MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipImage(reader.result as string);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setErrorMessage('សូមបំពេញឈ្មោះ លេខទូរសព្ទ និងទីតាំងទទួលឱ្យបានគ្រប់គ្រាន់');
      return;
    }
    setErrorMessage(null);
    setStep('payment');
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const orderPayload = {
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim(),
      customerTelegram: telegram.trim(),
      customerNote: note.trim(),
      items: items.map((i) => ({
        productId: i.product.id,
        productCode: i.product.code,
        productNameKh: i.product.nameKh,
        selectedSize: i.selectedSize,
        selectedColor: i.selectedColor.name,
        quantity: i.quantity,
        unitPriceUsd: i.product.priceUsd,
        totalPriceUsd: i.product.priceUsd * i.quantity,
        ...(i.product.sourceUrl ? { sourceUrl: i.product.sourceUrl } : {}),
      })),
      totalUsd,
      totalKhr,
      paymentMethod,
      paymentSlipUrl: slipImage || undefined,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ការបញ្ជាទិញមានបញ្ហា សូមព្យាយាមម្តងទៀត');
      }

      if (auth.currentUser?.emailVerified) {
        try {
          await saveOrderInFirestore(data.order, auth.currentUser.uid);
        } catch (fsErr) {
          console.warn('Firestore order sync warning:', fsErr);
        }
      }

      setCompletedOrder(data.order);
      setStep('success');
      onOrderSuccess(data.order);
    } catch (err: any) {
      console.error('Order submission error:', err);
      setErrorMessage(err.message || 'មិនអាចបញ្ជូនការកុម្ម៉ង់បានទេ សូមពិនិត្យអ៊ីនធឺណិត');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-neutral-900 text-base">
              {step === 'info' && 'ជំហានទី ១៖ ព័ត៌មានអ្នកទទួលទំនិញ'}
              {step === 'payment' && 'ជំហានទី ២៖ ទូទាត់ប្រាក់ & ភ្ជាប់វិក្កយបត្រ (Slip)'}
              {step === 'success' && 'ការបញ្ជាទិញបានជោគជ័យ!'}
            </h3>
          </div>
          {step !== 'success' && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              aria-label="បិទ"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Shipping Information */}
          {step === 'info' && (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">
                    ឈ្មោះអ្នកទទួល <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. សុខ ហេង"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">
                    លេខទូរសព្ទ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="ឧ. 096 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  អាសយដ្ឋាន ឬខេត្ត-ក្រុងទទួល <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. ផ្ទះលេខ 12, ផ្លូវ 271, សង្កាត់បឹងទំពុន, ភ្នំពេញ ឬ បាត់ដំបង"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">
                    គណនី Telegram (ស្រេចចិត្ត)
                  </label>
                  <input
                    type="text"
                    placeholder="ឧ. @username"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">
                    ចំណាំបន្ថែមទៅកាន់ហាង
                  </label>
                  <input
                    type="text"
                    placeholder="ឧ. ផ្ញើតាមវីរៈប៊ុនថាំ ឬ វេចខ្ចប់ជាកាដូ"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
              </div>

              {/* Order Summary Strip */}
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="flex justify-between items-center text-xs text-neutral-600 mb-2">
                  <span>ទំនិញសរុប ({items.reduce((s, i) => s + i.quantity, 0)} មុខ)៖</span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    {formatUsd(totalUsd)} ({formatKhr(totalUsd)})
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  {items.map((i) => `${i.product.nameKh} (${i.selectedSize}) x${i.quantity}`).join(' · ')}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  ត្រឡប់ក្រោយ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition"
                >
                  <span>បន្តទៅទូទាត់ប្រាក់</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Payment & Slip Upload */}
          {step === 'payment' && (
            <div className="space-y-5">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-2">
                  ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់៖
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('aba_khqr')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'aba_khqr'
                        ? 'border-[#003756] bg-cyan-50/50 text-[#003756] font-bold'
                        : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    <p className="font-bold">ស្កេន ABA KHQR (ពេញលេញ)</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">ទូទាត់ចំនួន {formatUsd(totalUsd)}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('deposit_aba')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'deposit_aba'
                        ? 'border-[#003756] bg-cyan-50/50 text-[#003756] font-bold'
                        : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    <p className="font-bold">កក់ប្រាក់ ៥០% តាម ABA</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">កក់ {formatUsd(totalUsd * 0.5)} (នៅសល់ពេលទំនិញមកដល់)</p>
                  </button>
                </div>
              </div>

              {/* ABA KHQR Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-neutral-200">
                <AbaKhqrCard
                  amountUsd={paymentMethod === 'deposit_aba' ? totalUsd * 0.5 : totalUsd}
                  orderDescription={`កុម្ម៉ង់ទំនិញ ${items.length} មុខ សម្រាប់ ${name}`}
                  showCardHeader={false}
                />
              </div>

              {/* Upload Payment Slip */}
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-neutral-300 hover:border-neutral-400 transition text-center">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {slipImage ? (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <img
                          src={slipImage}
                          alt="វិក្កយបត្រ ABA Slip"
                          className="w-36 h-48 object-cover rounded-xl shadow-md border mx-auto"
                        />
                        <span className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full p-1 shadow">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 font-bold">
                        បានភ្ជាប់វិក្កយបត្រជោគជ័យ (ចុចដើម្បីប្តូររូបភាព)
                      </p>
                    </div>
                  ) : (
                    <div className="py-2 space-y-1">
                      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-1">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-neutral-800">
                        ភ្ជាប់រូបភាពវិក្កយបត្រ (Upload ABA Slip)
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        ស្កេនទូទាត់តាម ABA រួចដាក់រូប Screenshot នៅត្រង់នេះ
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ថយក្រោយ</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>កំពុងបញ្ជូន...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>បញ្ជាក់ការបញ្ជាទិញ (Place Order)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Order Success Screen */}
          {step === 'success' && completedOrder && (
            <div className="py-6 px-2 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-lg">
                  <span className="text-xs font-mono font-bold text-neutral-800">
                    #{completedOrder.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(completedOrder.id);
                      setCopiedOrderId(true);
                      setTimeout(() => setCopiedOrderId(false), 2000);
                    }}
                    className="text-neutral-500 hover:text-neutral-900 text-xs p-0.5 inline-flex items-center gap-1"
                    title="ចម្លងលេខកូដ"
                  >
                    {copiedOrderId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {copiedOrderId && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    បានចម្លងលេខកូដ #{completedOrder.id}!
                  </p>
                )}
                <h3 className="text-xl font-black text-neutral-900 mt-2">
                  ការបញ្ជាទិញទទួលបានជោគជ័យ!
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  អរគុណ <strong>{completedOrder.customerName}</strong>! ការបញ្ជាទិញរបស់អ្នកត្រូវបានកត់ត្រាក្នុងប្រព័ន្ធរួចរាល់ហើយ។
                </p>
              </div>

              {/* Telegram Notification indicator */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-left space-y-1.5 max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-700">ស្ថានភាពការជូនដំណឹង៖</span>
                  {completedOrder.telegramNotificationStatus === 'sent' ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      បានផ្ញើទៅ Telegram Bot ហាងរួច
                    </span>
                  ) : (
                    <span className="text-neutral-500">បានកត់ត្រាក្នុងប្រព័ន្ធ</span>
                  )}
                </div>
                <div className="flex justify-between text-neutral-600 text-[11px]">
                  <span>ទូរសព្ទ៖ <strong>{completedOrder.customerPhone}</strong></span>
                  <span>សរុប៖ <strong>{formatUsd(completedOrder.totalUsd)}</strong></span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  ទីតាំងដឹកជញ្ជូន៖ {completedOrder.customerAddress}
                </div>
              </div>

              <div className="pt-2 space-y-2 max-w-md mx-auto">
                {/* Direct Track Order Button */}
                {onTrackOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTrackOrder(completedOrder.id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    <Truck className="w-4 h-4" />
                    <span>តាមដានស្ថានភាពទំនិញឥឡូវនេះ (Track Order)</span>
                  </button>
                )}

                <a
                  href={`${STORE_INFO.telegramUrl}?text=${encodeURIComponent(
                    (() => {
                      const links = completedOrder.items
                        .filter((it) => it.sourceUrl)
                        .map((it) => `• ${it.productNameKh}: ${it.sourceUrl}`)
                        .join('\n');
                      return `សួស្តី ${STORE_INFO.name}! ខ្ញុំបានបញ្ជាទិញទំនិញលើវេបសាយជោគជ័យហើយ (កូដ #${completedOrder.id}) សរុប ${formatUsd(completedOrder.totalUsd)}។${
                        links ? `\n\nលីងទំនិញ៖\n${links}` : ''
                      }\n\nខ្ញុំចង់ផ្ទៀងផ្ទាត់ការកុម្ម៉ង់នេះ!`;
                    })()
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  <Send className="w-4 h-4" />
                  <span>ឆាតបញ្ជាក់ជាមួយ Telegram @{STORE_INFO.telegramHandle}</span>
                </a>

                <p className="text-[11px] text-neutral-400 pt-1">
                  💡 អ្នកអាចចូលមកវេបសាយគ្រប់ពេល ហើយចុច "តាមដានទំនិញ" ដោយវាយលេខទូរសព្ទរបស់អ្នក។
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  បន្តការទិញទំនិញផ្សេងទៀត
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
