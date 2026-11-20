import React from 'react';
import { ArrowDown, Send, ShieldCheck, Clock, Truck, CreditCard } from 'lucide-react';
import { STORE_INFO } from '../data/products';

interface HeroProps {
  onScrollToProducts: () => void;
  onOpenAbaModal: () => void;
  onOpenTrackOrder?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScrollToProducts, onOpenAbaModal, onOpenTrackOrder }) => {
  return (
    <section className="relative overflow-hidden bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-12">
        {/* Asymmetric Luxury Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-center">
          {/* Editorial Visual First on Mobile? Keep balanced compact visual on mobile */}
          <div className="lg:col-span-5 lg:order-2 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_18px_45px_rgba(17,17,19,0.12)] border border-stone-200 aspect-[16/10] sm:aspect-[4/3] lg:aspect-[4/5] group bg-[#111113]">
              <img
                src="/src/assets/images/hero_fashion_collection_1794414887257.jpg"
                alt="MSPN ONLINE STORE Luxury Pre-Order Collection"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111113]/85 via-[#111113]/20 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
                <span className="font-ui text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] text-[#E6D5B8] uppercase">
                  Curated Edition · 2026
                </span>
                <p className="font-editorial text-lg sm:text-2xl font-semibold tracking-wide mt-0.5 text-white">
                  Modern Streetwear &amp; Luxury Timepieces
                </p>
                <p className="text-[11px] sm:text-xs text-stone-300 mt-0.5 font-ui">
                  Direct Pre-Order · Guangzhou &amp; Shanghai
                </p>
              </div>
            </div>
          </div>

          {/* Left Editorial Copy */}
          <div className="lg:col-span-7 lg:order-1 space-y-4 sm:space-y-6">
            {/* Clean Editorial Overline */}
            <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-ui tracking-wider text-[#8C6A2E] font-semibold uppercase">
              <span>MSPN ATELIER</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span className="text-stone-500 font-normal">Pre-Order ៧-១៤ ថ្ងៃ</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-[#111113] tracking-tight leading-[1.28] text-balance">
              ម៉ូដសម្លៀកបំពាក់ <span className="font-editorial italic font-semibold text-[#8C6A2E]">&amp;</span> នាឡិកាប្រណិតទាន់សម័យ
            </h1>

            {/* Concise Prose */}
            <p className="text-xs sm:text-base text-stone-600 leading-relaxed max-w-xl">
              ជ្រើសរើស <strong className="text-[#111113]">ខោអាវ, ស្បែកជើង, ខ្សែក្រវ៉ាត់ និងនាឡិកា</strong> គុណភាពលំដាប់ខ្ពស់ នាំចូលផ្ទាល់ពីប្រទេសចិន។ ទូទាត់សុវត្ថិភាពតាម <strong>ABA KHQR</strong> និងដឹកជូនដល់ ២៥ ខេត្ត-ក្រុង។
            </p>

            {/* Clean Action Buttons (Crisp 2-button row on mobile, full row on desktop) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={onScrollToProducts}
                className="h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-4 sm:px-6 text-xs sm:text-sm font-bold text-white bg-[#111113] hover:bg-neutral-800 rounded-xl shadow-md transition active:scale-[0.98]"
              >
                <span>មើលទំនិញ</span>
                <ArrowDown className="w-4 h-4 text-[#E6D5B8]" />
              </button>

              {onOpenTrackOrder && (
                <button
                  type="button"
                  onClick={onOpenTrackOrder}
                  className="h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-[#111113] bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition active:scale-[0.98]"
                >
                  <Truck className="w-4 h-4 text-[#8C6A2E]" />
                  <span>តាមដានទំនិញ</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenAbaModal}
                className="h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-4 text-xs sm:text-sm font-semibold text-[#003756] bg-white hover:bg-stone-100 border border-stone-200 rounded-xl transition active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4 text-[#00a4e4]" />
                <span>ស្កេន ABA</span>
              </button>

              <a
                href={STORE_INFO.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-4 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition active:scale-[0.98]"
              >
                <Send className="w-4 h-4 text-sky-600" />
                <span>Telegram</span>
              </a>
            </div>

            {/* Quiet Trust Line (Desktop) */}
            <div className="hidden sm:flex pt-3 border-t border-stone-200/80 flex-wrap items-center gap-4 text-xs text-stone-600">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>ធានាគុណភាព ១០០%</span>
              </div>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <div className="flex items-center gap-1.5 font-medium font-ui">
                <CreditCard className="w-4 h-4 text-[#003756]" />
                <span>ABA: {STORE_INFO.ownerName}</span>
              </div>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-[#8C6A2E]" />
                <span>រង់ចាំ {STORE_INFO.waitDays}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sleek 3-Column Assurance Strip (Hidden on compact mobile to prioritize product catalog above fold) */}
        <div className="hidden sm:grid mt-10 pt-8 border-t border-stone-200/80 grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#111113] text-[#E6D5B8] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111113]">ដឹកជញ្ជូន {STORE_INFO.waitDays}</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                នាំចូលផ្ទាល់ពីឃ្លាំងចិនមកដល់ភ្នំពេញយ៉ាងរហ័ស និងមានសុវត្ថិភាព
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#003756] text-white flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111113]">ទូទាត់តាម ABA KHQR</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                ផ្ទេរប្រាក់សុវត្ថិភាព គណនី {STORE_INFO.ownerName} ទាំង USD និង KHR
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#8C6A2E] border border-stone-200 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111113]">សេវាដឹក ២៥ ខេត្ត-ក្រុង</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                ផ្ញើតាមវីរៈប៊ុនថាំ, J&amp;T Express ឬ Grab ដល់មុខផ្ទះរបស់អ្នក
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
