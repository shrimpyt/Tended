import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {supabase} from '../lib/supabase';
import {
  Item,
  NewItem,
  SpendingEntry,
  NewSpendingEntry,
  ShoppingListItem,
} from '../types/models';

export const queryKeys = {
  inventory: (householdId: string) => ['inventory', householdId] as const,
  spending: (householdId: string, year: number, month: number) => ['spending', householdId, year, month] as const,
  shopping: (householdId: string) => ['shopping', householdId] as const,
  stockEvents: (itemId: string) => ['stockEvents', itemId] as const,
  savedMeals: (householdId: string) => ['savedMeals', householdId] as const,
};

// =====================
// INVENTORY
// =====================

export function useInventory(householdId: string) {
  return useQuery({
    queryKey: queryKeys.inventory(householdId),
    queryFn: async () => {
      if (!householdId) return [];
      const {data, error} = await supabase
        .from('items')
        .select('*')
        .eq('household_id', householdId)
        .order('name');
      if (error) throw new Error(error.message);
      return data as Item[];
    },
    enabled: !!householdId,
  });
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({householdId, userId, item}: {householdId: string; userId: string; item: NewItem}) => {
      const {data, error} = await supabase
        .from('items')
        .insert({
          household_id: householdId,
          created_by: userId,
          ...item,
          category: item.category?.trim() || null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Item;
    },
    onSuccess: (_, {householdId}) => {
      queryClient.invalidateQueries({queryKey: queryKeys.inventory(householdId)});
    },
  });
}

export function useUpdateQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({itemId, userId, oldQuantity, newQuantity, item}: {
      itemId: string;
      userId: string;
      oldQuantity: number;
      newQuantity: number;
      item: Item;
    }) => {
      const clamped = Math.max(0, Math.min(newQuantity, item.max_quantity));

      const {error} = await supabase
        .from('items')
        .update({quantity: clamped})
        .eq('id', itemId);
      if (error) throw new Error(error.message);

      // Log stock event
      supabase.from('stock_events').insert({
        item_id: itemId,
        old_quantity: oldQuantity,
        new_quantity: clamped,
        updated_by: userId,
      }).then();

      // Add to shopping list if crossing threshold downward
      if (oldQuantity >= item.threshold && clamped < item.threshold) {
        supabase.from('shopping_list').insert({
          household_id: item.household_id,
          item_name: item.name,
          item_id: item.id,
          added_by: 'system',
          note: clamped === 0 ? 'Out of stock' : 'Running low',
        }).then(() => {
          queryClient.invalidateQueries({queryKey: queryKeys.shopping(item.household_id)});
        });
      }
    },
    onSuccess: (_, {item}) => {
      queryClient.invalidateQueries({queryKey: queryKeys.inventory(item.household_id)});
    },
  });
}

export function useRestockFromReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      proposals: Array<{item: Item; addQuantity: number}>;
      userId: string;
      householdId: string;
    }) => {
      for (const p of args.proposals) {
        const newQty = Math.min(p.item.quantity + p.addQuantity, p.item.max_quantity);
        await supabase.from('items').update({quantity: newQty}).eq('id', p.item.id);
        supabase.from('stock_events').insert({
          item_id: p.item.id,
          old_quantity: p.item.quantity,
          new_quantity: newQty,
          updated_by: args.userId,
        }).then();
      }
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({queryKey: queryKeys.inventory(args.householdId)});
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const {error} = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['inventory']});
    },
  });
}

// =====================
// SPENDING
// =====================

