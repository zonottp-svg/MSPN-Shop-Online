import React from 'react';
import { Search, Send, CheckCircle2, PackageCheck } from 'lucide-react';
import { STORE_INFO } from '../data/products';

export const ProcessGuide: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'ជ្រើសរើសម៉ូដ & ពណ៌',
      desc: 'រើសយកខោអាវ ស្បែកជើង ខ្សែក្រវ៉ាត់ ឬនាឡិកាដែលអ្នកពេញចិត្ត ពិនិត្យរូបភាពតាមពណ៌ និងទំហំឱ្យត្រឹមត្រូវ។',
      icon: Search,
    },
    {
      num: '02',
      title: 'កម្ម៉ង់ & ស្កេន ABA KHQR',
      desc: `បញ្ជាទិញផ្ទាល់លើវេបសាយ ឬតាម Telegram (@${STORE_INFO.telegramHandle}) រួចទូទាត់តាម ABA (${STORE_INFO.ownerName})។`,
      icon: Send,
    },
    {
      num: '03',
      title: 'ដឹកជញ្ជូន ៧-១៤ ថ្ងៃ',
      desc: 'ក្រុមការងារបញ្ជាទិញភ្លាមៗពីឃ្លាំងប្រទេសចិន វេចខ្ចប់យ៉ាងប្រុងប្រយ័ត្ន និងដឹកមកភ្នំពេញ។',
      icon: PackageCheck,
    },
    {
      num: '04',
      title: 'ទទួលទំនិញដល់ដៃ',
      desc: 'មកដល់ភ្លាម យើងនឹងផ្ញើជូនតាមវីរៈប៊ុនថាំ J&T Express ឬ Grab ដល់ផ្ទះរបស់អ្នកគ្រប់ ២៥ ខេត្ត-ក្រុង។',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="bg-[#111113] text-white py-12 sm:py-16 px-4 sm:px-6 border-y border-stone-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="font-ui text-[11px] font-semibold text-[#C9A45C] uppercase tracking-[0.22em]">
            The Pre-Order Atelier
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white mt-2">
            ដំណើរការកុម្ម៉ង់ងាយៗ ៤ ជំហាន
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-1.5">
            តម្លាភាព ទំនុកចិត្ត និងតាមដានបានគ្រប់ជំហានជាមួយ {STORE_INFO.name}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-white/[0.04] hover:bg-white/[0.07] p-5 rounded-2xl border border-white/10 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-editorial text-xl italic font-semibold text-[#C9A45C]">
                      {step.num}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-[#E6D5B8] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1.5">{step.title}</h3>
                  <p className="text-xs text-stone-400 leading-relaxed font-ui">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
