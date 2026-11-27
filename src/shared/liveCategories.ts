import { C } from './design';

export type LiveHomeCategory = {
  slug: string;
  screen: string;
  icon: string;
  name: string;
  color: string;
};

export type LiveStoreCategory = {
  key: string;
  apiCategory: string;
  icon: string;
  name: string;
};

export type LiveFeedCategory = {
  slug: string;
  name: string;
  icon: string;
};

const LIVE_CATEGORY_ITEMS = [
  { key: 'women', apiCategory: 'fashion', icon: 'woman', name: 'Эмэгтэй', color: C.brand, screen: '/store' },
  { key: 'men', apiCategory: 'fashion', icon: 'man', name: 'Эрэгтэй', color: C.primary, screen: '/store' },
  { key: 'beauty-health', apiCategory: 'beauty-health', icon: 'sparkles', name: 'Гоо сайхан', color: C.error, screen: '/store' },
  { key: 'home-decor', apiCategory: 'home-living', icon: 'home', name: 'Гэр декор', color: C.success, screen: '/store' },
  { key: 'real-estate', apiCategory: 'real-estate-feed', icon: 'business', name: 'Үл хөдлөх', color: C.store, screen: '/store' },
  { key: 'new-buildings', apiCategory: 'real-estate-feed', icon: 'business-outline', name: 'Шинэ төсөл', color: C.seller, screen: '/store' },
  { key: 'vehicles', apiCategory: 'auto-moto', icon: 'car', name: 'Машин', color: C.driver, screen: '/store' },
  { key: 'jewelry', apiCategory: 'fashion', icon: 'diamond', name: 'Гоёл', color: C.gold, screen: '/store' },
  { key: 'kids-toys', apiCategory: 'kids-toys', icon: 'happy', name: 'Хүүхдийн', color: C.seller, screen: '/store' },
  { key: 'adult', apiCategory: 'beauty-health', icon: 'shield', name: '18+', color: C.textSub, screen: '/store' },
  { key: 'health-vitamins', apiCategory: 'beauty-health', icon: 'medical', name: 'Эрүүл мэнд', color: C.success, screen: '/store' },
  { key: 'phones', apiCategory: 'electronics', icon: 'phone-portrait', name: 'Утас', color: C.primary, screen: '/store' },
  { key: 'technology', apiCategory: 'electronics', icon: 'hardware-chip', name: 'Технологи', color: C.primary, screen: '/store' },
  { key: 'gifts-hobby', apiCategory: 'fashion', icon: 'gift', name: 'Бэлэг', color: C.error, screen: '/store' },
  { key: 'furniture', apiCategory: 'home-living', icon: 'bed', name: 'Тавилга', color: C.store, screen: '/store' },
  { key: 'appliances', apiCategory: 'electronics', icon: 'flash', name: 'Цахилгаан', color: C.seller, screen: '/store' },
  { key: 'auto-parts', apiCategory: 'auto-moto', icon: 'construct', name: 'Авто сэлбэг', color: C.herder, screen: '/store' },
  { key: 'books-stationery', apiCategory: 'books', icon: 'book', name: 'Ном', color: C.store, screen: '/store' },
  { key: 'construction-tools', apiCategory: 'construction', icon: 'business', name: 'Барилга', color: C.gold, screen: '/store' },
  { key: 'travel', apiCategory: 'sports-travel', icon: 'airplane', name: 'Аялал', color: C.primary, screen: '/store' },
  { key: 'sports', apiCategory: 'sports-travel', icon: 'football', name: 'Спорт', color: C.seller, screen: '/store' },
  { key: 'food-beverage', apiCategory: 'food', icon: 'fast-food', name: 'Хүнс', color: C.seller, screen: '/store' },
  { key: 'esports', apiCategory: 'digital', icon: 'game-controller', name: 'E-Спорт', color: C.primary, screen: '/store' },
  { key: 'pets-plants', apiCategory: 'home-living', icon: 'leaf', name: 'Амьтан ургамал', color: C.herder, screen: '/store' },
  { key: 'digital-goods', apiCategory: 'digital', icon: 'desktop', name: 'Дижитал', color: C.primary, screen: '/store' },
  { key: 'education-training', apiCategory: 'digital', icon: 'school', name: 'Сургалт', color: C.primary, screen: '/store' },
  { key: 'beauty-services', apiCategory: 'services-feed', icon: 'cut', name: 'Гоо үйлчилгээ', color: C.error, screen: '/store' },
  { key: 'tech-it-services', apiCategory: 'services-feed', icon: 'code-slash', name: 'IT үйлчилгээ', color: C.primary, screen: '/store' },
  { key: 'professional-consulting', apiCategory: 'services-feed', icon: 'chatbubbles', name: 'Зөвлөх', color: C.herder, screen: '/store' },
  { key: 'auto-services', apiCategory: 'services-feed', icon: 'car-sport', name: 'Авто үйлчилгээ', color: C.driver, screen: '/store' },
  { key: 'repair-services', apiCategory: 'services-feed', icon: 'hammer', name: 'Засвар', color: C.seller, screen: '/store' },
  { key: 'printing-services', apiCategory: 'services-feed', icon: 'print', name: 'Хэвлэл', color: C.textSub, screen: '/store' },
  { key: 'manufacturing-custom', apiCategory: 'services-feed', icon: 'cube', name: 'Захиалгат', color: C.seller, screen: '/store' },
  { key: 'photo-video', apiCategory: 'services-feed', icon: 'camera', name: 'Зураг авалт', color: C.primary, screen: '/store' },
  { key: 'design-creative', apiCategory: 'digital', icon: 'color-palette', name: 'Дизайн', color: C.error, screen: '/store' },
] as const;

