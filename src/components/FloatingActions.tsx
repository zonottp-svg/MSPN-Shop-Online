import React, { useState, useEffect } from 'react';
import { Send, Phone, ArrowUp, X } from 'lucide-react';
import { STORE_INFO } from '../data/products';

export const FloatingActions: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPhonePopup, setShowPhonePopup] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Phone numbers popup */}
      {showPhonePopup && (
        <div className="bg-white rounded-2xl p-4 shadow-2xl border border-stone-200 text-neutral-800 text-xs w-64 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2">
            <span className="font-bold text-[#111113]">ទាក់ទងមកកាន់ហាង</span>
            <button
              onClick={() => setShowPhonePopup(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
              aria-label="បិទ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-stone-500 mb-2">
            ចុចលើលេខទូរសព្ទខាងក្រោមដើម្បីខលផ្ទាល់៖
          </p>
          <div className="space-y-1.5">
            <a
              href={`tel:${STORE_INFO.phone1Raw}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 text-[#111113] border border-stone-200 hover:bg-stone-100 transition font-ui font-semibold"
            >
              <span>{STORE_INFO.phone1} (Smart)</span>
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
            </a>
            <a
              href={`tel:${STORE_INFO.phone2Raw}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 text-[#111113] border border-stone-200 hover:bg-stone-100 transition font-ui font-semibold"
            >
              <span>{STORE_INFO.phone2} (Metfone)</span>
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
            </a>
          </div>
        </div>
      )}

      {/* Compact Floating Action Dock */}
      <div className="flex items-center gap-2">
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 backdrop-blur-md text-[#111113] border border-stone-200 shadow-lg flex items-center justify-center hover:bg-stone-50 transition active:scale-95"
            title="ឡើងទៅលើ"
            aria-label="ឡើងទៅលើ"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowPhonePopup(!showPhonePopup)}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#111113] hover:bg-neutral-800 text-[#E6D5B8] border border-stone-700 shadow-lg flex items-center justify-center transition active:scale-95"
          title="ខលមកកាន់យើងខ្ញុំ"
          aria-label="ខលមកកាន់យើងខ្ញុំ"
        >
          <Phone className="w-4 h-4" />
        </button>

        <a
          href={STORE_INFO.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 sm:h-11 px-3.5 sm:px-4 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-xl transition-all active:scale-95 text-xs font-ui font-bold"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">ឆាតតាម Telegram</span>
          <span className="sm:hidden">Telegram</span>
        </a>
      </div>
    </div>
  );
};
