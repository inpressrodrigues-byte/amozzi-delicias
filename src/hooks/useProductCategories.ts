import { useSiteSettings } from './useSiteSettings';

export interface ProductCategory {
  key: string;
  label: string;
}

const DEFAULT_CATEGORIES: ProductCategory[] = [
  { key: 'bolo_no_pote', label: 'Bolo no Pote' },
  { key: 'marmita_salgada', label: 'Marmita Salgada' },
];

export const useProductCategories = () => {
  const { data: settings, isLoading } = useSiteSettings();

  const categories: ProductCategory[] = (() => {
    const raw = (settings as any)?.product_categories;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return DEFAULT_CATEGORIES;
  })();

  const getCategoryLabel = (key: string) => {
    return categories.find(c => c.key === key)?.label || key;
  };

  return { categories, getCategoryLabel, isLoading };
};
