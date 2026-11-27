/**
 * Зарын нарийн шүүлтүүр — вэбийн lib/listingFilters.ts-тэй ижил (API: m_<key>=утга).
 * Нэг загвар өөрчлөгдвөл хоёуланг нь шинэчил.
 */
export type FilterDef =
  | { key: string; label: string; kind: 'facet'; field: string }
  | { key: string; label: string; kind: 'select'; field: string; options: string[] }
  | { key: string; label: string; kind: 'min' | 'max'; field: string; placeholder?: string }
  | { key: string; label: string; kind: 'contains'; field: string; placeholder?: string };

const PRICE_FILTERS: FilterDef[] = [
  { key: 'priceMin', label: 'Үнэ (доод), ₮', kind: 'min', field: '__price', placeholder: '10000000' },
  { key: 'priceMax', label: 'Үнэ (дээд), ₮', kind: 'max', field: '__price', placeholder: '50000000' },
];

const LISTING_FILTERS: Record<string, FilterDef[]> = {
  vehicles: [
    { key: 'brand', label: 'Үйлдвэрлэгч', kind: 'facet', field: 'brand' },
    { key: 'model', label: 'Загвар', kind: 'contains', field: 'model', placeholder: 'Prius, Land Cruiser...' },
    { key: 'yearMin', label: 'Он (доод)', kind: 'min', field: 'year', placeholder: '2015' },
    { key: 'yearMax', label: 'Он (дээд)', kind: 'max', field: 'year', placeholder: '2025' },
    { key: 'mileageMax', label: 'Гүйлт (дээд), км', kind: 'max', field: 'mileage', placeholder: '150000' },
    { key: 'fuelType', label: 'Түлш', kind: 'select', field: 'fuelType', options: ['Бензин', 'Дизель', 'Хайбрид', 'Цахилгаан', 'Газ'] },
    { key: 'transmission', label: 'Хурдны хайрцаг', kind: 'select', field: 'transmission', options: ['Автомат', 'Механик', 'CVT'] },
    { key: 'drivetrain', label: 'Хөтлөгч', kind: 'select', field: 'drivetrain', options: ['4WD', 'AWD', 'FWD', 'RWD'] },
  ],
  'real-estate': [
    { key: 'listingType', label: 'Зарын төрөл', kind: 'select', field: 'listingType', options: ['Худалдах', 'Түрээслэх', 'Бартер', 'Урьдчилсан захиалга'] },
    { key: 'propertyType', label: 'Төрөл', kind: 'select', field: 'propertyType', options: ['Орон сууц', 'Хаус', 'Оффис', 'Газар', 'Агуулах', 'Зуслан'] },
    { key: 'roomsMin', label: 'Өрөө (доод)', kind: 'min', field: 'rooms', placeholder: '2' },
    { key: 'roomsMax', label: 'Өрөө (дээд)', kind: 'max', field: 'rooms', placeholder: '4' },
    { key: 'sqmMin', label: 'Талбай м² (доод)', kind: 'min', field: 'sqm', placeholder: '40' },
    { key: 'sqmMax', label: 'Талбай м² (дээд)', kind: 'max', field: 'sqm', placeholder: '120' },
    { key: 'condition', label: 'Засвар', kind: 'select', field: 'condition', options: ['Шинэ засвар', 'Евро засвар', 'Энгийн', 'Засвар хэрэгтэй'] },
  ],
  phones: [
    { key: 'brand', label: 'Брэнд', kind: 'facet', field: 'brand' },
    { key: 'model', label: 'Загвар', kind: 'contains', field: 'model', placeholder: 'iPhone 15...' },
    { key: 'storage', label: 'Багтаамж', kind: 'select', field: 'storage', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'condition', label: 'Төлөв', kind: 'select', field: 'condition', options: ['Шинэ', 'Бараг шинэ', 'Хэрэглэсэн', 'Сэвтэй'] },
  ],
};

/** Ангиллын root key (vehicles-toyota → vehicles) */
export function categoryRoot(category?: string | null): string {
  const c = String(category || '');
  return Object.keys(LISTING_FILTERS).find((k) => c === k || c.startsWith(`${k}-`)) || c;
}

export function filtersForCategory(category?: string | null): FilterDef[] {
  const defs = LISTING_FILTERS[categoryRoot(category)] || [];
  return defs.length ? [...defs, ...PRICE_FILTERS] : [];
}

/** { brand: 'Toyota' } → { m_brand: 'Toyota' } (хоосныг хасна) */
export function metaParams(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) if (v && v.trim()) out[`m_${k}`] = v.trim();
  return out;
}
