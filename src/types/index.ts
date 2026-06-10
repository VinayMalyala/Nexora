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
  quantity_value: number | null;
  quantity_unit: 'g' | 'kg' | 'ml' | 'l' | null;
  image_url: string;
  category: string;
  page_id: string | null;
  company?: string;
  product_url: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface ProductTag {
  id: string;
  product_id: string;
  tag: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  profilePictureUrl: string;
  email: string;
  phone: string;
  bio: string;
}

export interface UserAccount extends User {
  password: string;
}

export interface Expense {
  id: string;
  user_id: string;
  name: string;
  price: number;
  date: string;
  product_id?: string | null;
  notes?: string;
  created_at?: string;
}

export type ViewMode = 'home' | 'recents' | 'page' | 'price-tracker' | 'monthly-expenses' | 'profile';

export const CATEGORIES = [
  'Personal Care',
  'Food',
  'Beauty',
  'Electronics',
  'Clothes',
  'Home & Kitchen',
  'Health & Wellness',
  'Books',
  'Sports & Fitness',
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];
