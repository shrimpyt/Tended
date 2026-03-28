import {create} from 'zustand';
import {supabase} from '../lib/supabase';

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

interface SpendingState {
  entries: SpendingEntry[];
  loading: boolean;
  error: string | null;

  fetchEntries: (householdId: string, year: number, month: number) => Promise<void>;
  addEntry: (householdId: string, userId: string, entry: NewSpendingEntry) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
}

export const useSpendingStore = create<SpendingState>((set) => ({
  entries: [],
  loading: false,
  error: null,

  fetchEntries: async (householdId, year, month) => {
    set({loading: true, error: null});

    // Build month range
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const toDate = new Date(year, month, 0); // last day of month
    const to = `${year}-${String(month).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;

    const {data, error} = await supabase
      .from('spending_entries')
      .select('*')
      .eq('household_id', householdId)
      .gte('date', from)
      .lte('date', to)
      .order('date', {ascending: false});

    if (error) {
      set({loading: false, error: error.message});
      return;
    }

    set({entries: (data as SpendingEntry[]) ?? [], loading: false});
  },

  addEntry: async (householdId, userId, newEntry) => {
    const {data, error} = await supabase
      .from('spending_entries')
      .insert({
        household_id: householdId,
        added_by: userId,
        ...newEntry,
      })
      .select()
      .single();

    if (error) {
      set({error: error.message});
      return;
    }

    const entry = data as SpendingEntry;
    set(state => ({
      entries: [entry, ...state.entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    }));
  },

  deleteEntry: async (entryId) => {
    const {error} = await supabase
      .from('spending_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      set({error: error.message});
      return;
    }

    set(state => ({entries: state.entries.filter(e => e.id !== entryId)}));
  },
}));
