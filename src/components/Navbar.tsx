import React from 'react';
import { ShoppingBag, Send, Truck, SlidersHorizontal } from 'lucide-react';
import { STORE_INFO } from '../data/products';

interface CategoryTab {
  id: string;
  labelKh: string;
}

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  categories?: CategoryTab[];
  onOpenAbaModal: () => void;
  onOpenAdmin: () => void;
  onOpenTrackOrder: () => void;
  bannerText?: string;
  storeName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onSelectCategory,
  activeCategory,
  categories,
  onOpenAbaModal,
  onOpenAdmin,
  onOpenTrackOrder,
  bannerText,
  storeName,
}) => {
  const navCategories: CategoryTab[] =
    categories && categories.length > 0
      ? categories.slice(0, 6)
      : [
          { id: 'all', labelKh: 'ទាំងអស់' },
          { id: 'clothing', labelKh: 'ខោអាវ' },
          { id: 'shoes', labelKh: 'ស្បែកជើង' },
          { id: 'belts', labelKh: 'ខ្សែក្រវ៉ាត់' },
          { id: 'watch', labelKh: 'នាឡិកា' },
        ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/92 backdrop-blur-md border-b border-stone-200/80">
      {/* Slim Obsidian Pre-Order Announcement Strip */}
      <div className="bg-[#111113] text-[#E6D5B8] text-[10px] sm:text-xs py-1.5 px-3 text-center font-medium tracking-wide truncate">
        {bannerText ||
          'PRE-ORDER នាំចូលផ្ទាល់ពីចិន · រង់ចាំ ៧-១៤ ថ្ងៃ · ទូទាត់ ABA KHQR · ដឹកជូន ២៥ ខេត្ត-ក្រុង'}
      </div>

      {/* Clean 3-Zone Luxury Header */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col leading-none whitespace-nowrap shrink-0 group"
        >
          <span className="font-editorial text-lg sm:text-2xl font-bold tracking-[0.06em] text-[#111113] group-hover:text-[#8C6A2E] transition-colors">
            {storeName || STORE_INFO.name}
          </span>
          <span className="hidden sm:block font-ui text-[9px] uppercase tracking-[0.26em] text-stone-400 mt-0.5">
            China Direct Atelier
          </span>
        </a>

        {/* Zone 2: Clean Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-xs lg:text-sm font-medium text-stone-600">
          {navCategories.map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => onSelectCategory(nav.id)}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === nav.id
                  ? 'border-[#B8924A] text-[#111113] font-bold'
                  : 'border-transparent hover:text-[#111113]'
              }`}
            >
              {nav.labelKh}
            </button>
          ))}

          <button
            type="button"
            onClick={onOpenAbaModal}
            className="transition-colors whitespace-nowrap shrink-0 text-[#003756] hover:text-[#00253a] font-bold"
          >
            វិធីទូទាត់ ABA
          </button>

          <button
            type="button"
            onClick={onOpenTrackOrder}
            className="transition-colors whitespace-nowrap shrink-0 text-[#8C6A2E] hover:text-[#111113] font-bold flex items-center gap-1"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>តាមដានទំនិញ</span>
          </button>
        </nav>

        {/* Zone 3: Action Lockup */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Track Button (compact & tap-friendly) */}
          <button
            type="button"
            onClick={onOpenTrackOrder}
            className="md:hidden h-10 px-2.5 text-xs font-semibold text-[#111113] bg-stone-100 hover:bg-stone-200 border border-stone-200/80 rounded-xl inline-flex items-center gap-1 transition"
            title="តាមដានទំនិញ"
          >
            <Truck className="w-3.5 h-3.5 text-[#8C6A2E]" />
            <span>តាមដាន</span>
          </button>

          {/* Admin Quick Trigger */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="h-10 px-2.5 sm:px-3 text-xs font-ui font-semibold text-stone-600 hover:text-[#111113] hover:bg-stone-100 rounded-xl inline-flex items-center gap-1 transition"
            title="ផ្ទាំងគ្រប់គ្រង Admin"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:hidden" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {/* Telegram Quick Link (Desktop) */}
          <a
            href={STORE_INFO.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 h-10 px-3 text-xs font-ui font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-sky-600" />
            <span>@{STORE_INFO.telegramHandle}</span>
          </a>

          {/* Primary Cart Trigger */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative inline-flex items-center justify-center gap-2 h-10 px-3 sm:px-4 text-xs font-semibold text-white bg-[#111113] hover:bg-neutral-800 rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap shrink-0"
            aria-label="បើកកន្ត្រកទំនិញ"
          >
            <ShoppingBag className="w-4 h-4 text-[#E6D5B8]" />
            <span className="hidden sm:inline">កន្ត្រក</span>
            {cartCount > 0 && (
              <span className="bg-[#C9A45C] text-[#111113] text-[10px] font-ui font-extrabold min-w-[18px] h-[18px] px-1 rounded-full tabular-nums inline-flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
