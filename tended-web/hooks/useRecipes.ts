import { useQuery } from '@tanstack/react-query';
import type { Recipe } from '@/types/models';

/**
 * Fetch recipe suggestions from the Spoonacular API based on a list of
 * available ingredient names from the household inventory.
 *
 * Requires: NEXT_PUBLIC_SPOONACULAR_API_KEY environment variable.
 *
 * Docs: https://spoonacular.com/food-api/docs#Search-Recipes-by-Ingredients
 */
export function useRecipes(ingredientNames: string[], maxResults = 6) {
  // Stable cache key: sort names so order doesn't matter
  const sortedKey = ingredientNames.slice().sort().join(',');

  return useQuery<Recipe[]>({
    queryKey: ['recipes', sortedKey, maxResults],
    queryFn: async () => {
      const apiKey = process.env.NEXT_PUBLIC_SPOONACULAR_API_KEY;
      if (!apiKey) {
        console.warn('[useRecipes] NEXT_PUBLIC_SPOONACULAR_API_KEY is not set.');
        return [];
      }
      if (ingredientNames.length === 0) return [];

      const params = new URLSearchParams({
        apiKey,
        ingredients: ingredientNames.join(',+'),
        number: String(maxResults),
        ranking: '1',         // maximise used ingredients
        ignorePantry: 'true',
      });

      const res = await fetch(
        `https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error(`Spoonacular error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as Recipe[];
    },
    enabled: ingredientNames.length > 0,
    staleTime: 1000 * 60 * 60,     // recipes don't change often — cache 1 hr
    gcTime:    1000 * 60 * 60 * 4, // keep in GC for 4 hrs
    retry: 1,
  });
}