export const LIVE_HOME_CATEGORIES: LiveHomeCategory[] = LIVE_CATEGORY_ITEMS.map((item) => ({
  slug: item.key,
  screen: '/store',
  icon: item.icon,
  name: item.name,
  color: item.color,
}));

export const LIVE_STORE_CATEGORIES: LiveStoreCategory[] = [
  { key: '', apiCategory: '', icon: 'grid', name: 'Бүгд' },
  ...LIVE_CATEGORY_ITEMS.map((item) => ({
    key: item.key,
    apiCategory: item.apiCategory,
    icon: item.icon,
    name: item.name,
  })),
];

export const LIVE_FEED_CATEGORIES: LiveFeedCategory[] = [
  { slug: '', name: 'Бүгд', icon: 'grid' },
  { slug: 'electronics', name: 'Электроник', icon: 'phone-portrait' },
  { slug: 'fashion', name: 'Хувцас', icon: 'shirt' },
  { slug: 'home-living', name: 'Гэр', icon: 'home' },
  { slug: 'beauty-health', name: 'Гоо', icon: 'sparkles' },
  { slug: 'kids-toys', name: 'Хүүхдийн', icon: 'happy' },
  { slug: 'sports-travel', name: 'Спорт', icon: 'football' },
  { slug: 'food', name: 'Хоол', icon: 'fast-food' },
  { slug: 'auto-moto', name: 'Авто', icon: 'car' },
  { slug: 'construction', name: 'Барилга', icon: 'business' },
  { slug: 'digital', name: 'Дижитал', icon: 'desktop' },
  { slug: 'books', name: 'Ном', icon: 'book' },
  { slug: 'coins', name: 'Зоос', icon: 'disc' },
  { slug: 'pets-plants', name: 'Амьтан', icon: 'leaf' },
  { slug: 'art', name: 'Урлаг', icon: 'color-palette' },
  { slug: 'agriculture', name: 'Хөдөө', icon: 'flower' },
  { slug: 'office', name: 'Оффис', icon: 'briefcase' },
];

export const LIVE_FEED_POST_CATEGORIES = LIVE_FEED_CATEGORIES.filter((category) => category.slug);

export const LIVE_SEARCH_KEYWORDS = ['iPhone', 'Nike', 'Samsung', 'Хувцас', 'Зурагт'];

const LIVE_CATEGORY_ALIASES: Record<string, string> = {
  'real-estate-feed': 'real-estate',
  'new-projects': 'new-buildings',
  cars: 'vehicles',
  health: 'health-vitamins',
  gifts: 'gifts-hobby',
  books: 'books-stationery',
  construction: 'construction-tools',
  'sports-travel': 'sports',
  food: 'food-beverage',
  digital: 'digital-goods',
  training: 'education-training',
  'beauty-service': 'beauty-services',
  'it-service': 'tech-it-services',
  consulting: 'professional-consulting',
  'auto-service': 'auto-services',
  repair: 'repair-services',
  printing: 'printing-services',
  'custom-order': 'manufacturing-custom',
  photo: 'photo-video',
  design: 'design-creative',
};

export function resolveLiveCategoryKey(value?: string) {
  if (!value) return '';
  const normalized = LIVE_CATEGORY_ALIASES[value] ?? value;
  return LIVE_STORE_CATEGORIES.find((category) => category.key === normalized)?.key
    ?? LIVE_STORE_CATEGORIES.find((category) => category.apiCategory === normalized)?.key
    ?? normalized;
}
