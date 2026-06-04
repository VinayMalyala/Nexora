export interface Page {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  page_id: string | null;
  product_url: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
  is_favorite?: boolean;
}

export interface ProductTag {
  id: string;
  product_id: string;
  tag: string;
}

export type ViewMode = 'home' | 'recents' | 'favorites' | 'page';

export const CATEGORIES = [
  'Personal Care',
  'Electronics',
  'Clothes',
  'Food & Grocery',
  'Home & Kitchen',
  'Health & Wellness',
  'Books',
  'Sports & Fitness',
  'Beauty',
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];
