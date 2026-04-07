'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useUpdateQuantity } from '@/hooks/queries';
import { Item } from '@/types/models';
import { Package, Minus, Plus, AlertTriangle } from 'lucide-react';

// ── Quantity Stepper ──────────────────────────────────────────────
/**
 * Handles immediate +/- clicks with optimistic UI.
 * Framer Motion gives a satisfying "pop" on each tap.
 */
function QuantityStepper({ item, userId }: { item: Item; userId: string }) {
  const { mutate: updateQuantity, isPending } = useUpdateQuantity();
  // Track the delta direction for the spring animation
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  const clamp = (v: number) => Math.max(0, Math.min(v, item.max_quantity));

  const handleStep = useCallback(
    (delta: number) => {
      const newQty = clamp(item.quantity + delta);
      if (newQty === item.quantity) return;
      setDirection(delta > 0 ? 'up' : 'down');
      updateQuantity({
        itemId: item.id,
        userId,
        oldQuantity: item.quantity,
        newQuantity: newQty,
        item,
      });
    },
    [item, userId, updateQuantity],
  );

  return (
    <div className="flex items-center gap-2">
      {/* Decrement */}
      <motion.button
        aria-label={`Decrease quantity of ${item.name}`}
        onClick={() => handleStep(-1)}
        disabled={item.quantity <= 0}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          border: '1px solid var(--glass-border)',
          background: 'var(--surface)',
          color: item.quantity <= 0 ? 'var(--text-secondary)' : 'var(--foreground)',
          opacity: item.quantity <= 0 ? 0.4 : 1,
          cursor: item.quantity <= 0 ? 'not-allowed' : 'pointer',
        }}
      >
        <Minus size={13} strokeWidth={2.5} />
      </motion.button>

      {/* Quantity display with flip animation */}
      <div className="w-14 text-center overflow-hidden relative h-6">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={item.quantity}
            initial={{ y: direction === 'up' ? 14 : -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: direction === 'up' ? -14 : 14, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="absolute inset-0 flex items-center justify-center font-semibold text-sm text-foreground"
          >
            {item.quantity}
            {item.unit ? (
              <span className="ml-0.5 text-[10px] font-normal" style={{ color: 'var(--text-secondary)' }}>
                {item.unit}
              </span>
            ) : null}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Increment */}
      <motion.button
        aria-label={`Increase quantity of ${item.name}`}
        onClick={() => handleStep(1)}
        disabled={item.quantity >= item.max_quantity || isPending}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          border: '1px solid var(--glass-border)',
          background: 'var(--surface)',
          color:
            item.quantity >= item.max_quantity ? 'var(--text-secondary)' : 'var(--foreground)',
          opacity: item.quantity >= item.max_quantity ? 0.4 : 1,
          cursor: item.quantity >= item.max_quantity ? 'not-allowed' : 'pointer',
        }}
      >
        <Plus size={13} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────
function InventoryCard({ item, userId }: { item: Item; userId: string }) {
  const pct = Math.min(100, Math.max(0, (item.quantity / item.max_quantity) * 100));
  const isLow = item.quantity / item.max_quantity <= item.threshold;
  const isEmpty = item.quantity === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 flex flex-col gap-4"
      style={{ border: '1px solid var(--glass-border)' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-base leading-snug truncate">
            {item.name}
          </h3>
          {item.category && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
              {item.category}
            </p>
          )}
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.span
              key="empty"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertTriangle size={10} strokeWidth={2.5} />
              Out
            </motion.span>
          ) : isLow ? (
            <motion.span
              key="low"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <AlertTriangle size={10} strokeWidth={2.5} />
              Low
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          <span>Stock level</span>
          <span className="font-medium text-foreground">
            {item.quantity} / {item.max_quantity}
            {item.unit ? ` ${item.unit}` : ''}
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isEmpty
                ? 'rgba(239,68,68,0.6)'
                : isLow
                ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                : 'var(--primary)',
            }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          />
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--glass-border)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Adjust quantity
        </span>
        <QuantityStepper item={item} userId={userId} />
      </div>
    </motion.div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ border: '1px solid var(--glass-border)', background: 'var(--surface-elevated)' }}
    >
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-white/10 rounded-lg animate-pulse w-2/3" />
          <div className="h-3 bg-white/5 rounded-lg animate-pulse w-1/3" />
        </div>
      </div>
      <div className="h-2 bg-white/10 rounded-full animate-pulse" />
      <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="h-3 bg-white/5 rounded animate-pulse w-20" />
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-lg animate-pulse" />
          <div className="w-14 h-6 bg-white/5 rounded animate-pulse" />
          <div className="w-8 h-8 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { profile, user } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const userId = user?.id ?? '';

  const { data: items = [], isLoading } = useInventory(householdId);

  const allowedCategories: string[] | null =
    profile?.role === 'restricted' && profile.restricted_categories?.length
      ? profile.restricted_categories
      : null;

  const visibleItems = allowedCategories
    ? items.filter(item => item.category != null && allowedCategories.includes(item.category))
    : items;

  // Group by category
  const categories = [...new Set(visibleItems.map(i => i.category ?? 'Other'))].sort();
  const grouped = categories.reduce<Record<string, Item[]>>((acc, cat) => {
    acc[cat] = visibleItems.filter(i => (i.category ?? 'Other') === cat);
    return acc;
  }, {});

  const totalItems = visibleItems.length;
  const lowCount = visibleItems.filter(i => i.quantity / i.max_quantity <= i.threshold).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Ambient aura */}
      <div className="aura aura-1" />
      <div className="aura aura-2" />

      {/* Header */}
      <header
        className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between gap-4"
        style={{
          background: 'rgba(10,10,11,0.80)',
          borderBottom: '1px solid var(--glass-border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Package size={20} style={{ color: 'var(--primary)' }} strokeWidth={2} />
          <h1 className="font-bold text-xl text-foreground tracking-tight">Inventory</h1>
        </div>

        {!isLoading && totalItems > 0 && (
          <div className="flex items-center gap-3 text-xs font-medium">
            <span
              className="px-2.5 py-1 rounded-full"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}
            >
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
            {lowCount > 0 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {lowCount} low
              </motion.span>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visibleItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}
            >
              <Package size={28} style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
            </div>
            <p className="text-base font-medium text-foreground">No items found</p>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              Start scanning receipts or add items manually to track your household inventory.
            </p>
          </motion.div>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <section key={category}>
              {/* Category label */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  {category}
                </h2>
                <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {catItems.length}
                </span>
              </div>

              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                <AnimatePresence>
                  {catItems.map(item => (
                    <InventoryCard key={item.id} item={item} userId={userId} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
