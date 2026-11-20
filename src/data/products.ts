export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface Product {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  category: string;
  categoryKh: string;
  priceUsd: number;
  originalPriceUsd?: number;
  image: string;
  images?: string[];
  sourceUrl?: string;
  badge?: string;
  sizes: string[];
  colors: ProductColor[];
  descriptionKh: string;
  rating: number;
  reviewCount: number;
}

export const PRODUCTS: Product[] = [
  {
    id: 'p-1',
    code: 'MSPN-TS01',
    nameKh: 'អាវយឺតដៃខ្លី Streetwear ម៉ូដថ្មី Heavy Cotton',
    nameEn: 'Urban Archive Heavyweight T-Shirt',
    category: 'clothing',
    categoryKh: 'ខោអាវ',
    priceUsd: 12.0,
    originalPriceUsd: 16.0,
    image: '/src/assets/images/product_tshirt_streetwear_1794414887323.jpg',
    images: [
      '/src/assets/images/product_tshirt_streetwear_1794414887323.jpg',
      '/src/assets/images/product_tshirt_chalk_white_1794831962175.jpg',
      '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
    ],
    badge: 'ពេញនិយមខ្លាំង',
    sizes: ['M (45-55kg)', 'L (55-65kg)', 'XL (65-75kg)', '2XL (75-88kg)'],
    colors: [
      {
        name: 'Washed Black',
        hex: '#262626',
        image: '/src/assets/images/product_tshirt_streetwear_1794414887323.jpg',
      },
      {
        name: 'Chalk White',
        hex: '#f5f5f4',
        image: '/src/assets/images/product_tshirt_chalk_white_1794831962175.jpg',
      },
      {
        name: 'Sage Olive',
        hex: '#606c5d',
        image: '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
      },
    ],
    descriptionKh: 'សាច់ក្រណាត់កប្បាស Cotton 100% កម្រាស់ 260g ទន់ត្រជាក់ មិនយារ មិនចេញពណ៌ ម៉ូដទាន់សម័យបែប Streetwear Unisex ពាក់បានទាំងប្រុសទាំងស្រី។',
    rating: 4.9,
    reviewCount: 38,
  },
  {
    id: 'p-2',
    code: 'MSPN-SN02',
    nameKh: 'ស្បែកជើងប៉ាតា Sneaker Sport ស្រាលស្រួលជើង',
    nameEn: 'Aesthetic Runner Sport Sneakers',
    category: 'shoes',
    categoryKh: 'ស្បែកជើង',
    priceUsd: 25.0,
    originalPriceUsd: 32.0,
    image: '/src/assets/images/product_sneakers_sport_1794414888593.jpg',
    images: [
      '/src/assets/images/product_sneakers_sport_1794414888593.jpg',
      '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
    ],
    badge: 'លក់ដាច់បំផុត',
    sizes: ['39', '40', '41', '42', '43', '44'],
    colors: [
      {
        name: 'Grey / Chalk White',
        hex: '#e2e8f0',
        image: '/src/assets/images/product_sneakers_sport_1794414888593.jpg',
      },
      {
        name: 'Panda Black & White',
        hex: '#1e293b',
        image: '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
      },
    ],
    descriptionKh: 'បាតទន់ស្វិត បច្ចេកវិទ្យាខ្យល់ Cushion ដើររត់មិនឈឺជើង ទម្ងន់ស្រាល ងាយស្រួលពាក់ដើរលេង ធ្វើការ ឬហាត់ប្រាណ រចនាបថទាន់សម័យ។',
    rating: 4.8,
    reviewCount: 52,
  },
  {
    id: 'p-3',
    code: 'MSPN-BT03',
    nameKh: 'ខ្សែក្រវ៉ាត់ស្បែកបុរស ប្រណិត ក្បាលដែកមិនច្រេះ',
    nameEn: 'Forge & Anvil Genuine Leather Belt',
    category: 'belts',
    categoryKh: 'ខ្សែក្រវ៉ាត់',
    priceUsd: 9.5,
    originalPriceUsd: 14.0,
    image: '/src/assets/images/product_leather_belt_1794414888555.jpg',
    images: [
      '/src/assets/images/product_leather_belt_1794414888555.jpg',
    ],
    badge: 'គុណភាពខ្ពស់',
    sizes: ['110cm (ចង្កេះ 28-32)', '115cm (ចង្កេះ 32-35)', '125cm (ចង្កេះ 35-39)'],
    colors: [
      {
        name: 'Rich Brown',
        hex: '#4a2c1b',
        image: '/src/assets/images/product_leather_belt_1794414888555.jpg',
      },
      {
        name: 'Classic Black',
        hex: '#18181b',
        image: '/src/assets/images/product_leather_belt_1794414888555.jpg',
      },
    ],
    descriptionKh: 'ស្បែកគោសុទ្ធគុណភាពល្អ ជាប់ធន់មិនងាយបាក់ ក្បាលដែក Brushed Titanium រឹងមាំ មិនរបក មិនច្រេះ ត្រូវនឹងខោខូវប៊យ និងខោសាច់ក្រណាត់ធ្វើការ។',
    rating: 4.9,
    reviewCount: 44,
  },
  {
    id: 'p-4',
    code: 'SPH-JN04',
    nameKh: 'ខោខូវប៊យ Selvedge Denim ម៉ូដពេញនិយម',
    nameEn: 'Raw Selvedge Straight-Leg Jeans',
    category: 'clothing',
    categoryKh: 'ខោអាវ',
    priceUsd: 16.0,
    originalPriceUsd: 22.0,
    image: '/src/assets/images/product_denim_jeans_1794414888591.jpg',
    images: [
      '/src/assets/images/product_denim_jeans_1794414888591.jpg',
      '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
    ],
    badge: 'ពេញនិយម',
    sizes: ['29', '30', '31', '32', '34', '36'],
    colors: [
      {
        name: 'Deep Indigo Blue',
        hex: '#1e3a5f',
        image: '/src/assets/images/product_denim_jeans_1794414888591.jpg',
      },
      {
        name: 'Washed Light Blue',
        hex: '#60a5fa',
        image: '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
      },
    ],
    descriptionKh: 'សាច់ខូវប៊យក្រាស់ល្មម បត់ជើងស្រួល មានថ្នេរ Selvedge ក្រហមប្រណិត កាត់ដេរទម្រង់ជើងត្រង់ Straight Fit ពាក់ត្រូវរាង និងមើលទៅខ្ពស់។',
    rating: 4.7,
    reviewCount: 29,
  },
  {
    id: 'p-5',
    code: 'SPH-JK05',
    nameKh: 'អាវក្រៅ Streetwear Cargo Jacket សាច់ក្រណាត់ក្រាស់',
    nameEn: 'Tactical Utility Canvas Jacket',
    category: 'clothing',
    categoryKh: 'ខោអាវ',
    priceUsd: 24.0,
    originalPriceUsd: 30.0,
    image: '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
    images: [
      '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
      '/src/assets/images/product_tshirt_streetwear_1794414887323.jpg',
      '/src/assets/images/product_tshirt_chalk_white_1794831962175.jpg',
    ],
    badge: 'ម៉ូដថ្មី',
    sizes: ['M (48-58kg)', 'L (58-68kg)', 'XL (68-78kg)', '2XL (78-90kg)'],
    colors: [
      {
        name: 'Military Olive',
        hex: '#4b5320',
        image: '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
      },
      {
        name: 'Matte Black',
        hex: '#171717',
        image: '/src/assets/images/product_tshirt_streetwear_1794414887323.jpg',
      },
      {
        name: 'Safari Khaki',
        hex: '#c2b280',
        image: '/src/assets/images/product_tshirt_chalk_white_1794831962175.jpg',
      },
    ],
    descriptionKh: 'អាវក្រៅបែប Safari Tactical មានហោប៉ៅច្រើន ធន់នឹងការកកិត ការពារខ្យល់ និងកម្ដៅថ្ងៃ ម៉ូដយុវវ័យកំពុងពេញនិយមខ្លាំង។',
    rating: 4.9,
    reviewCount: 19,
  },
  {
    id: 'p-6',
    code: 'SPH-SN06',
    nameKh: 'ស្បែកជើងប៉ាតា Retro Skater Court Sneakers',
    nameEn: 'Retro Low-Top Skater Sneakers',
    category: 'shoes',
    categoryKh: 'ស្បែកជើង',
    priceUsd: 26.5,
    originalPriceUsd: 35.0,
    image: '/src/assets/images/product_sneakers_sport_1794414888593.jpg',
    images: ['/src/assets/images/product_sneakers_sport_1794414888593.jpg'],
    badge: 'ប្រណិត',
    sizes: ['39', '40', '41', '42', '43', '44'],
    colors: [
      {
        name: 'Vintage White & Grey',
        hex: '#d1d5db',
        image: '/src/assets/images/product_sneakers_sport_1794414888593.jpg',
      },
      { name: 'Classic Black/White', hex: '#111827' },
    ],
    descriptionKh: 'ស្បែកជើងប៉ាតាក Streetwear កាលីបខ្ពស់ ស្បែក Microfiber រលោងងាយស្រួលជូតសម្អាត ជ័របាតស្វិតមិនរអិល ពាក់បានគ្រប់កម្មវិធី។',
    rating: 4.8,
    reviewCount: 31,
  },
  {
    id: 'p-7',
    code: 'SPH-BT07',
    nameKh: 'ខ្សែក្រវ៉ាត់ស្បែក Automatic Ratchet Buckle ទំនើប',
    nameEn: 'Precision Ratchet Automatic Leather Belt',
    category: 'belts',
    categoryKh: 'ខ្សែក្រវ៉ាត់',
    priceUsd: 11.0,
    originalPriceUsd: 15.0,
    image: '/src/assets/images/product_leather_belt_1794414888555.jpg',
    images: ['/src/assets/images/product_leather_belt_1794414888555.jpg'],
    badge: 'ងាយស្រួលប្រើ',
    sizes: ['115cm (ចង្កេះ 28-34)', '125cm (ចង្កេះ 34-39)', '135cm (ចង្កេះ 39-44)'],
    colors: [
      { name: 'Onyx Black', hex: '#0f172a' },
      { name: 'Espresso Brown', hex: '#3e2723' },
    ],
    descriptionKh: 'ខ្សែក្រវ៉ាត់ក្បាលស្វ័យប្រវត្តិ មិនបាច់ចោះរន្ធ ចុចចាក់សោរ និងពន្លាតបានស្រួល ស្បែកទន់ជាប់ធន់ ក្បាលដែក Alloy ស្រោបការពារស្នាមឆ្កូត។',
    rating: 4.9,
    reviewCount: 27,
  },
  {
    id: 'p-8',
    code: 'SPH-AC08',
    nameKh: 'មួកខូវប៊យ Corduroy Streetwear & កាបូបស្ពាយតូច',
    nameEn: 'Corduroy Cap & Utility Crossbody Set',
    category: 'accessories',
    categoryKh: 'គ្រឿងតុបតែង',
    priceUsd: 8.5,
    originalPriceUsd: 12.0,
    image: '/src/assets/images/hero_fashion_collection_1794414887257.jpg',
    images: ['/src/assets/images/hero_fashion_collection_1794414887257.jpg'],
    badge: 'ពេញនិយម',
    sizes: ['Free Size (អាចសារ៉េបាន)'],
    colors: [
      { name: 'Corduroy Black', hex: '#1c1917' },
      { name: 'Dark Navy', hex: '#1e293b' },
      { name: 'Khaki Sand', hex: '#d6c7a1' },
    ],
    descriptionKh: 'មួកក្រណាត់ Corduroy សរសៃឆ្នូត ម៉ូដកាលីប រួមជាមួយកាបូបយួរតូចដាក់ទូរសព្ទ កាត និងលុយ ងាយស្រួលដើរលេងចុងសប្តាហ៍។',
    rating: 4.7,
    reviewCount: 22,
  },
  {
    id: 'p-9',
    code: 'MSPN-WT09',
    nameKh: 'នាឡិកាដៃប្រណិត Minimalist Chronograph Steel',
    nameEn: 'Aethel Chronograph Minimalist Watch',
    category: 'watch',
    categoryKh: 'នាឡិកា',
    priceUsd: 38.0,
    originalPriceUsd: 49.0,
    image: '/src/assets/images/product_luxury_watch_1794831962141.jpg',
    images: [
      '/src/assets/images/product_luxury_watch_1794831962141.jpg',
      '/src/assets/images/product_leather_belt_1794414888555.jpg',
    ],
    badge: 'Luxury Edition',
    sizes: ['40mm (បុរស-នារី)'],
    colors: [
      {
        name: 'Obsidian Gold & Steel',
        hex: '#b8924a',
        image: '/src/assets/images/product_luxury_watch_1794831962141.jpg',
      },
      {
        name: 'Classic Espresso Strap',
        hex: '#3e2723',
        image: '/src/assets/images/product_leather_belt_1794414888555.jpg',
      },
    ],
    descriptionKh: 'នាឡិកាដៃរចនាបថ Luxury Minimalist តួដែកអ៊ីណុក Brushed 316L ការពារទឹក 5ATM កញ្ចក់ Sapphire មិនងាយឆ្កូត ពាក់ទៅធ្វើការ ឬចូលរួមកម្មវិធីយ៉ាងថ្លៃថ្នូរ។',
    rating: 5.0,
    reviewCount: 18,
  },
];

export const STORE_INFO = {
  name: 'MSPN ONLINE STORE',
  taglineKh: 'Pre-Order ទំនិញពីប្រទេសចិន គុណភាពល្អ តម្លៃសមរម្យ',
  waitDays: '៧-១៤ ថ្ងៃ',
  ownerName: 'SOPANHA MEACH',
  usdAccount: '716 866 662',
  khrAccount: '008 155 018',
  telegramHandle: 'H963666615',
  telegramUrl: 'https://t.me/H963666615',
  phone1: '096 366 6615',
  phone1Raw: '0963666615',
  phone2: '071 686 6662',
  phone2Raw: '0716866662',
  deliveryKh: 'ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង (វីរៈប៊ុនថាំ, J&T, ឬ Grab)',
};

export const EXCHANGE_RATE = 4100;

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatKhr(amount: number): string {
  const khr = Math.round(amount * EXCHANGE_RATE);
  return `${khr.toLocaleString()} ៛`;
}
