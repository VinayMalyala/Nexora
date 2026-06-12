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
  quantity_unit: 'g' | 'kg' | 'ml' | 'l' | 'item' | null;
  image_url: string;
  category: string;
  page_id: string | null;
  company?: string;
  product_url: string;
  notes: string;
  sort_order: number;
  is_favorite: boolean;
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

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  timeframe: 'day' | 'week' | 'month';
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WardrobeCombination {
  id: string;
  user_id: string;
  name: string;
  shirt: string;
  pants: string;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WardrobeWear {
  id: string;
  user_id: string;
  combination_id: string;
  wear_date: string;
  created_at: string;
}

export interface DietMeal {
  id: string;
  user_id: string;
  day_of_week: number; // 0 = Sunday … 6 = Saturday
  meal_type: string;
  hostel_meal: string;
  custom_meal: string;
  use_custom: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DietLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: string;
  what_ate: string;
  followed_plan: boolean;
  mood: string | null;
  notes: string;
  created_at: string;
}

export interface DietRecipe {
  id: string;
  user_id: string;
  title: string;
  ingredients: string;
  steps: string;
  tags: string;
  prep_time_minutes: number | null;
  created_at: string;
  updated_at: string;
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

export type ViewMode = 'home' | 'recents' | 'favorites' | 'workspace' | 'goals' | 'wardrobe' | 'diet' | 'page' | 'price-tracker' | 'monthly-expenses' | 'profile';

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
