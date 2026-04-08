'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useInventory } from '@/hooks/queries';
import { useRecipes } from '@/hooks/useRecipes';
import { Recipe } from '@/types/models';
import Link from 'next/link';
import { ChefHat, Scan, BookmarkCheck, Bookmark, X, Sparkles } from 'lucide-react';

// ── Local-storage hook ─────────────────────────────────────────────
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
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
    } catch (err) {
      console.error(err);
    }
  };

  return [storedValue, setValue] as const;
}

// ── Recipe Card ────────────────────────────────────────────────────
function RecipeCard({
  recipe,
  onSave,
  saved,
  onRemove,
}: {
  recipe: Recipe;
  onSave?: () => void;
  saved?: boolean;
  onRemove?: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave || saved) return;
    setSaving(true);
    // Micro-pause so the animation reads as intentional
    await new Promise(r => setTimeout(r, 600));
    onSave();
    setSaving(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl overflow-hidden flex flex-col h-full group"
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
        {/* Gradient overlay so text is always readable */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Ingredient badges */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm bg-green/20 text-green border border-green/30">
            ✓ {recipe.usedIngredientCount} have
          </span>
          {recipe.missedIngredientCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm bg-red/20 text-red border border-red/30">
              + {recipe.missedIngredientCount} need
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">
          {recipe.title}
        </h3>

        <div className="mt-auto">
          {onSave && (
            <motion.button
              onClick={handleSave}
              disabled={saved || saving}
              whileTap={!saved && !saving ? { scale: 0.95 } : {}}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden relative"
              style={
                saved
                  ? {
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)',
                    }
                  : saving
                  ? {
                      background: 'var(--primary)',
                      color: '#fff',
                      opacity: 0.8,
                    }
                  : {
                      background: 'var(--primary)',
                      color: '#fff',
                    }
              }
            >
              <AnimatePresence mode="wait" initial={false}>
                {saving ? (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-1.5"
                  >
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                      className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full"
                    />
                    Saving…
                  </motion.span>
                ) : saved ? (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <BookmarkCheck size={15} />
                    Saved
                  </motion.span>
                ) : (
                  <motion.span
                    key="save"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Bookmark size={15} />
                    Save Meal
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {onRemove && (
            <motion.button
              onClick={onRemove}
              whileTap={{ scale: 0.95 }}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={14} />
              Remove
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── No Ingredients Fallback ────────────────────────────────────────
function NoIngredientsFallback() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center gap-6"
    >
      {/* Animated icon cluster */}
      <div className="relative">
        <motion.div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'var(--accent-glow)', border: '1px solid var(--glass-border)' }}
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <ChefHat size={36} style={{ color: 'var(--primary)' }} strokeWidth={1.5} />
        </motion.div>
        <motion.div
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--primary)', opacity: 0.9 }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <Sparkles size={14} className="text-white" />
        </motion.div>
      </div>

      <div className="max-w-xs">
        <h3 className="text-xl font-bold text-foreground mb-2">No Ingredients Found</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Your pantry looks empty! Scan a receipt or add items to your inventory — we'll suggest
          delicious recipes the moment you have ingredients.
        </p>
      </div>

      <Link
        href="/inventory"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{ background: 'var(--primary)', color: '#fff' }}
      >
        <Scan size={16} />
        Add Ingredients
      </Link>
    </motion.div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--glass-border)', background: 'var(--surface-elevated)' }}
    >
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
  const [savedMeals, setSavedMeals] = useLocalStorage<Recipe[]>('tended_saved_meals', []);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // setTimeout to avoid sync setState in effect if strictly needed, though react 18 batching usually handles this.
    setTimeout(() => setIsClient(true), 0);
  }, []);

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

  const noIngredients = !isLoadingInventory && ingredientNames.length === 0;
  const isLoading = isLoadingInventory || isLoadingRecipes;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Ambient aura */}
      <div className="aura aura-1" />
      <div className="aura aura-2" />

      {/* Header */}
      <header
        className="sticky top-0 z-30 px-6 py-4 flex items-center gap-4"
        style={{
          background: 'rgba(10,10,11,0.80)',
          borderBottom: '1px solid var(--glass-border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <ChefHat size={20} style={{ color: 'var(--primary)' }} strokeWidth={2} />
        <h1 className="font-bold text-xl text-foreground tracking-tight">Meals</h1>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-12">

        {/* ── Suggested Section ─────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles size={20} style={{ color: 'var(--primary)' }} />
                Suggested for you
              </h2>
              {!noIngredients && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Based on {ingredientNames.length} item{ingredientNames.length !== 1 ? 's' : ''} in
                  your inventory
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
          ) : suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-10 text-center"
              style={{ border: '1px solid var(--glass-border)' }}
            >
              <p style={{ color: 'var(--text-secondary)' }}>
                No recipe matches found with your current ingredients. Try adding more variety to
                your pantry.
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              <AnimatePresence>
                {suggestions.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    saved={savedIds.has(recipe.id)}
                    onSave={() => saveMeal(recipe)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* ── Saved Meals Section ───────────────────────────── */}
        {isClient && savedMeals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div
              className="flex items-end justify-between mb-6 pt-8"
              style={{ borderTop: '1px solid var(--glass-border)' }}
            >
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <BookmarkCheck size={20} style={{ color: 'var(--primary)' }} />
                  Saved Meals
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {savedMeals.length} {savedMeals.length === 1 ? 'meal' : 'meals'} bookmarked
                </p>
              </div>
            </div>

            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              <AnimatePresence>
                {savedMeals.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onRemove={() => removeSavedMeal(recipe.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        )}

      </main>
    </div>
  );
}
