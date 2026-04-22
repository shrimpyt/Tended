export type Category = string;

export interface Recipe {
  id: number; // Spoonacular ID
  title: string;
  image: string;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  instructions?: string;
  readyInMinutes?: number;
  servings?: number;
  ingredients?: any[]; // For storing full info in DB
}

export interface SavedMeal {
  id: string;
  household_id: string;
  recipe_id: string;
  created_at: string;
  recipe?: Recipe;
}

export interface Item {
  id: string;
  household_id: string;
  name: string;
  category: Category | null;
  quantity: number;
  max_quantity: number;
  threshold: number; // real-unit value (e.g. 0.25 = reorder when < 1/4 unit)
  unit: string | null;
  barcode: string | null;
  photo_url: string | null;
  created_by: string | null;
  updated_at: string;
  /** ISO date string YYYY-MM-DD, optional — shown in Expiring Soon list */
  expiry_date: string | null;
}

export interface NewItem {
  name: string;
  category: Category | null;
  quantity: number;
  max_quantity: number;
  threshold: number;
  unit: string | null;
  expiry_date?: string | null;
}

export interface StockEvent {
  id: string;
  item_id: string;
  old_quantity: number;
  new_quantity: number;
  updated_by: string | null;
  updated_at: string;
}

export type SpendingCategory =
  | 'Groceries'
  | 'Household'
  | 'Cleaning'
  | 'Pantry'
  | 'Personal care'
  | 'Beverages'
  | 'Other';

export interface SpendingEntry {
  id: string;
  household_id: string;
  amount: number;
  category: SpendingCategory;
  item_name: string | null;
  note: string | null;
  added_by: string | null;
  date: string;
  is_waste: boolean;
  created_at: string;
}

export interface NewSpendingEntry {
  amount: number;
  category: SpendingCategory;
  item_name?: string | null;
  note?: string | null;
  date: string;
  is_waste?: boolean;
}

export interface ShoppingListItem {
  id: string;
  household_id: string;
  item_name: string;
  item_id: string | null;
  added_by: string; // user id or 'system'
  note: string | null;
  completed: boolean;
  category: string | null;
  created_at: string;
  added_by_name?: string;
}
