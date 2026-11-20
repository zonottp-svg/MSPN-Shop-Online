import React from 'react';
import { Send, Phone, MapPin, Clock, CreditCard } from 'lucide-react';
import { STORE_INFO } from '../data/products';

interface FooterProps {
  onSelectCategory: (category: string) => void;
  categories?: { id: string; labelKh: string }[];
  onOpenAbaModal: () => void;
  onOpenAdmin?: () => void;
  onOpenTrackOrder?: () => void;
  onOpenOrderHistory?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  categories,
  onOpenAbaModal,
  onOpenAdmin,
  onOpenTrackOrder,
  onOpenOrderHistory,
}) => {
  return (
    <footer className="bg-[#111113] text-stone-300 pt-12 pb-24 sm:pb-10 px-4 sm:px-6 border-t border-stone-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-stone-800">
          {/* Brand info (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div>
              <span className="font-editorial text-2xl font-bold text-white tracking-wider">
                {STORE_INFO.name}
              </span>
              <p className="font-ui text-[10px] uppercase tracking-[0.25em] text-[#C9A45C] mt-0.5">
                China Direct Atelier
              </p>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              ហាងទទួលកុម្ម៉ង់ទំនិញ Pre-order ម៉ូដសម្លៀកបំពាក់ ស្បែកជើង ខ្សែក្រវ៉ាត់ និងនាឡិកា គុណភាពខ្ពស់ នាំចូលផ្ទាល់ពីប្រទេសចិន។ រង់ចាំ ៧-១៤ ថ្ងៃ ដឹកជូនដល់ផ្ទះគ្រប់ខេត្ត-ក្រុង។
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-stone-400">
              <Clock className="w-4 h-4 text-[#C9A45C]" />
              <span>សេវាបម្រើអតិថិជន៖ 8:00 AM - 10:00 PM (រៀងរាល់ថ្ងៃ)</span>
            </div>
          </div>

          {/* Quick Categories (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="font-ui text-[11px] font-bold uppercase tracking-[0.16em] text-[#E6D5B8]">
              ប្រភេទផលិតផល
            </p>
            <ul className="space-y-2 text-xs text-stone-400">
              {(categories && categories.length > 1
                ? categories.filter((c) => c.id !== 'all')
                : [
                    { id: 'clothing', labelKh: 'ខោអាវ Streetwear & Jeans' },
                    { id: 'shoes', labelKh: 'ស្បែកជើង Sneakers & Sport' },
                    { id: 'belts', labelKh: 'ខ្សែក្រវ៉ាត់ស្បែកប្រណិត' },
                    { id: 'watch', labelKh: 'នាឡិកាប្រណិត' },
                    { id: 'accessories', labelKh: 'មួក និងគ្រឿងតុបតែង' },
                  ]
              ).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-white transition"
                  >
                    {cat.labelKh}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={onOpenAbaModal}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
                >
                  ព័ត៌មានគណនី ABA Bank
                </button>
              </li>
              {onOpenTrackOrder && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenTrackOrder}
                    className="text-[#E6D5B8] hover:text-white font-semibold transition flex items-center gap-1"
                  >
                    <span>តាមដានទំនិញ Pre-Order</span>
                  </button>
                </li>
              )}
              {onOpenOrderHistory && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenOrderHistory}
                    className="text-stone-400 hover:text-white transition flex items-center gap-1"
                  >
                    <span>ប្រវត្តិបញ្ជាទិញ (Order History)</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Contact & Banking (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <p className="font-ui text-[11px] font-bold uppercase tracking-[0.16em] text-[#E6D5B8]">
              ទំនាក់ទំនង &amp; គណនីទូទាត់
            </p>
            <div className="space-y-2.5 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Telegram: </span>
                <a
                  href={STORE_INFO.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline font-semibold font-ui"
                >
                  @{STORE_INFO.telegramHandle}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ទូរសព្ទ៖ </span>
                <a href={`tel:${STORE_INFO.phone1Raw}`} className="text-white hover:underline font-ui">
                  {STORE_INFO.phone1}
                </a>
                <span>/</span>
                <a href={`tel:${STORE_INFO.phone2Raw}`} className="text-white hover:underline font-ui">
                  {STORE_INFO.phone2}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#00a4e4] shrink-0" />
                <span>ABA: </span>
                <span className="text-white font-mono font-semibold">
                  {STORE_INFO.usdAccount} (USD) / {STORE_INFO.khrAccount} (KHR)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C9A45C] shrink-0" />
                <span>{STORE_INFO.deliveryKh}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-3 font-ui">
          <p>© 2026 {STORE_INFO.name}. All Rights Reserved ({STORE_INFO.ownerName}).</p>
          <div className="flex items-center gap-3">
            <span>Pre-Order China</span>
            <span>·</span>
            <span>ABA KHQR Verified</span>
            <span>·</span>
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-stone-400 hover:text-white transition underline"
              >
                គ្រប់គ្រង (Admin)
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
