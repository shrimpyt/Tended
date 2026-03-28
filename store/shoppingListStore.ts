import {create} from 'zustand';
import {supabase} from '../lib/supabase';

export interface ShoppingListItem {
  id: string;
  household_id: string;
  item_name: string;
  item_id: string | null;
  added_by: string; // user id or 'system'
  note: string | null;
  completed: boolean;
  created_at: string;
  // Joined from profiles
  added_by_name?: string;
}

interface ShoppingListState {
  items: ShoppingListItem[];
  loading: boolean;
  error: string | null;

  fetchItems: (householdId: string) => Promise<void>;
  addItem: (householdId: string, userId: string, itemName: string, note?: string) => Promise<void>;
  toggleComplete: (itemId: string, completed: boolean) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async (householdId) => {
    set({loading: true, error: null});

    // Fetch shopping list items with profile names joined
    const {data: listData, error: listError} = await supabase
      .from('shopping_list')
      .select('*')
      .eq('household_id', householdId)
      .eq('completed', false)
      .order('created_at', {ascending: true});

    if (listError) {
      set({loading: false, error: listError.message});
      return;
    }

    const items = listData as ShoppingListItem[];

    // Fetch display names for non-system entries
    const userIds = [...new Set(
      items
        .filter(i => i.added_by !== 'system')
        .map(i => i.added_by)
    )];

    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const {data: profiles} = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      if (profiles) {
        nameMap = Object.fromEntries(
          profiles.map(p => [p.id, p.display_name || 'Unknown']),
        );
      }
    }

    const enriched = items.map(item => ({
      ...item,
      added_by_name: item.added_by === 'system' ? 'Auto-added' : (nameMap[item.added_by] ?? 'Unknown'),
    }));

    set({items: enriched, loading: false});
  },

  addItem: async (householdId, userId, itemName, note) => {
    const {data, error} = await supabase
      .from('shopping_list')
      .insert({
        household_id: householdId,
        item_name: itemName.trim(),
        added_by: userId,
        note: note ?? null,
      })
      .select()
      .single();

    if (error) {
      set({error: error.message});
      return;
    }

    const item = data as ShoppingListItem;
    set(state => ({
      items: [...state.items, {
        ...item,
        added_by_name: 'You',
      }],
    }));
  },

  toggleComplete: async (itemId, completed) => {
    const {error} = await supabase
      .from('shopping_list')
      .update({completed})
      .eq('id', itemId);

    if (error) {
      set({error: error.message});
      return;
    }

    // Remove from list when marked complete
    if (completed) {
      set(state => ({items: state.items.filter(i => i.id !== itemId)}));
    } else {
      set(state => ({
        items: state.items.map(i => i.id === itemId ? {...i, completed} : i),
      }));
    }
  },

  deleteItem: async (itemId) => {
    const {error} = await supabase
      .from('shopping_list')
      .delete()
      .eq('id', itemId);

    if (error) {
      set({error: error.message});
      return;
    }

    set(state => ({items: state.items.filter(i => i.id !== itemId)}));
  },
}));
