import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Send, Star, Check, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { Product, ProductColor, formatUsd, formatKhr, STORE_INFO } from '../data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, size: string, color: ProductColor) => void;
  onViewDetails: (product: Product) => void;
  onDirectPay: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
}) => {
  const galleryImages = useMemo(() => {
    const list = [
      product.image,
      ...(Array.isArray(product.images) ? product.images : []),
      ...(Array.isArray(product.colors) ? product.colors.map((c) => c.image).filter(Boolean) as string[] : []),
    ].filter(Boolean);
    return Array.from(new Set(list));
  }, [product.image, product.images, product.colors]);

  const initialColor = product.colors[0] || { name: 'Standard', hex: '#171717' };
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'Standard');
  const [selectedColor, setSelectedColor] = useState<ProductColor>(initialColor);
  const [activeImage, setActiveImage] = useState<string>(initialColor.image || product.image);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const firstCol = product.colors[0] || { name: 'Standard', hex: '#171717' };
    setSelectedSize(product.sizes[0] || 'Standard');
    setSelectedColor(firstCol);
    setActiveImage(firstCol.image || product.image);
    setImageError(false);
  }, [product.id, product.image, product.sizes, product.colors]);

  const currentIdx = Math.max(0, galleryImages.indexOf(activeImage));

  const handleSelectColor = (color: ProductColor, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedColor(color);
    setImageError(false);
    const linkedPhoto = color.image || galleryImages[idx] || product.image;
    if (linkedPhoto) {
      setActiveImage(linkedPhoto);
    }
  };

  const handleCycleImage = (dir: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (galleryImages.length <= 1) return;
    setImageError(false);
    const nextIdx = (currentIdx + dir + galleryImages.length) % galleryImages.length;
    setActiveImage(galleryImages[nextIdx]);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product, selectedSize, selectedColor);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const telegramOrderUrl = `${STORE_INFO.telegramUrl}?text=${encodeURIComponent(
    `សួស្តី ${STORE_INFO.name}! ខ្ញុំចង់កុម្ម៉ង់ទំនិញ Pre-order:\n- ឈ្មោះទំនិញ៖ ${product.nameKh} (${product.code})\n- តម្លៃ៖ ${formatUsd(product.priceUsd)} (${formatKhr(product.priceUsd)})\n- ទំហំ៖ ${selectedSize}\n- ពណ៌៖ ${selectedColor.name}${
      product.sourceUrl ? `\n- លីងទំនិញ៖ ${product.sourceUrl}` : ''
    }\n\nតើខ្ញុំអាចទូទាត់ប្រាក់កក់តាម ABA Bank ឥឡូវនេះបានទេ?`
  )}`;

  return (
    <div
      onClick={() => onViewDetails(product)}
      className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden hover:border-stone-300 hover:shadow-[0_14px_34px_rgba(17,17,19,0.06)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      {/* Portrait Editorial Gallery Frame */}
      <div className="relative aspect-[4/5] w-full bg-[#F4F2EE] overflow-hidden">
        {!imageError ? (
          <img
            src={activeImage || product.image}
            alt={product.nameKh}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F4F2EE] text-stone-400 p-4">
            <ShoppingBag className="w-9 h-9 mb-2 opacity-40" />
            <span className="text-xs text-stone-500 font-medium text-center line-clamp-2">{product.nameKh}</span>
          </div>
        )}

        {/* Single Frosted Corner Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-[#111113]/85 backdrop-blur-md text-[#E6D5B8] text-[9px] sm:text-[10px] font-ui font-semibold tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase">
            {product.badge || 'Pre-Order'}
          </span>
        </div>

        {/* Multi-Photo Counter Tag */}
        {galleryImages.length > 1 && (
          <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md text-[#111113] text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded-md border border-stone-200/70 inline-flex items-center gap-1">
            <Images className="w-2.5 h-2.5 text-[#B8924A]" />
            <span>{currentIdx + 1}/{galleryImages.length}</span>
          </div>
        )}

        {/* Desktop Quick Gallery Prev/Next Arrows */}
        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => handleCycleImage(-1, e)}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#111113] shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="រូបមុន"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => handleCycleImage(1, e)}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#111113] shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="រូបបន្ទាប់"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom Subtle Dots Indicator when multi-photo */}
        {galleryImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/35 backdrop-blur-xs px-2 py-1 rounded-full">
            {galleryImages.slice(0, 6).map((imgUrl, idx) => (
              <button
                key={`${imgUrl.slice(0, 20)}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageError(false);
                  setActiveImage(imgUrl);
                }}
                aria-label={`Photo ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  activeImage === imgUrl ? 'w-3.5 bg-[#E6D5B8]' : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2">
        <div className="space-y-1.5">
          {/* Interactive Color Swatches Row (Click switches card photo!) */}
          {product.colors.length > 0 && (
            <div
              className="flex items-center justify-between gap-1.5 min-h-[26px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.colors.slice(0, 5).map((color, idx) => {
                  const isActive = selectedColor.name === color.name;
                  return (
                    <button
                      key={`${color.name}-${idx}`}
                      type="button"
                      onClick={(e) => handleSelectColor(color, idx, e)}
                      title={`ពណ៌ ${color.name}`}
                      aria-label={`ជ្រើសរើសពណ៌ ${color.name}`}
                      className={`w-5 h-5 rounded-full transition-all flex items-center justify-center ${
                        isActive
                          ? 'ring-1.5 ring-[#111113] ring-offset-2 scale-105'
                          : 'ring-1 ring-stone-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
                {product.colors.length > 5 && (
                  <span className="text-[10px] font-ui text-stone-400">+{product.colors.length - 5}</span>
                )}
              </div>
              <span className="hidden sm:inline text-[10px] text-stone-400 font-ui truncate max-w-[95px]">
                {selectedColor.name}
              </span>
            </div>
          )}

          {/* Category + Rating */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500">
            <span className="font-semibold text-[#8C6A2E] truncate">{product.categoryKh}</span>
            <div className="flex items-center gap-0.5 text-amber-500 font-ui font-semibold shrink-0">
              <Star className="w-3 h-3 fill-[#C9A45C] text-[#C9A45C]" />
              <span className="text-stone-700">{product.rating}</span>
            </div>
          </div>

          {/* Product Title */}
          <div>
            <h3 className="font-bold text-[#111113] text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-[#8C6A2E] transition-colors">
              {product.nameKh}
            </h3>
            <p className="hidden sm:block text-[11px] text-stone-400 font-ui line-clamp-1 mt-0.5">
              {product.nameEn}
            </p>
          </div>

          {/* Pricing */}
          <div className="pt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-lg font-extrabold text-[#111113] tabular-nums font-ui">
              {formatUsd(product.priceUsd)}
            </span>
            {product.originalPriceUsd && (
              <span className="text-[10px] sm:text-xs text-stone-400 line-through tabular-nums font-ui">
                {formatUsd(product.originalPriceUsd)}
              </span>
            )}
            <span className="hidden sm:inline text-[11px] text-stone-500 tabular-nums ml-auto font-ui font-medium">
              ≈ {formatKhr(product.priceUsd)}
            </span>
          </div>

          {/* Compact Desktop Size Selector (Hidden on narrow mobile cards for clean scanning) */}
          <div className="hidden sm:block pt-2 border-t border-stone-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap gap-1">
              {product.sizes.slice(0, 3).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`px-2 py-0.5 text-[10px] font-ui font-medium rounded-md border transition-colors whitespace-nowrap ${
                    selectedSize === size
                      ? 'bg-[#111113] text-white border-[#111113]'
                      : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {size.split(' ')[0]}
                </button>
              ))}
              {product.sizes.length > 3 && (
                <span className="text-[10px] text-stone-400 self-center font-ui">
                  +{product.sizes.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-stone-100" onClick={(e) => e.stopPropagation()}>
          {/* Mobile: Single Full-Width Spacious Button (No Cramped Text Truncation) */}
          <button
            type="button"
            onClick={handleAdd}
            className={`sm:hidden w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition active:scale-[0.98] ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-[#111113] text-white hover:bg-neutral-800'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>បានដាក់ចូល ✓</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-[#E6D5B8]" />
                <span>ដាក់កន្ត្រក</span>
              </>
            )}
          </button>

          {/* Desktop: Clean 2-Button Action Lockup */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-2">
            <a
              href={telegramOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition active:scale-95"
              title="កម្ម៉ង់ផ្ទាល់តាម Telegram"
            >
              <Send className="w-3.5 h-3.5 text-sky-600" />
              <span>Telegram</span>
            </a>

            <button
              type="button"
              onClick={handleAdd}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-2.5 text-xs font-semibold rounded-xl transition active:scale-95 ${
                isAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#111113] text-white hover:bg-neutral-800'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>បានដាក់</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-[#E6D5B8]" />
                  <span>ដាក់កន្ត្រក</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
