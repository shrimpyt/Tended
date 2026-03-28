import {create} from 'zustand';
import {MEAL_DATABASE, MealData} from '../constants/meals';

export interface Meal {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  tags: string[];
  prepTime: number;
}

interface MealsStore {
  suggestions: Meal[];
  savedMeals: Meal[];
  isLoading: boolean;
  generateSuggestions: (pantryItems?: string[]) => void;
  saveMeal: (meal: Meal) => void;
  removeSavedMeal: (id: string) => void;
}

function pickSuggestions(pantryItems: string[]): Meal[] {
  const lower = pantryItems.map(p => p.toLowerCase());

  // Score each meal by how many ingredients match pantry items
  const scored = MEAL_DATABASE.map((meal: MealData) => {
    const matchCount = meal.ingredients.filter(ing =>
      lower.some(p => p.includes(ing.toLowerCase()) || ing.toLowerCase().includes(p)),
    ).length;
    return {meal, matchCount};
  });

  // Sort: highest match first, then shortest prep time as tie-breaker
  scored.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.meal.prepTime - b.meal.prepTime;
  });

  // Return top 6 as suggestions (or all if fewer than 6)
  return scored.slice(0, 6).map(s => s.meal);
}

export const useMealsStore = create<MealsStore>((set, get) => ({
  suggestions: [],
  savedMeals: [],
  isLoading: false,

  generateSuggestions: (pantryItems = []) => {
    set({isLoading: true});

    // Simulate brief async processing
    setTimeout(() => {
      const suggestions = pantryItems.length > 0
        ? pickSuggestions(pantryItems)
        : MEAL_DATABASE.slice().sort(() => Math.random() - 0.5).slice(0, 6);

      set({suggestions, isLoading: false});
    }, 300);
  },

  saveMeal: (meal: Meal) => {
    const {savedMeals} = get();
    if (savedMeals.find(m => m.id === meal.id)) return; // already saved
    set({savedMeals: [...savedMeals, meal]});
  },

  removeSavedMeal: (id: string) => {
    set(state => ({savedMeals: state.savedMeals.filter(m => m.id !== id)}));
  },
}));
