import { useQuery } from '@tanstack/react-query';
import type { Recipe } from '../types/models';

const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

export function useRecipes(ingredientNames: string[], maxResults = 10) {
  const sortedKey = (ingredientNames || []).slice().sort().join(',');

  return useQuery<Recipe[]>({
    queryKey: ['recipes-discovery', sortedKey, maxResults],
    queryFn: async () => {
      if (!API_KEY) {
        console.warn('[useRecipes] EXPO_PUBLIC_SPOONACULAR_API_KEY is not set.');
        return [];
      }
      if (!ingredientNames?.length) return [];

      const params = new URLSearchParams({
        apiKey: API_KEY,
        ingredients: ingredientNames.join(','),
        number: String(maxResults),
        ranking: '1',
        ignorePantry: 'true',
      });

      const res = await fetch(
        `https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`
      );

      if (!res.ok) throw new Error(`Spoonacular error: ${res.status}`);
      return (await res.json()) as Recipe[];
    },
    enabled: !!API_KEY && ingredientNames?.length > 0,
    staleTime: 1000 * 60 * 60,
  });
}

export async function fetchRecipeDetails(spoonacularId: number): Promise<Partial<Recipe>> {
  if (!API_KEY) throw new Error('API Key missing');

  const res = await fetch(
    `https://api.spoonacular.com/recipes/${spoonacularId}/information?apiKey=${API_KEY}`
  );

  if (!res.ok) throw new Error(`Spoonacular details error: ${res.status}`);
  const details = await res.json();

  return {
    instructions: details.instructions || details.summary,
    ready_in_minutes: details.readyInMinutes,
    servings: details.servings,
    ingredients: details.extendedIngredients,
  };
}
