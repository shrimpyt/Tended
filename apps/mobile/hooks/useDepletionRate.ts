import {useQuery} from '@tanstack/react-query';
import {supabase} from '../lib/supabase';
import {queryKeys} from './queries';

type DepletionResult =
  | {available: true; daysRemaining: number}
  | {available: false};

export function useDepletionRate(itemId: string, currentQuantity: number): DepletionResult {
  const {data} = useQuery({
    queryKey: queryKeys.stockEvents(itemId),
    queryFn: async (): Promise<DepletionResult> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const {data: events, error} = await supabase
        .from('stock_events')
        .select('old_quantity, new_quantity, updated_at')
        .eq('item_id', itemId)
        .gte('updated_at', since.toISOString())
        .order('updated_at', {ascending: true});

      if (error || !events) return {available: false};

      // Only consumption events (quantity went down)
      const consumption = events.filter(
        (e: {old_quantity: number; new_quantity: number}) => e.new_quantity < e.old_quantity
      );
      if (consumption.length < 3) return {available: false};

      const totalConsumed = consumption.reduce(
        (sum: number, e: {old_quantity: number; new_quantity: number}) =>
          sum + (e.old_quantity - e.new_quantity),
        0,
      );

      const oldest = new Date(consumption[0].updated_at).getTime();
      const newest = new Date(consumption[consumption.length - 1].updated_at).getTime();
      const spanDays = Math.max(1, (newest - oldest) / 86400000);

      const dailyRate = totalConsumed / spanDays;
      if (dailyRate <= 0) return {available: false};

      const daysRemaining = Math.round(currentQuantity / dailyRate);
      return {available: true, daysRemaining};
    },
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? {available: false};
}
