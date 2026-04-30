'use client';

import React, { useState } from 'react';
import Image from 'next/image';

import { useAuthStore } from '../store/authStore';
import { useInventory, useAddSpendingEntry, useRestockFromReceipt } from '../hooks/queries';
import { fuzzyMatchInventory } from '../utils/fuzzyMatch';
import type { NewSpendingEntry, Item } from '../types/models';

const CATEGORIES = ['Groceries', 'Dining', 'Household', 'Pets', 'Personal'];

type Props = { visible: boolean; householdId: string; onClose: () => void };
type Step = 'pick' | 'processing' | 'review' | 'inventoryMatch';
import type { SpendingCategory } from '../types/models';
import { supabase } from '../lib/supabase';

type LineItem = { item: string; amount: string; category: SpendingCategory };
type RestockProposal = { inventoryItem: Item; addQuantity: number; approved: boolean };

const fmtQty = (num: number) => num % 1 === 0 ? num.toString() : num.toFixed(1);

async function compressImageToBase64(file: File): Promise<{ base64: string, previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const previewUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 800;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
      resolve({ base64: dataUrl.split(',')[1], previewUrl });
    };
    img.onerror = reject;
    img.src = previewUrl;
  });
}

export default function ReceiptScanModal({ visible, householdId, onClose }: Props) {
  const { profile } = useAuthStore();
  const { mutateAsync: addEntry } = useAddSpendingEntry();
  const { mutateAsync: restockFromReceipt } = useRestockFromReceipt();
  const { data: inventoryItems = [] } = useInventory(householdId);

  const [step, setStep] = useState<Step>('pick');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [restockProposals, setRestockProposals] = useState<RestockProposal[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setErrorMsg(null);
    setStep('processing');

    try {
      const { base64, previewUrl } = await compressImageToBase64(file);
      setImagePreview(previewUrl);

      const { data, error: fnError } = await supabase.functions.invoke('analyze-image', {
        body: { action: 'receipt', image: base64 },
      });

      if (fnError) throw new Error(fnError.message ?? 'Edge function failed');

      if (data?.items) {
        setLineItems(data.items);
      } else {
        setLineItems([]);
        setErrorMsg('Could not parse receipt. Add items manually below.');
      }
      setStep('review');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze receipt.');
      setStep('pick');
    }
  };

  const handleUpdateItem = (index: number, field: keyof LineItem, value: string) =>
    setLineItems(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });

  const handleRemoveItem = (index: number) =>
    setLineItems(prev => prev.filter((_, i) => i !== index));

  const handleAddItem = () =>
    setLineItems(prev => [...prev, { item: '', amount: '', category: 'Groceries' }]);

  const handleContinue = () => {
    const matched: RestockProposal[] = lineItems
      .filter(li => li.item.trim())
      .reduce<RestockProposal[]>((acc, li) => {
        const match = fuzzyMatchInventory(li.item, inventoryItems);
        if (match && !acc.find(p => p.inventoryItem.id === match.id)) {
          acc.push({ inventoryItem: match, addQuantity: 1, approved: true });
        }
        return acc;
      }, []);

    if (matched.length === 0) { saveSpendingEntries(); return; }
    setRestockProposals(matched);
    setStep('inventoryMatch');
  };

  const saveSpendingEntries = async () => {
    if (!profile?.id) return;
    const valid = lineItems.filter(li => li.item.trim() && parseFloat(li.amount) > 0);
    if (valid.length === 0) {
      setErrorMsg('Please ensure each item has a name and a valid amount.');
      return;
    }
    setSaving(true);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (const li of valid) {
      const entry: NewSpendingEntry = {
        amount: parseFloat(li.amount),
        category: li.category,
        item_name: li.item.trim(),
        date: dateStr,
        is_waste: false,
      };
      await addEntry({ householdId, userId: profile.id, entry });
    }
    setSaving(false);
    handleClose();
  };

  const handleApplyRestocks = async () => {
    if (!profile?.id) return;
    setSaving(true);
    const approved = restockProposals.filter(p => p.approved);
    if (approved.length > 0) {
      await restockFromReceipt({
        proposals: approved.map(p => ({ item: p.inventoryItem, addQuantity: p.addQuantity })),
        userId: profile.id,
        householdId,
      });
    }
    await saveSpendingEntries();
  };

  const handleClose = () => {
    setStep('pick');
    setImagePreview(null);
    setLineItems([]);
    setRestockProposals([]);
    setErrorMsg(null);
    onClose();
  };

  const totalAmount = lineItems.map(li => parseFloat(li.amount) || 0).reduce((s, n) => s + n, 0);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-[20px] p-4">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-white/20 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <button onClick={handleClose} className="text-sm text-text-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue rounded-md px-1">Cancel</button>
          <h2 className="text-sm font-semibold">
            {step === 'pick' && 'Scan Receipt'}
            {step === 'processing' && 'Reading receipt…'}
            {step === 'review' && 'Review Items'}
            {step === 'inventoryMatch' && 'Restock Inventory?'}
          </h2>
          <div className="w-12" />
        </div>

        {/* Pick step */}
        {step === 'pick' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
            <div className="w-16 h-16 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-3xl">🧾</div>
            <div className="text-center">
              <p className="text-base font-medium mb-1">Import a receipt</p>
              <p className="text-sm text-text-secondary">Take a photo or upload from your device to auto-populate spending entries.</p>
            </div>
            {errorMsg && (
              <div className="w-full px-4 py-3 rounded-lg bg-red/10 border border-red/30 text-sm text-red">{errorMsg}</div>
            )}
            <label className="w-full py-3 rounded-xl bg-primary-blue text-white font-semibold text-sm text-center cursor-pointer hover:bg-primary-blue/90 transition-colors">
              Take Photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </label>
            <label className="w-full py-3 rounded-xl bg-surface-elevated border border-border text-foreground font-medium text-sm text-center cursor-pointer hover:bg-white/5 transition-colors">
              Choose from Library
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {/* Processing step */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            {imagePreview && (
              <Image src={imagePreview} alt="Receipt preview" width={400} height={200} className="w-full max-h-48 object-contain rounded-xl opacity-50" unoptimized />
            )}
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue" />
            <p className="text-sm text-text-secondary">Reading receipt...</p>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {imagePreview && (
                <Image src={imagePreview} alt="Receipt" width={400} height={128} className="w-full h-32 object-cover rounded-xl opacity-70" unoptimized />
              )}
              {errorMsg && (
                <div className="px-4 py-3 rounded-lg bg-amber/10 border border-amber/30 text-sm text-amber">{errorMsg}</div>
              )}
              <div>
                <p className="text-sm font-medium mb-0.5">Review extracted items</p>
                <p className="text-xs text-text-secondary">Edit names, amounts, or categories before saving.</p>
              </div>

              {lineItems.map((li, index) => (
                <div key={index} className="p-3 rounded-xl bg-surface-elevated border border-border flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      value={li.item}
                      onChange={e => handleUpdateItem(index, 'item', e.target.value)}
                      placeholder="Item name"
                      className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                    />
                    <div className="flex items-center bg-background border border-border rounded-lg px-2.5 min-w-[90px]">
                      <span className="text-text-secondary text-sm mr-1">$</span>
                      <input
                        type="number"
                        value={li.amount}
                        onChange={e => handleUpdateItem(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent text-sm w-16 focus:outline-none py-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        aria-pressed={li.category === cat}
                        onClick={() => handleUpdateItem(index, 'category', cat)}
                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
                          li.category === cat
                            ? 'bg-primary-blue border-primary-blue text-white'
                            : 'border-border text-text-secondary hover:text-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="ml-auto text-xs text-red hover:text-red/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red rounded-sm px-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddItem}
                className="py-3 rounded-xl border border-dashed border-border text-sm text-text-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
              >
                + Add item
              </button>
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0">
              <div>
                <p className="text-xs text-text-secondary">Total</p>
                <p className="text-sm font-semibold">${totalAmount.toFixed(2)}</p>
              </div>
              <button
                onClick={handleContinue}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-primary-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-primary-blue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </>
        )}

        {/* Inventory match step */}
        {step === 'inventoryMatch' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium mb-0.5">Restock inventory?</p>
                <p className="text-xs text-text-secondary">These items match your inventory. Toggle to apply.</p>
              </div>

              {restockProposals.map((proposal, idx) => {
                const item = proposal.inventoryItem;
                const newQty = Math.min(item.quantity + proposal.addQuantity, item.max_quantity);
                const barPct = Math.min(100, (item.quantity / item.max_quantity) * 100);
                const newBarPct = Math.min(100, (newQty / item.max_quantity) * 100);
                const unitLabel = item.unit ? ` ${item.unit}` : '';

                return (
                  <div key={idx} className={`p-4 rounded-xl bg-surface-elevated border border-border flex flex-col gap-3 transition-opacity ${!proposal.approved ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex-1">{item.name}</p>
                      <button
                        role="switch"
                        aria-checked={proposal.approved}
                        aria-label={`Restock ${item.name}`}
                        onClick={() => setRestockProposals(prev => prev.map((p, i) => i === idx ? { ...p, approved: !p.approved } : p))}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
                          proposal.approved ? 'bg-green/20 border-green text-green' : 'border-border text-text-secondary'
                        }`}
                      >
                        {proposal.approved ? 'On' : 'Off'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-text-secondary text-xs">→</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-green transition-all" style={{ width: `${newBarPct}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>{fmtQty(item.quantity)}{unitLabel} → <span className="text-green font-medium">{fmtQty(newQty)}{unitLabel}</span></span>
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={`Decrease restock quantity for ${item.name}`}
                          onClick={() => setRestockProposals(prev => prev.map((p, i) => i === idx ? { ...p, addQuantity: Math.max(0.5, p.addQuantity - 0.5) } : p))}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                        >−</button>
                        <span>+{fmtQty(proposal.addQuantity)}{unitLabel}</span>
                        <button
                          aria-label={`Increase restock quantity for ${item.name}`}
                          onClick={() => setRestockProposals(prev => prev.map((p, i) => i === idx ? { ...p, addQuantity: p.addQuantity + 0.5 } : p))}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                        >+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
              <button
                onClick={saveSpendingEntries}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-foreground disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Skip, save spending only
              </button>
              <button
                onClick={handleApplyRestocks}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-primary-blue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {saving ? 'Saving…' : 'Apply Restocks'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
