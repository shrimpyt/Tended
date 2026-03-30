import {create} from 'zustand';
import {supabase} from '../lib/supabase';

export type Category = string;

export interface Item {
  id: string;
  household_id: string;
  name: string;
  category: Category | null;
  stock_level: number;
  threshold: number;
  unit: string | null;
  barcode: string | null;
  photo_url: string | null;
  created_by: string | null;
  updated_at: string;
}

export interface NewItem {
  name: string;
  category: Category | null;
  stock_level: number;
  threshold: number;
  unit: string | null;
}

export function getUniqueCategories(items: Item[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category && item.category.trim()) {
      seen.add(item.category.trim());
    }
  }
  return Array.from(seen).sort();
}

interface InventoryState {
  items: Item[];
  loading: boolean;
  error: string | null;

  fetchItems: (householdId: string) => Promise<void>;
  addItem: (householdId: string, userId: string, item: NewItem) => Promise<string | null>;
  updateStockLevel: (itemId: string, userId: string, oldLevel: number, newLevel: number) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async (householdId) => {
    set({loading: true, error: null});

    const {data, error} = await supabase
      .from('items')
      .select('*')
      .eq('household_id', householdId)
      .order('name');

    if (error) {
      set({loading: false, error: error.message});
      return;
    }

    set({items: (data as Item[]) ?? [], loading: false});
  },

  addItem: async (householdId, userId, newItem) => {
    const {data, error} = await supabase
      .from('items')
      .insert({
        household_id: householdId,
        created_by: userId,
        ...newItem,
        category: newItem.category && newItem.category.trim() ? newItem.category.trim() : null,
      })
      .select()
      .single();

    if (error) {
      set({error: error.message});
      return null;
    }

    const item = data as Item;
    set(state => ({items: [...state.items, item].sort((a, b) => a.name.localeCompare(b.name))}));
    return item.id;
  },

  updateStockLevel: async (itemId, userId, oldLevel, newLevel) => {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return;

    // Update item stock level
    const {error: itemError} = await supabase
      .from('items')
      .update({stock_level: newLevel})
      .eq('id', itemId);

    if (itemError) {
      set({error: itemError.message});
      return;
    }

    // Log the stock event (non-fatal if it fails)
    const {error: eventError} = await supabase.from('stock_events').insert({
      item_id: itemId,
      old_level: oldLevel,
      new_level: newLevel,
      updated_by: userId,
    });
    if (eventError) console.warn('stock_event insert failed:', eventError.message);

    // Auto-add to shopping list if crossing below threshold (and wasn't already low)
    const wasOk = oldLevel >= item.threshold;
    const isNowLow = newLevel < item.threshold;
    if (wasOk && isNowLow) {
      await supabase.from('shopping_list').insert({
        household_id: item.household_id,
        item_name: item.name,
        item_id: item.id,
        added_by: 'system',
        note: newLevel === 0 ? 'Out of stock' : 'Running low',
      });
    }

    set(state => ({
      items: state.items.map(i =>
        i.id === itemId ? {...i, stock_level: newLevel} : i,
      ),
    }));
  },

  deleteItem: async (itemId) => {
    const {error} = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      set({error: error.message});
      return;
    }

    set(state => ({items: state.items.filter(i => i.id !== itemId)}));
  },
}));
