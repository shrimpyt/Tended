'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useSavedMeals, useSaveRecipe, useRemoveSavedMeal } from '@/hooks/queries';
import { useRecipes, fetchRecipeDetails } from '@/hooks/useRecipes';
import { Recipe } from '@/types/models';
import Link from 'next/link';
import { ChefHat, Scan, BookmarkCheck, Bookmark, X, Sparkles, Clock, Users, ArrowRight } from 'lucide-react';

// ── Recipe Card ────────────────────────────────────────────────────
function RecipeCard({
  recipe,
  onSave,
  saved,
  onRemove,
  onClick,
}: {
  recipe: any;
  onSave?: () => void;
  saved?: boolean;
  onRemove?: () => void;
  onClick: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSave || saved) return;
    setSaving(true);
    await onSave();
    setSaving(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) onRemove();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="glass rounded-2xl overflow-hidden flex flex-col h-full group cursor-pointer"
      style={{ border: '1px solid var(--glass-border)' }}
    >
      {/* Image */}
      <div className="h-44 overflow-hidden bg-white/5 relative flex-shrink-0">
        <motion.img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {recipe.usedIngredientCount !== undefined ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm bg-green/20 text-green border border-green/30">
              ✓ {recipe.usedIngredientCount} match
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm bg-primary/20 text-primary border border-primary/30">
              Library
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">
          {recipe.title}
        </h3>

        <div className="mt-auto flex gap-2">
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saved || saving}
              className="flex-1 py-2 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2"
              style={
                saved
                  ? { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }
                  : { background: 'var(--primary)', color: '#fff' }
              }
            >
              {saving ? '...' : saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              {saved ? 'Saved' : 'Save'}
            </button>
          )}

          {onRemove && (
            <button
              onClick={handleRemove}
              className="p-2 rounded-xl border border-glass-border hover:bg-white/5 text-text-secondary transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Recipe Modal ───────────────────────────────────────────────────
function RecipeModal({ recipe, isOpen, onClose, onSave, isSaved }: { 
  recipe: any; 
  isOpen: boolean; 
  onClose: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}) {
  if (!recipe) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] glass rounded-3xl overflow-hidden flex flex-col"
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <div className="h-64 sm:h-80 relative flex-shrink-0">
              <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-black/40 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white line-clamp-2">{recipe.title}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
              <div className="flex flex-wrap gap-6">
                {recipe.ready_in_minutes && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Ready in</p>
                      <p className="font-semibold text-foreground">{recipe.ready_in_minutes} mins</p>
                    </div>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Servings</p>
                      <p className="font-semibold text-foreground">{recipe.servings}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Ingredients</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(recipe.ingredients || recipe.extendedIngredients || []).map((ing: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-primary mt-1">•</span>
                      <span>{ing.original || ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Instructions</h3>
                <div 
                  className="text-sm text-text-secondary leading-relaxed space-y-4 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: recipe.instructions || 'No instructions available.' }}
                />
              </div>
            </div>

            {onSave && !isSaved && (
              <div className="p-6 bg-white/5 border-t border-glass-border">
                <button
                  onClick={onSave}
                  className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Bookmark size={20} />
                  Save to Household Library
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── No Ingredients Fallback ────────────────────────────────────────
function NoIngredientsFallback() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center gap-6"
    >
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-accent-glow border border-glass-border">
        <ChefHat size={36} className="text-primary" strokeWidth={1.5} />
      </div>
      <div className="max-w-xs">
        <h3 className="text-xl font-bold text-foreground mb-2">No Ingredients Found</h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Add items to your inventory to see magic meal suggestions.
        </p>
      </div>
      <Link href="/inventory" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm">
        <Scan size={16} />
        Add Ingredients
      </Link>
    </motion.div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-glass-border bg-surface-elevated">
      <div className="h-44 bg-white/5 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/10 rounded-lg animate-pulse w-3/4" />
        <div className="h-3 bg-white/10 rounded-lg animate-pulse w-1/2" />
        <div className="h-9 bg-white/10 rounded-xl animate-pulse mt-4" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function MealsPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: inventory = [], isLoading: isLoadingInventory } = useInventory(householdId);
  const ingredientNames = inventory.filter(item => item.quantity > 0).map(item => item.name);

  // Persistence hooks
  const { data: savedMealsData = [] } = useSavedMeals(householdId);
  const saveRecipeMutation = useSaveRecipe();
  const removeSavedMealMutation = useRemoveSavedMeal();

  const { data: suggestions = [], isLoading: isLoadingRecipes } = useRecipes(ingredientNames, 12);

  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const savedSpoonacularIds = new Set(savedMealsData.map(m => m.recipe.spoonacular_id));

  const handleSave = async (recipe: any) => {
    try {
      await saveRecipeMutation.mutateAsync({
        householdId,
        recipe,
        fetchDetails: fetchRecipeDetails
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleRemove = (recipeId: string) => {
    removeSavedMealMutation.mutate({ householdId, recipeId });
  };

  const openRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const noIngredients = !isLoadingInventory && ingredientNames.length === 0;
  const isLoading = isLoadingInventory || isLoadingRecipes;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="aura aura-1" />
      <div className="aura aura-2" />

      <header className="sticky top-0 z-30 px-6 py-4 flex items-center gap-4 bg-background/80 backdrop-blur-md border-b border-glass-border">
        <ChefHat size={20} className="text-primary" strokeWidth={2} />
        <h1 className="font-bold text-xl text-foreground tracking-tight">Meals</h1>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-12">
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                Suggested for you
              </h2>
              {!noIngredients && (
                <p className="text-sm mt-1 text-text-secondary">
                  Based on {ingredientNames.length} ingredients you have
                </p>
              )}
            </div>
          </div>

          {noIngredients ? (
            <NoIngredientsFallback />
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {suggestions.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  saved={savedSpoonacularIds.has(recipe.id)}
                  onSave={() => handleSave(recipe)}
                  onClick={() => openRecipe(recipe)}
                />
              ))}
            </motion.div>
          )}
        </section>

        {savedMealsData.length > 0 && (
          <section className="pt-8 border-t border-glass-border">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <BookmarkCheck size={20} className="text-primary" />
                  Your Library
                </h2>
                <p className="text-sm mt-1 text-text-secondary">
                  {savedMealsData.length} saved recipes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {savedMealsData.map(meal => (
                <RecipeCard
                  key={meal.id}
                  recipe={meal.recipe}
                  onRemove={() => handleRemove(meal.recipe.id)}
                  onClick={() => openRecipe(meal.recipe)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <RecipeModal 
        recipe={selectedRecipe}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => handleSave(selectedRecipe)}
        isSaved={selectedRecipe && (savedSpoonacularIds.has(selectedRecipe.id) || savedSpoonacularIds.has(selectedRecipe.spoonacular_id))}
      />
    </div>
  );
}
