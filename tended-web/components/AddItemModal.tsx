'use client';

import React, { useState } from 'react';
import { useInventory, useAddInventoryItem } from '../hooks/queries';
import { NewItem, Item } from '../types/models';

import { useAuthStore } from '../store/authStore';

function getUniqueCategories(items: Item[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category && item.category.trim()) {
      seen.add(item.category.trim());
    }
  }
  return Array.from(seen).sort();
}

const DEFAULT_CATEGORY_SUGGESTIONS = ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddItemModal({ visible, onClose }: Props) {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: items = [] } = useInventory(householdId);
  const { mutateAsync: addItem } = useAddInventoryItem();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [maxQuantity, setMaxQuantity] = useState('1');
  const [threshold, setThreshold] = useState('0.25');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCategory('');
    setUnit('');
    setQuantity('1');
    setMaxQuantity('1');
    setThreshold('0.25');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    const qty = parseFloat(quantity);
    const maxQty = parseFloat(maxQuantity);
    const thresh = parseFloat(threshold);

    if (isNaN(qty) || qty < 0) {
      setError('Starting quantity must be 0 or more.');
      return;
    }
    if (isNaN(maxQty) || maxQty <= 0) {
      setError('Max quantity must be greater than 0.');
      return;
    }
    if (qty > maxQty) {
      setError('Starting quantity cannot exceed max quantity.');
      return;
    }
    if (isNaN(thresh) || thresh < 0) {
      setError('Reorder threshold must be 0 or more.');
      return;
    }

    setError(null);
    setLoading(true);

    const newItem: NewItem = {
      name: name.trim(),
      category: category.trim() || null,
      quantity: qty,
      max_quantity: maxQty,
      threshold: thresh,
      unit: unit.trim() || null,
    };

    try {
      await addItem({
        householdId: profile!.household_id!,
        userId: profile!.id,
        item: newItem,
      });
    } catch {
      setLoading(false);
      setError('Failed to save item. Please try again.');
      return;
    }

    setLoading(false);
    handleClose();
  };

  const qtyNum = parseFloat(quantity) || 0;
  const maxQtyNum = parseFloat(maxQuantity) || 1;
  const barPct = Math.min(100, Math.max(0, (qtyNum / maxQtyNum) * 100));
  const unitLabel = unit.trim() ? ` ${unit.trim()}` : '';
  const categorySuggestions = getUniqueCategories(items).length > 0 ? getUniqueCategories(items) : DEFAULT_CATEGORY_SUGGESTIONS;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/5 backdrop-blur-[20px] transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Dialog container */}
      <div className="glass relative w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/2 flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-sm text-text-secondary hover:text-foreground transition-colors w-16 text-left"
          >
            Cancel
          </button>
          <h2 className="text-sm font-semibold">Add Item</h2>
          <button
            onClick={handleSave}
            disabled={loading}
            className="text-sm text-primary-blue font-medium hover:text-primary-blue/80 transition-colors w-16 text-right disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {error && <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/30 text-sm text-red">{error}</div>}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Item name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dish Soap"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue transition-all"
            />
          </div>

          {/* Unit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Unit <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. bottles, rolls, kg"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue transition-all"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Category <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Kitchen, Pantry…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue transition-all"
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {categorySuggestions.map(chip => (
                <button
                  key={chip}
                  onClick={() => setCategory(chip)}
                  className="px-2.5 py-1 rounded-full text-xs border border-border text-text-secondary hover:text-foreground hover:border-primary-blue transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Quantity</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-1">Current{unitLabel}</p>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue transition-all"
                />
              </div>
              <span className="text-text-secondary text-lg pt-5">/</span>
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-1">Max{unitLabel}</p>
                <input
                  type="number"
                  value={maxQuantity}
                  onChange={e => setMaxQuantity(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue transition-all"
                />
              </div>
            </div>
          </div>

          {/* Stock preview bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-background border border-border/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barPct === 0 ? 'bg-red' : barPct <= 25 ? 'bg-amber' : 'bg-green'}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary font-medium w-9 text-right">{Math.round(barPct)}%</span>
          </div>

          {/* Threshold */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Reorder when below{unitLabel}</label>
            <input
              type="number"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue transition-all"
            />
            <p className="text-xs text-text-secondary">
              You&apos;ll be alerted when{unitLabel ? unitLabel.trim() : ' amount'} drops below this.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
