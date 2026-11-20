import React from 'react';
import { AbaKhqrCard } from './AbaKhqrCard';

export const AbaPaymentSection: React.FC = () => {
  return (
    <section id="payment" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#F4F2EE] border-t border-stone-200">
      <div className="max-w-4xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="font-ui text-[11px] font-semibold text-[#8C6A2E] uppercase tracking-[0.22em]">
            Official Payment · KHQR Verified
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111113] mt-1.5">
            ស្កេនទូទាត់តាម ABA Bank (KHQR)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            រាល់ការទូទាត់រួច សូមរក្សាទុកវិក្កយបត្រ (Slip) រួចភ្ជាប់ពេលបញ្ជាទិញលើវេបសាយ ឬផ្ញើមកកាន់ Telegram ដើម្បីរៀបចំកុម្ម៉ង់ជូនភ្លាមៗ។
          </p>
        </div>

        <AbaKhqrCard showCardHeader={true} />
      </div>
    </section>
  );
};
