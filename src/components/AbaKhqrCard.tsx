import React, { useState } from 'react';
import { Copy, Check, Download, Send, ShieldCheck, ZoomIn, X, ExternalLink } from 'lucide-react';
import { STORE_INFO, formatUsd, formatKhr } from '../data/products';

interface AbaKhqrCardProps {
  amountUsd?: number;
  orderDescription?: string;
  onOpenTelegram?: () => void;
  showCardHeader?: boolean;
}

export const AbaKhqrCard: React.FC<AbaKhqrCardProps> = ({
  amountUsd,
  orderDescription,
  onOpenTelegram,
  showCardHeader = true,
}) => {
  const [copiedField, setCopiedField] = useState<'usd' | 'khr' | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleCopy = (field: 'usd' | 'khr', text: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, ''));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2200);
  };

  const telegramOrderText = encodeURIComponent(
    amountUsd
      ? `សួស្តី! ខ្ញុំបានទូទាត់ប្រាក់តាម ABA Bank ចំនួន ${formatUsd(amountUsd)} (${formatKhr(amountUsd)}) សម្រាប់ការកុម្ម៉ង់ ${orderDescription || 'ទំនិញ Pre-order'}។ នេះជាវិក្កយបត្រ (Slip) របស់ខ្ញុំ៖`
      : `សួស្តី! ខ្ញុំបានទូទាត់ប្រាក់តាម ABA Bank រួចរាល់ហើយ។ នេះជាវិក្កយបត្រ (Slip) បញ្ជាក់ការកុម្ម៉ង់របស់ខ្ញុំ៖`
  );

  return (
    <>
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        {/* ABA KHQR Header Ribbon */}
        {showCardHeader && (
          <div className="bg-[#003756] text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00a4e4] to-[#003756] flex items-center justify-center font-black text-white text-xs tracking-wider shadow-inner">
                ABA
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-cyan-200">ABA Mobile Pay</p>
                <p className="text-sm font-semibold tracking-tight">KHQR Standard Payment</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded">
              <span>KHQR</span>
            </div>
          </div>
        )}

        {/* Main Card Body */}
        <div className="p-6 text-center bg-gradient-to-b from-white to-neutral-50/80">
          <p className="text-xs text-neutral-500 font-medium mb-1">ស្កេនទូទាត់ជាមួយគ្រប់កម្មវិធីធនាគារក្នុងប្រទេសកម្ពុជា</p>
          <p className="text-xs text-neutral-400 mb-4">ABA Mobile · Bakong · Wing · ACLEDA · Canadia</p>

          {/* Official Scannable ABA QR Image */}
          <div className="relative group inline-block p-2 sm:p-2.5 bg-white rounded-2xl shadow-md border-2 border-neutral-200/90 hover:border-cyan-500 transition-all">
            <div
              className="relative w-64 sm:w-72 mx-auto rounded-xl overflow-hidden bg-neutral-100 cursor-pointer"
              onClick={() => setIsZoomed(true)}
              title="ចុចដើម្បីពង្រីករូបភាព QR Code"
            >
              <img
                src="/aba-qr.jpg"
                alt="ABA' QR SOPANHA MEACH"
                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-102"
              />

              {/* Hover Zoom Overlay */}
              <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/95 text-neutral-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-rose-600" />
                  <span>ពង្រីក QR Code</span>
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between px-1 text-xs text-neutral-600 font-medium">
              <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>គណនីផ្ទៀងផ្ទាត់ផ្លូវការ</span>
              </div>
              <a
                href="/aba-qr.jpg"
                download="ABA_QR_SOPANHA_MEACH.jpg"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-700 hover:text-cyan-800 font-semibold hover:underline"
                title="ទាញយករូប QR"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ទាញយករូប</span>
              </a>
            </div>
          </div>

          {/* Dynamic Amount Display (If available) */}
          {amountUsd !== undefined && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <span className="text-xs text-rose-600 font-medium">ទឹកប្រាក់សរុបត្រូវទូទាត់</span>
              <div className="flex items-baseline justify-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-rose-700 tabular-nums">{formatUsd(amountUsd)}</span>
                <span className="text-sm font-semibold text-rose-600/80 tabular-nums">≈ {formatKhr(amountUsd)}</span>
              </div>
              {orderDescription && (
                <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{orderDescription}</p>
              )}
            </div>
          )}

          {/* Account Details Box */}
          <div className="mt-5 text-left bg-neutral-100/70 p-4 rounded-xl space-y-3 border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
              <div>
                <p className="text-[11px] text-neutral-500 font-medium">ឈ្មោះម្ចាស់គណនី</p>
                <p className="font-bold text-neutral-900 tracking-wide text-sm">{STORE_INFO.ownerName}</p>
              </div>
              <span className="text-[10px] bg-neutral-200 text-neutral-700 font-semibold px-2 py-0.5 rounded">
                ABA BANK
              </span>
            </div>

            {/* USD Account with copy button */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[11px] text-neutral-500 font-medium">គណនីប្រាក់ដុល្លារ (USD)</p>
                <p className="font-bold text-neutral-900 tabular-nums tracking-wider text-base">
                  {STORE_INFO.usdAccount}
                </p>
              </div>
              <button
                onClick={() => handleCopy('usd', STORE_INFO.usdAccount)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#003756] bg-white border border-neutral-300 rounded-lg shadow-2xs hover:bg-neutral-50 active:scale-95 transition"
                title="ចម្លងលេខគណនី USD"
              >
                {copiedField === 'usd' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">បានចម្លង!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ចម្លងលេខ</span>
                  </>
                )}
              </button>
            </div>

            {/* KHR Account with copy button */}
            <div className="flex items-center justify-between border-t border-neutral-200/70 pt-2">
              <div>
                <p className="text-[11px] text-neutral-500 font-medium">គណនីប្រាក់រៀល (KHR)</p>
                <p className="font-bold text-neutral-900 tabular-nums tracking-wider text-base">
                  {STORE_INFO.khrAccount}
                </p>
              </div>
              <button
                onClick={() => handleCopy('khr', STORE_INFO.khrAccount)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#003756] bg-white border border-neutral-300 rounded-lg shadow-2xs hover:bg-neutral-50 active:scale-95 transition"
                title="ចម្លងលេខគណនី KHR"
              >
                {copiedField === 'khr' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">បានចម្លង!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ចម្លងលេខ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 space-y-2.5">
            <a
              href={`${STORE_INFO.telegramUrl}?text=${telegramOrderText}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpenTelegram}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.99]"
            >
              <Send className="w-4 h-4" />
              <span>ផ្ញើវិក្កយបត្រ (Slip) តាម Telegram</span>
            </a>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 pt-1">
              <span>ទំនាក់ទំនងលឿន៖</span>
              <a href={`tel:${STORE_INFO.phone1Raw}`} className="text-neutral-800 font-semibold hover:underline">
                {STORE_INFO.phone1}
              </a>
              <span>·</span>
              <a href={`tel:${STORE_INFO.phone2Raw}`} className="text-neutral-800 font-semibold hover:underline">
                {STORE_INFO.phone2}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Full-size QR Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-2xl p-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-neutral-900 text-sm mb-3">ABA' QR SOPANHA MEACH</h4>
            <img
              src="/aba-qr.jpg"
              alt="ABA QR Full SOPANHA MEACH"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-neutral-200"
            />
            <div className="mt-3 flex justify-center gap-2">
              <a
                href="/aba-qr.jpg"
                download="ABA_QR_SOPANHA_MEACH.jpg"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ទាញយករូប QR</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
