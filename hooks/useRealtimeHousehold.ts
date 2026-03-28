import {useEffect} from 'react';
import {supabase} from '../lib/supabase';
import {useAuthStore} from '../store/authStore';

/**
 * Subscribes to real-time changes for all household tables.
 * Attach to a screen or root component that lives for the full session.
 * Each table's onchange callback can be extended to update Zustand stores.
 */
export function useRealtimeHousehold(
  householdId: string,
  callbacks: {
    onItemsChange?: () => void;
    onShoppingListChange?: () => void;
    onSpendingChange?: () => void;
  } = {},
) {
  useEffect(() => {
    const channel = supabase
      .channel(`household:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `household_id=eq.${householdId}`,
        },
        () => callbacks.onItemsChange?.(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list',
          filter: `household_id=eq.${householdId}`,
        },
        () => callbacks.onShoppingListChange?.(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spending_entries',
          filter: `household_id=eq.${householdId}`,
        },
        () => callbacks.onSpendingChange?.(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);
}
