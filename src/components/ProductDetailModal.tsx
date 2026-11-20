import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Send,
  CreditCard,
  Clock,
  Star,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Product, ProductColor, formatUsd, formatKhr, STORE_INFO } from '../data/products';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: ProductColor, quantity: number) => void;
  onDirectAbaPay: (product: Product, size: string, color: ProductColor, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onDirectAbaPay,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [selectedColor, setSelectedColor] = useState<ProductColor>({ name: 'Standard', hex: '#171717' });
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const list = [
      product.image,
      ...(Array.isArray(product.images) ? product.images : []),
      ...(Array.isArray(product.colors) ? product.colors.map((c) => c.image).filter(Boolean) as string[] : []),
    ].filter(Boolean);
    return Array.from(new Set(list));
  }, [product]);

  useEffect(() => {
    if (product && isOpen) {
      const firstSize = product.sizes?.[0] || 'Standard';
      const firstColor = product.colors?.[0] || { name: 'Standard', hex: '#171717' };
      setSelectedSize(firstSize);
      setSelectedColor(firstColor);
      setActiveImage(firstColor.image || product.image);
      setQuantity(1);
      setIsAdded(false);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentIdx = Math.max(0, galleryImages.indexOf(activeImage));
  const totalPriceUsd = product.priceUsd * quantity;

  const handleSelectColor = (color: ProductColor, idx: number) => {
    setSelectedColor(color);
    const nextPhoto = color.image || galleryImages[idx] || product.image;
    if (nextPhoto) {
      setActiveImage(nextPhoto);
    }
  };

  const handleCycleImage = (dir: 1 | -1) => {
    if (galleryImages.length <= 1) return;
    const nextIdx = (currentIdx + dir + galleryImages.length) % galleryImages.length;
    setActiveImage(galleryImages[nextIdx]);
  };

  const handleAdd = () => {
    onAddToCart(product, selectedSize, selectedColor, quantity);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 1100);
  };

  const telegramOrderUrl = `${STORE_INFO.telegramUrl}?text=${encodeURIComponent(
    `សួស្តី ${STORE_INFO.name}! ខ្ញុំចង់កុម្ម៉ង់ទំនិញ Pre-order ពីប្រទេសចិន៖\n` +
      `-------------------------\n` +
      `• ទំនិញ៖ ${product.nameKh}\n` +
      `• កូដ៖ ${product.code}\n` +
      `• ទំហំ៖ ${selectedSize}\n` +
      `• ពណ៌៖ ${selectedColor.name}\n` +
      `• ចំនួន៖ ${quantity}\n` +
      `• តម្លៃសរុប៖ ${formatUsd(totalPriceUsd)} (${formatKhr(totalPriceUsd)})\n` +
      (product.sourceUrl ? `• លីងទំនិញ៖ ${product.sourceUrl}\n` : '') +
      `-------------------------\n` +
      `ខ្ញុំចង់កក់ប្រាក់ និងទូទាត់តាម ABA Bank (${STORE_INFO.ownerName})។ សូមផ្ញើលេខគណនី ឬ QR Code មកកាន់ខ្ញុំ!`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[93vh] sm:max-h-[90vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-800 border border-stone-200 flex items-center justify-center transition shadow-sm"
          aria-label="បិទ"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Column: Multi-Photo Interactive Gallery */}
        <div className="md:w-[48%] bg-[#F4F2EE] relative flex flex-col justify-between shrink-0">
          <div className="relative h-64 sm:h-80 md:h-auto md:aspect-[4/5] w-full overflow-hidden">
            <img
              src={activeImage || product.image}
              alt={product.nameKh}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transition-all duration-300"
            />

            {/* Top Left Luxury Tag */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="bg-[#111113]/85 backdrop-blur-md text-[#E6D5B8] text-[10px] font-ui font-semibold tracking-wider px-2.5 py-1 rounded-md uppercase">
                {product.badge || 'Pre-Order China'}
              </span>
            </div>

            {/* Gallery Prev / Next Controls */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => handleCycleImage(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#111113] shadow-md flex items-center justify-center transition active:scale-95"
                  aria-label="រូបមុន"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCycleImage(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#111113] shadow-md flex items-center justify-center transition active:scale-95"
                  aria-label="រូបបន្ទាប់"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="absolute bottom-3 right-3 bg-[#111113]/80 text-white text-[10px] font-ui font-semibold px-2 py-0.5 rounded-md">
                  {currentIdx + 1} / {galleryImages.length}
                </span>
              </>
            )}
          </div>

          {/* Interactive Thumbnail Strip */}
          {galleryImages.length > 1 && (
            <div className="px-3 py-2.5 bg-white/80 border-t border-stone-200/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {galleryImages.map((imgUrl, idx) => {
                const isSelected = activeImage === imgUrl;
                return (
                  <button
                    key={`${imgUrl.slice(0, 24)}-${idx}`}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                      isSelected
                        ? 'border-[#111113] ring-2 ring-[#C9A45C]/50 scale-[1.03]'
                        : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.nameKh} - រូបទី ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Desktop Obsidian Guarantee Strip */}
          <div className="hidden md:flex items-center justify-between px-4 py-3 bg-[#111113] text-stone-300 text-[11px]">
            <div className="flex items-center gap-2 text-[#E6D5B8] font-semibold">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>ដឹកជញ្ជូន {STORE_INFO.waitDays}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ពិនិត្យគុណភាព ១០០%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Info & Sticky Bottom Purchase Bar */}
        <div className="md:w-[52%] flex flex-col flex-1 overflow-hidden bg-white">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Category & Rating */}
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="font-semibold text-[#8C6A2E] uppercase tracking-wider">
                {product.categoryKh}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-ui text-stone-400">{product.code}</span>
              <span aria-hidden="true">·</span>
              <div className="flex items-center gap-1 font-ui font-medium">
                <Star className="w-3.5 h-3.5 fill-[#C9A45C] text-[#C9A45C]" />
                <span className="text-stone-800">{product.rating}</span>
                <span className="text-stone-400">({product.reviewCount})</span>
              </div>
            </div>

            {/* Title & Editorial Subtitle */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#111113] leading-snug">
                {product.nameKh}
              </h2>
              {product.nameEn && (
                <p className="text-sm text-stone-500 font-editorial italic mt-0.5">{product.nameEn}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-extrabold text-[#111113] tabular-nums font-ui">
                {formatUsd(product.priceUsd)}
              </span>
              {product.originalPriceUsd && (
                <span className="text-sm text-stone-400 line-through tabular-nums font-ui">
                  {formatUsd(product.originalPriceUsd)}
                </span>
              )}
              <span className="text-xs sm:text-sm text-stone-500 tabular-nums font-ui font-medium ml-auto">
                ≈ {formatKhr(product.priceUsd)}
              </span>
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-stone-100">
              <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed font-ui">
                {product.descriptionKh}
              </p>
            </div>

            {/* Interactive Color Selection (Switches Photo!) */}
            {product.colors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-800">ជម្រើសពណ៌៖</span>
                  <span className="text-[#8C6A2E] font-semibold font-ui">{selectedColor.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {product.colors.map((color, idx) => {
                    const isSelected = selectedColor.name === color.name;
                    return (
                      <button
                        key={`${color.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectColor(color, idx)}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition min-h-[38px] ${
                          isSelected
                            ? 'border-[#111113] bg-[#FAF9F6] ring-1 ring-[#111113] font-bold text-[#111113]'
                            : 'border-stone-200 bg-white hover:border-stone-400 text-stone-700'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="font-ui text-[11px]">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">ទំហំ / Size៖</span>
                <span className="text-stone-400 text-[11px]">ជ្រើសរើសទំហំសមស្រប</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-2 text-xs font-ui font-semibold rounded-xl border transition min-h-[38px] ${
                      selectedSize === size
                        ? 'bg-[#111113] text-white border-[#111113] shadow-xs'
                        : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-800">ចំនួន (Quantity)៖</span>
              <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-[#FAF9F6]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-9 text-sm font-bold text-stone-700 hover:bg-stone-200 flex items-center justify-center"
                >
                  -
                </button>
                <span className="px-4 text-xs font-bold font-ui text-[#111113] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-9 text-sm font-bold text-stone-700 hover:bg-stone-200 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Purchase Bar */}
          <div className="p-4 sm:px-6 bg-[#FAF9F6] border-t border-stone-200 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>ទឹកប្រាក់សរុប៖</span>
              <div className="text-right font-ui">
                <span className="text-base font-extrabold text-[#111113] tabular-nums">
                  {formatUsd(totalPriceUsd)}
                </span>
                <span className="text-[11px] text-stone-500 ml-1.5 tabular-nums">
                  ({formatKhr(totalPriceUsd)})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className={`w-full h-11 inline-flex items-center justify-center gap-1.5 px-3 font-bold text-xs rounded-xl transition active:scale-[0.98] ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#111113] text-white hover:bg-neutral-800 shadow-sm'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>បានដាក់ចូល!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-[#E6D5B8]" />
                    <span>ដាក់ចូលកន្ត្រក</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onDirectAbaPay(product, selectedSize, selectedColor, quantity)}
                className="w-full h-11 inline-flex items-center justify-center gap-1.5 px-3 bg-[#003756] hover:bg-[#002b44] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4 text-cyan-300" />
                <span>ស្កេន ABA KHQR</span>
              </button>
            </div>

            <a
              href={telegramOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-9 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-stone-600 hover:text-[#111113] bg-white border border-stone-200 rounded-xl transition"
            >
              <Send className="w-3.5 h-3.5 text-sky-600" />
              <span>ឬ សាកសួរ & កម្ម៉ង់ផ្ទាល់តាម Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
