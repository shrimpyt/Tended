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
        (payload) => {
          const key = queryKeys.inventory(householdId);
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(key, (old: any[] | undefined) => {
              if (!old) return [payload.new];
              if (old.find((i: any) => i.id === payload.new.id)) return old;
              return [...old, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(key, (old: any[] | undefined) => {
              if (!old) return [payload.new];
              return old.map((i: any) => (i.id === payload.new.id ? payload.new : i));
            });
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(key, (old: any[] | undefined) => {
              if (!old) return [];
              return old.filter((i: any) => i.id !== payload.old.id);
            });
          }
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
        (payload) => {
          const key = queryKeys.shopping(householdId);
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(key, (old: any[] | undefined) => {
              if (!old) return [payload.new];
              if (old.find((i: any) => i.id === payload.new.id)) return old;
              return [...old, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(key, (old: any[] | undefined) => {
              if (!old) return [payload.new];
              return old.map((i: any) => (i.id === payload.new.id ? payload.new : i));
            });
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(key, (old: any[] | undefined) => {
              if (!old) return [];
              return old.filter((i: any) => i.id !== payload.old.id);
            });
          }
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