export function useSpendingEntries(householdId: string, year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.spending(householdId, year, month),
    queryFn: async () => {
      if (!householdId) return [];
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const toDate = new Date(year, month, 0);
      const to = `${year}-${String(month).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;

      const {data, error} = await supabase
        .from('spending_entries')
        .select('*')
        .eq('household_id', householdId)
        .gte('date', from)
        .lte('date', to)
        .order('date', {ascending: false});

      if (error) throw new Error(error.message);
      return data as SpendingEntry[];
    },
    enabled: !!householdId,
  });
}

export function useAddSpendingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({householdId, userId, entry}: {householdId: string; userId: string; entry: NewSpendingEntry}) => {
      const {data, error} = await supabase
        .from('spending_entries')
        .insert({
          household_id: householdId,
          added_by: userId,
          ...entry,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SpendingEntry;
    },
    onSuccess: (_, {householdId}) => {
      queryClient.invalidateQueries({queryKey: ['spending', householdId]});
    },
  });
}

export function useDeleteSpendingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const {error} = await supabase.from('spending_entries').delete().eq('id', entryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['spending']});
    },
  });
}

// =====================
// SHOPPING LIST
// =====================

export function useShoppingList(householdId: string) {
  return useQuery({
    queryKey: queryKeys.shopping(householdId),
    queryFn: async () => {
      if (!householdId) return [];
      const {data: listData, error: listError} = await supabase
        .from('shopping_list')
        .select('*')
        .eq('household_id', householdId)
        .eq('completed', false)
        .order('created_at', {ascending: true});

      if (listError) throw new Error(listError.message);
      const items = listData as ShoppingListItem[];

      const userIds = [...new Set(items.filter(i => i.added_by !== 'system').map(i => i.added_by))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const {data: profiles} = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);
        if (profiles) {
          nameMap = Object.fromEntries(profiles.map(p => [p.id, p.display_name || 'Unknown']));
        }
      }

      return items.map(item => ({
        ...item,
        added_by_name: item.added_by === 'system' ? 'Auto-added' : (nameMap[item.added_by] ?? 'Unknown'),
      }));
    },
    enabled: !!householdId,
  });
}

export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({householdId, userId, itemName, note}: {householdId: string; userId: string; itemName: string; note?: string}) => {
      const {error} = await supabase
        .from('shopping_list')
        .insert({
          household_id: householdId,
          item_name: itemName.trim(),
          added_by: userId,
          note: note ?? null,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, {householdId}) => {
      queryClient.invalidateQueries({queryKey: queryKeys.shopping(householdId)});
    },
  });
}

export function useToggleShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({itemId, completed}: {itemId: string; completed: boolean}) => {
      const {error} = await supabase
        .from('shopping_list')
        .update({completed})
        .eq('id', itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['shopping']});
    },
  });
}

export function useDeleteShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const {error} = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['shopping']});
    },
  });
}

// =====================
// WASTE EVENTS
// =====================

interface NewWasteEvent {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string | null | undefined;
  cost: number;
  reason: string;
}

export function useAddWasteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      userId,
      event,
    }: {
      householdId: string;
      userId: string;
      event: NewWasteEvent;
    }) => {
      const { error } = await supabase.from('waste_events').insert({
        household_id: householdId,
        logged_by: userId,
        item_id: event.item_id,
        item_name: event.item_name,
        quantity: event.quantity,
        unit: event.unit ?? null,
        estimated_cost: event.cost,
        reason: event.reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
    },
  });
}

// =====================
// MEALS & RECIPES
// =====================

export function useSavedMeals(householdId: string) {
  return useQuery({
    queryKey: queryKeys.savedMeals(householdId),
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from('saved_meals')
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as any[];
    },
    enabled: !!householdId,
  });
}

export function useSaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      householdId, 
      recipe, 
      fetchDetails 
    }: { 
      householdId: string; 
      recipe: any; 
      fetchDetails: (id: number) => Promise<any> 
    }) => {
      // 1. Check if recipe exists in common database
      let { data: existingRecipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('spoonacular_id', recipe.id)
        .maybeSingle();

      let targetRecipeId = existingRecipe?.id;

      // 2. If not in DB, fetch full details and save
      if (!targetRecipeId) {
        const fullDetails = await fetchDetails(recipe.id);
        const { data: newRecipe, error: insertError } = await supabase
          .from('recipes')
          .insert({
            spoonacular_id: recipe.id,
            title: recipe.title,
            image: recipe.image,
            instructions: fullDetails.instructions,
            ingredients: fullDetails.ingredients,
            ready_in_minutes: fullDetails.readyInMinutes,
            servings: fullDetails.servings,
            is_public: true
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);
        targetRecipeId = newRecipe.id;
      }

      // 3. Link to saved_meals for this household
      const { error: saveError } = await supabase
        .from('saved_meals')
        .upsert({
          household_id: householdId,
          recipe_id: targetRecipeId
        }, { onConflict: 'household_id, recipe_id' });

      if (saveError) throw new Error(saveError.message);
    },
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedMeals(householdId) });
    },
  });
}

export function useRemoveSavedMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ householdId, recipeId }: { householdId: string; recipeId: string }) => {
      const { error } = await supabase
        .from('saved_meals')
        .delete()
        .eq('household_id', householdId)
        .eq('recipe_id', recipeId);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedMeals(householdId) });
    },
  });
}
