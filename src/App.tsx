import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingBag, Send, Phone, Check, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { PRODUCTS, Product, ProductColor, STORE_INFO } from './data/products';
import { CartItem } from './types/cart';
import { Order, StoreSettings } from './types/store';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { TrackOrderModal } from './components/TrackOrderModal';
import { AdminPanel } from './components/AdminPanel';
import { AbaPaymentModal } from './components/AbaPaymentModal';
import { AbaPaymentSection } from './components/AbaPaymentSection';
import { ProcessGuide } from './components/ProcessGuide';
import { Footer } from './components/Footer';
import { FloatingActions } from './components/FloatingActions';
import { subscribeStoreProducts, subscribeStorePublicSettings } from './lib/storeFirestore';

export default function App() {
  // Products and Settings from Backend
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS);
  const [storeSettings, setStoreSettings] = useState<Partial<StoreSettings>>({});

  // Category & Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating'>('default');

  // Modals & Drawers state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [trackInitialQuery, setTrackInitialQuery] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAbaModalOpen, setIsAbaModalOpen] = useState(false);
  const [abaPaymentConfig, setAbaPaymentConfig] = useState<{ amount?: number; desc?: string }>({});

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cart state with localStorage persistence
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('s疾患_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User's recent orders stored locally in browser storage
  const [recentOrders, setRecentOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('mspn_local_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartInitialTab, setCartInitialTab] = useState<'cart' | 'history'>('cart');

  useEffect(() => {
    try {
      localStorage.setItem('s疾患_cart', JSON.stringify(cartItems));
    } catch {
      // Ignore write errors
    }
  }, [cartItems]);

  const saveRecentOrders = (orders: Order[]) => {
    setRecentOrders(orders);
    try {
      localStorage.setItem('mspn_local_orders', JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders to localStorage', e);
    }
  };

  const handleAddRecentOrder = (order: Order) => {
    const updated = [order, ...recentOrders.filter((o) => o.id !== order.id)];
    saveRecentOrders(updated);
  };

  const handleRemoveRecentOrder = (orderId: string) => {
    const updated = recentOrders.filter((o) => o.id !== orderId);
    saveRecentOrders(updated);
    showToast('បានលុបការកុម្ម៉ង់ចេញពីប្រវត្តិ');
  };

  const handleClearRecentOrders = () => {
    saveRecentOrders([]);
    showToast('បានសម្អាតប្រវត្តិបញ្ជាទិញទាំងអស់');
  };

  const handleRefreshRecentOrders = async () => {
    if (recentOrders.length === 0) return;
    try {
      const updated = await Promise.all(
        recentOrders.map(async (ord) => {
          try {
            const res = await fetch(`/api/orders/track?q=${encodeURIComponent(ord.id)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.orders && data.orders.length > 0) {
                return data.orders[0] as Order;
              }
            }
          } catch {
            // retain existing order if offline
          }
          return ord;
        })
      );
      saveRecentOrders(updated);
      showToast('បានធ្វើបច្ចុប្បន្នភាពស្ថានភាពការកុម្ម៉ង់!');
    } catch (err) {
      console.error(err);
    }
  };

  const [isFirestoreCatalogActive, setIsFirestoreCatalogActive] = useState(false);

  // Fetch live products and settings (Firestore is authoritative once initialized)
  const refreshStoreData = async () => {
    try {
      const [prodRes, setRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      if (!isFirestoreCatalogActive && prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData.products)) {
          setProductsList(prodData.products);
        }
      }

      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.settings) {
          setStoreSettings((prev) => ({ ...setData.settings, ...prev }));
        }
      }
    } catch {
      console.log('Using local fallback product dataset');
    }
  };

  useEffect(() => {
    refreshStoreData();

    const unsubProducts = subscribeStoreProducts((liveProducts, initialized) => {
      setIsFirestoreCatalogActive(initialized);
      if (initialized) {
        setProductsList(liveProducts);
      }
    });

    const unsubSettings = subscribeStorePublicSettings((publicSettings) => {
      setStoreSettings((prev) => ({ ...prev, ...publicSettings }));
    });

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add to cart handler
  const handleAddToCart = (
    product: Product,
    size: string,
    color: ProductColor,
    quantity = 1
  ) => {
    const itemId = `${product.id}-${size}-${color.name}`;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing) {
        return prev.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { id: itemId, product, selectedSize: size, selectedColor: color, quantity }];
    });
    showToast(`បានបញ្ចូល "${product.nameKh}" ទៅក្នុងកន្ត្រក!`);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: newQuantity } : i)));
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOpenAbaModal = (amount?: number, desc?: string) => {
    setAbaPaymentConfig({ amount, desc });
    setIsAbaModalOpen(true);
  };

  // View details
  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  // Direct ABA payment from product card / modal
  const handleDirectAbaPay = (
    product: Product,
    size: string,
    color: ProductColor,
    quantity: number
  ) => {
    setIsDetailModalOpen(false);
    handleOpenAbaModal(
      product.priceUsd * quantity,
      `${product.nameKh} (ទំហំ ${size}, ពណ៌ ${color.name}) ចំនួន ${quantity}`
    );
  };

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return productsList
      .filter((p) => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.nameKh.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.categoryKh.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.priceUsd - b.priceUsd;
        if (sortBy === 'price-desc') return b.priceUsd - a.priceUsd;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [productsList, selectedCategory, searchQuery, sortBy]);

  // Dynamic categories derived automatically from products in store
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, string>();
    const preferredOrder = ['clothing', 'shoes', 'belts', 'watch', 'accessories'];
    const labels: Record<string, string> = {
      clothing: 'ខោអាវ',
      shoes: 'ស្បែកជើង',
      belts: 'ខ្សែក្រវ៉ាត់',
      watch: 'នាឡិកា',
      accessories: 'គ្រឿងតុបតែង',
    };

    preferredOrder.forEach((id) => {
      if (productsList.some((p) => p.category === id)) {
        map.set(id, labels[id]);
      }
    });

    productsList.forEach((p) => {
      if (p.category && !map.has(p.category)) {
        map.set(p.category, p.categoryKh || p.category);
      }
    });

    return [
      { id: 'all', labelKh: 'ទាំងអស់' },
      ...Array.from(map.entries()).map(([id, labelKh]) => ({ id, labelKh })),
    ];
  }, [productsList]);

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToProducts = () => {
    const el = document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'តើទំនិញ Pre-Order ត្រូវរង់ចាំប៉ុន្មានថ្ងៃទើបមកដល់?',
      a: 'ទំនិញ Pre-Order នាំចូលដោយផ្ទាល់ពីប្រទេសចិន (ក្វាងចូវ/សៀងហៃ) មកដល់រាជធានីភ្នំពេញក្នុងរយៈពេល ៧ ទៅ ១៤ ថ្ងៃ។ នៅពេលទំនិញមកដល់ យើងនឹងវេចខ្ចប់ផ្ញើជូនភ្លាមៗ។',
    },
    {
      q: 'តើខ្ញុំអាចបញ្ជាទិញលើវេបសាយដោយរបៀបណា?',
      a: 'អ្នកគ្រាន់តែជ្រើសរើសទំនិញ ដាក់ចូលកន្ត្រក រួចចុច "បញ្ជាទិញលើវេបសាយ"។ បំពេញឈ្មោះ លេខទូរសព្ទ ទីតាំង និងស្កេនភ្ជាប់វិក្កយបត្រ ABA Slip ជាការស្រេច។ ប្រព័ន្ធនឹងផ្ញើសារដំណឹងទៅកាន់ Telegram Bot របស់ហាងភ្លាមៗ។',
    },
    {
      q: 'តើខ្ញុំត្រូវកក់ប្រាក់ប៉ុន្មានភាគរយ?',
      a: 'ដើម្បីធានាការកុម្ម៉ង់ អតិថិជនអាចជ្រើសរើសកក់ប្រាក់ ៥០% ឬទូទាត់ពេញ ១០០% តាមរយៈ ABA Bank (SOPANHA MEACH)។ បន្ទាប់ពីទូទាត់រួច សូមភ្ជាប់ Slip ក្នុងវេបសាយ ឬផ្ញើមកកាន់ Telegram @H963666615។',
    },
    {
      q: 'តើមានសេវាផ្ញើទៅតាមបណ្តាខេត្តទេ?',
      a: 'មាន! យើងខ្ញុំសហការជាមួយក្រុមហ៊ុនដឹកជញ្ជូនឈានមុខគេដូចជា វីរៈប៊ុនថាំ (VET), J&T Express និងដឹកជញ្ជូនតាម Grab ក្នុងរាជធានីភ្នំពេញ ដឹកជញ្ជូនដល់ ២៥ ខេត្ត-ក្រុង។',
    },
    {
      q: 'ប្រសិនបើទំហំ (Size) ឬពណ៌មិនត្រូវ តើអាចប្តូរបានទេ?',
      a: 'ក្រុមការងារយើងនឹងផ្ទៀងផ្ទាត់ទំហំ ទម្ងន់ និងកម្ពស់របស់អ្នកយ៉ាងម៉ត់ចត់មុននឹងកម្ម៉ង់ទៅខាងចិន។ ប្រសិនបើទំនិញមកដល់មានកំហុសឆ្គងពីខាងហាង ឬមានការខូចខាត យើងខ្ញុំនឹងទទួលខុសត្រូវដោះស្រាយជូនភ្លាមៗ។',
    },
  ];

  // Open Track Order modal
  const handleOpenTrackOrder = (initialQ = '') => {
    setTrackInitialQuery(initialQ);
    setIsTrackOrderOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col text-[#111113]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#111113] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-stone-700 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-[#E6D5B8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => {
          setCartInitialTab('cart');
          setIsCartOpen(true);
        }}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          scrollToProducts();
        }}
        activeCategory={selectedCategory}
        categories={dynamicCategories}
        onOpenAbaModal={() => handleOpenAbaModal()}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenTrackOrder={() => handleOpenTrackOrder()}
        bannerText={storeSettings.bannerText}
        storeName={storeSettings.storeName}
      />

      {/* Hero Campaign */}
      <Hero
        onScrollToProducts={scrollToProducts}
        onOpenAbaModal={() => handleOpenAbaModal()}
        onOpenTrackOrder={() => handleOpenTrackOrder()}
      />

      {/* Main Catalog Section (Placed directly below Hero for rapid mobile & desktop browsing) */}
      <main id="products" className="max-w-6xl mx-auto px-3 sm:px-6 py-8 sm:py-14 flex-1 w-full">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 font-ui text-[11px] font-semibold text-[#8C6A2E] uppercase tracking-[0.2em] mb-1">
              <span>Catalog Collection</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span className="text-stone-400 font-normal">Guangzhou Atelier</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-[#111113]">
              ទំនិញ Pre-Order ពេញនិយម
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              ចុចលើពណ៌ដើម្បីមើលរូបភាពតាមពណ៌ ឬចុចលើទំនិញដើម្បីមើលរូបភាពគ្រប់ជ្រុង
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកតាមឈ្មោះ ឬកូដ (MSPN-...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 h-10 text-xs bg-white rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#111113] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#111113] text-xs font-bold p-1"
                aria-label="សម្អាតការស្វែងរក"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Luxury Filter & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-1.5 bg-[#F4F2EE] rounded-2xl mb-6 sm:mb-8 border border-stone-200/80">
          {/* Interactive Dynamic Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {dynamicCategories.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  selectedCategory === tab.id
                    ? 'bg-[#111113] text-[#E6D5B8] shadow-xs'
                    : 'text-stone-600 hover:text-[#111113] hover:bg-white/60'
                }`}
              >
                {tab.labelKh}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center justify-between sm:justify-end gap-2 px-2 pb-1 sm:pb-0 text-xs">
            <span className="text-stone-500 whitespace-nowrap">តម្រៀប៖</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-stone-200 text-[#111113] text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="default">ពេញនិយមបំផុត</option>
              <option value="price-asc">តម្លៃទាប ទៅ ខ្ពស់</option>
              <option value="price-desc">តម្លៃខ្ពស់ ទៅ ទាប</option>
              <option value="rating">ពិន្ទុវាយតម្លៃខ្ពស់</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-bold text-[#111113] text-base mb-1">មិនមានទំនិញត្រូវនឹងការស្វែងរកទេ</h3>
            <p className="text-xs text-stone-500 mb-4">
              សូមព្យាយាមស្វែងរកពាក្យផ្សេង ឬជ្រើសរើសប្រភេទផលិតផល "ទាំងអស់" ឡើងវិញ។
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#111113] text-white rounded-xl text-xs font-semibold"
            >
              បង្ហាញទំនិញទាំងអស់
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(prod, size, col) => handleAddToCart(prod, size, col, 1)}
                onViewDetails={handleViewDetails}
                onDirectPay={(prod) => handleOpenAbaModal(prod.priceUsd, prod.nameKh)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 4-Step Pre-Order Process Guide (Positioned cleanly below Catalog) */}
      <ProcessGuide />

      {/* On-Page Dedicated ABA Bank Payment Section */}
      <AbaPaymentSection />

      {/* FAQ & Trust Q&A Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-t border-stone-200">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="font-ui text-[11px] font-semibold text-[#8C6A2E] uppercase tracking-[0.22em]">
              Client Care · FAQ
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111113] mt-1.5">
              ព័ត៌មានលម្អិតអំពីការកុម្ម៉ង់ Pre-Order
            </h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, index) => (
              <div
                key={faq.q}
                className="border border-stone-200 rounded-2xl overflow-hidden bg-[#FAF9F6] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-[#111113] hover:text-[#8C6A2E] transition"
                >
                  <span>{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-stone-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 pt-2 text-xs text-stone-600 leading-relaxed border-t border-stone-200/60 font-ui bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer
        categories={dynamicCategories}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          scrollToProducts();
        }}
        onOpenAbaModal={() => handleOpenAbaModal()}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenTrackOrder={() => handleOpenTrackOrder()}
        onOpenOrderHistory={() => {
          setCartInitialTab('history');
          setIsCartOpen(true);
        }}
      />

      {/* Floating Action Buttons */}
      <FloatingActions />

      {/* Modals & Slideouts */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleAddToCart}
        onDirectAbaPay={handleDirectAbaPay}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        recentOrders={recentOrders}
        initialTab={cartInitialTab}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOpenAbaPay={(total, desc) => {
          setIsCartOpen(false);
          handleOpenAbaModal(total, desc);
        }}
        onOpenCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onTrackOrder={(orderId) => {
          setIsCartOpen(false);
          handleOpenTrackOrder(orderId);
        }}
        onRemoveOrderHistory={handleRemoveRecentOrder}
        onClearOrderHistory={handleClearRecentOrders}
        onRefreshOrderHistory={handleRefreshRecentOrders}
      />

      {/* Direct In-Website Checkout Modal (with Telegram Bot alert) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderSuccess={(order) => {
          handleClearCart();
          handleAddRecentOrder(order);
          showToast(`ការបញ្ជាទិញ #${order.id} ទទួលបានជោគជ័យ!`);
        }}
        onTrackOrder={(orderId) => handleOpenTrackOrder(orderId)}
      />

      {/* Public Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
        initialQuery={trackInitialQuery}
      />

      {/* Admin Panel (Order manager, product manager, telegram bot & store settings) */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefreshData={refreshStoreData}
      />

      {/* ABA KHQR Modal */}
      <AbaPaymentModal
        isOpen={isAbaModalOpen}
        onClose={() => setIsAbaModalOpen(false)}
        amountUsd={abaPaymentConfig.amount}
        orderDescription={abaPaymentConfig.desc}
      />
    </div>
  );
}
