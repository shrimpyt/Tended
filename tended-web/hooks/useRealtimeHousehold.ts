import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {supabase} from '../lib/supabase';
import {queryKeys} from './queries';

/**
 * Subscribes to real-time changes for all household tables.
 * Invalidates React Query caches automatically.
 */
export function useRealtimeHousehold(householdId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!householdId) return;

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
        () => {
          void queryClient.invalidateQueries({queryKey: queryKeys.inventory(householdId)});
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void queryClient.invalidateQueries({queryKey: queryKeys.shopping(householdId)});
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spending_entries',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void queryClient.invalidateQueries({queryKey: ['spending', householdId]});
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, queryClient]);
}
