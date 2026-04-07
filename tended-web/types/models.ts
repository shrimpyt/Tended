export type Category = string;

export interface Recipe {
  id: number;
  title: string;
  image: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
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
}

export interface NewItem {
  name: string;
  category: Category | null;
  quantity: number;
  max_quantity: number;
  threshold: number;
  unit: string | null;
}

export interface StockEvent {
  id: string;
  item_id: string;
  old_quantity: number;
  new_quantity: number;
  updated_by: string | null;
  updated_at: string;
}

export type SpendingCategory = 'Groceries' | 'Cleaning' | 'Pantry' | 'Personal care';

export interface SpendingEntry {
  id: string;
  household_id: string;
  amount: number;
  category: SpendingCategory;
  item_name: string | null;
  added_by: string | null;
  date: string;
  is_waste: boolean;
  created_at: string;
}

export interface NewSpendingEntry {
  amount: number;
  category: SpendingCategory;
  item_name: string | null;
  date: string;
  is_waste: boolean;
}

export interface ShoppingListItem {
  id: string;
  household_id: string;
  item_name: string;
  item_id: string | null;
  added_by: string; // user id or 'system'
  note: string | null;
  completed: boolean;
  created_at: string;
  added_by_name?: string;
}
