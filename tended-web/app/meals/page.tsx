'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory } from '@/hooks/queries';
import { useRecipes } from '@/hooks/useRecipes';
import { Recipe } from '@/types/models';
import Link from 'next/link';

// Simple hook for local storage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

function RecipeCard({ recipe, onSave, saved, onRemove }: { recipe: Recipe; onSave?: () => void; saved?: boolean; onRemove?: () => void }) {
  return (
    <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      <div className="h-40 overflow-hidden bg-white/5 relative">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-lg text-text-primary line-clamp-2" title={recipe.title}>
          {recipe.title}
        </h3>

        <div className="flex gap-2 mb-2 text-sm">
          <span className="bg-success-green/20 text-success-green px-2 py-0.5 rounded font-medium">
            {recipe.usedIngredientCount} Used
          </span>
          {recipe.missedIngredientCount > 0 && (
            <span className="bg-danger-red/20 text-danger-red px-2 py-0.5 rounded font-medium">
              {recipe.missedIngredientCount} Missed
            </span>
          )}
        </div>

        <div className="mt-auto pt-2">
          {onSave && (
            <button
              onClick={onSave}
              disabled={saved}
              className={`w-full py-2 rounded-md font-medium text-sm transition-colors ${
                saved
                  ? 'bg-surface border border-border text-text-secondary cursor-default'
                  : 'bg-primary-blue text-white hover:bg-primary-blue/90'
              }`}
            >
              {saved ? 'Saved' : 'Save Meal'}
            </button>
          )}

          {onRemove && (
            <button
              onClick={onRemove}
              className="w-full py-2 rounded-md font-medium text-sm transition-colors bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-danger-red/50 hover:bg-danger-red/10"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MealsPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: inventory = [], isLoading: isLoadingInventory } = useInventory(householdId);

  const [savedMeals, setSavedMeals] = useLocalStorage<Recipe[]>('tended_saved_meals', []);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsClient(true), 0);
  }, []);

  // Get list of ingredient names from inventory that are in stock
  const ingredientNames = inventory
    .filter(item => item.quantity > 0)
    .map(item => item.name);

  const { data: suggestions = [], isLoading: isLoadingRecipes } = useRecipes(ingredientNames, 12);

  const savedIds = new Set(savedMeals.map(m => m.id));

  const saveMeal = (recipe: Recipe) => {
    if (!savedIds.has(recipe.id)) {
      setSavedMeals([...savedMeals, recipe]);
    }
  };

  const removeSavedMeal = (id: number) => {
    setSavedMeals(savedMeals.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface-elevated border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-primary-blue">&larr; Back</Link>
          <div className="font-bold text-xl text-text-primary tracking-tight">Meals</div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-10">

        {/* Suggested Meals Section */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Suggested for you</h2>
              <p className="text-text-secondary text-sm mt-1">Based on {ingredientNames.length} items in your inventory</p>
            </div>
          </div>

          {isLoadingInventory || isLoadingRecipes ? (
            <div className="flex h-48 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
              <p className="text-text-secondary">No suggestions found. Try adding more ingredients to your inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suggestions.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  saved={savedIds.has(recipe.id)}
                  onSave={() => saveMeal(recipe)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Saved Meals Section */}
        {isClient && (
          <section>
            <div className="flex items-end justify-between mb-6 border-t border-border pt-8">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Saved Meals</h2>
                <p className="text-text-secondary text-sm mt-1">
                  {savedMeals.length} {savedMeals.length === 1 ? 'meal' : 'meals'}
                </p>
              </div>
            </div>

            {savedMeals.length === 0 ? (
              <div className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
                <p className="text-text-secondary">No saved meals yet. Tap Save on a suggestion to keep it.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {savedMeals.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onRemove={() => removeSavedMeal(recipe.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
