'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAddSpendingEntry, useInventory, useRestockFromReceipt, useAddInventoryItem } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';
import { fuzzyMatchInventory } from '@/utils/fuzzyMatch';
import { SpendingCategory, NewSpendingEntry, Item } from '@/types/models';
import { X, Upload, Camera, ArrowRight, Minus, Plus, Loader2, Check } from 'lucide-react';
import { compressImage } from '@/utils/imageCompressor';

const CATEGORIES: SpendingCategory[] = ['Groceries', 'Cleaning', 'Pantry', 'Personal care'];

interface LineItem {
  item: string;
  amount: string;
  category: SpendingCategory;
}

interface RestockProposal {
  inventoryItem?: Item;
  newItemName?: string;
  newItemCategory?: string;
  addQuantity: number;
  approved: boolean;
}

interface Props {
  visible: boolean;
  householdId: string;
  onClose: () => void;
}

type Step = 'pick' | 'processing' | 'review' | 'inventoryMatch';

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export default function ReceiptScanModal({ visible, householdId, onClose }: Props) {
  const { profile } = useAuthStore();
  const { mutateAsync: addEntry } = useAddSpendingEntry();
  const { mutateAsync: restockFromReceipt } = useRestockFromReceipt();
  const { mutateAsync: addInventoryItem } = useAddInventoryItem();
  const { data: inventoryItems = [] } = useInventory(householdId);

  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [restockProposals, setRestockProposals] = useState<RestockProposal[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log('[ReceiptScanModal] No files selected');
      return;
    }
    const file = e.target.files[0];
    console.log('[ReceiptScanModal] File selected:', file.name, file.size, file.type);
    
    const uri = URL.createObjectURL(file);
    setImageUri(uri);
    setStep('processing');
    setErrorText('');

    try {
      console.log('[ReceiptScanModal] Compressing image...');
      const base64Str = await compressImage(file, 1); // target 1MB
      console.log('[ReceiptScanModal] Image compressed, starting processImage');
      processImage(base64Str);
    } catch (err) {
      console.error('[ReceiptScanModal] Image compression error:', err);
      setErrorText('Failed to process receipt image. Please try another.');
      setStep('pick');
    }
  };

  const processImage = async (base64: string) => {
    try {
      console.log('[ReceiptScanModal] Invoking analyze-image API route...');
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'receipt', image: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[ReceiptScanModal] API route error:', errorData);
        const errorMessage = errorData?.error || 'Error invoking API route';
        const rawDetails = errorData ? JSON.stringify(errorData, null, 2) : await response.text();
        throw new Error(`${errorMessage} | RAW_DETAILS: ${rawDetails}`);
      }

      const data = await response.json();
      console.log('[ReceiptScanModal] Response data:', data);

      let parsedData = data;
      if (typeof data === 'string') {
        try {
          // Strip potential markdown code blocks like ```json ... ```
          let cleanData = data.trim();
          if (cleanData.startsWith('```')) {
            cleanData = cleanData.replace(/^```(json)?/, '').replace(/```$/, '').trim();
          }
          parsedData = JSON.parse(cleanData);
        } catch (e) {
          console.error('[ReceiptScanModal] Failed to parse JSON response:', e);
          throw new Error('Invalid JSON response from AI');
        }
      }

      if (parsedData && parsedData.items && Array.isArray(parsedData.items)) {
        console.log(`[ReceiptScanModal] Successfully parsed ${parsedData.items.length} items`);
        setLineItems(parsedData.items);
        setStep('review');
      } else {
        console.warn('[ReceiptScanModal] No items array found in parsed data:', parsedData);
        setErrorText('Could not parse receipt. Please add manually.');
        setStep('pick');
      }
    } catch (err: unknown) {
      console.error('[ReceiptScanModal] processImage catch block error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error occurred.';
      setErrorText(`Failed to analyze receipt: ${msg}`);
      setStep('pick');
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<LineItem>) => {
    const newList = [...lineItems];
    newList[index] = { ...newList[index], ...updates };
    setLineItems(newList);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const saveSpendingEntries = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setErrorText('');

    try {
      // 1. Create Spending Entries
      for (const li of lineItems) {
        const entry: NewSpendingEntry = {
          amount: parseFloat(li.amount) || 0,
          category: li.category,
          item_name: li.item,
          date: new Date().toISOString(),
          is_waste: false,
        };
        await addEntry({
          householdId,
          userId: profile.id,
          entry
        });
      }

      // 2. Prepare Inventory Matches (propose all for restock/add)
      const proposals: RestockProposal[] = lineItems.map(li => {
        const match = fuzzyMatchInventory(li.item, inventoryItems);
        return {
          inventoryItem: match as Item | undefined,
          newItemName: li.item,
          newItemCategory: li.category,
          addQuantity: 1, // Default restock/add qty
          approved: true // Default to adding all, user can opt out
        };
      });

      if (proposals.length > 0) {
        setRestockProposals(proposals);
        setStep('inventoryMatch');
      } else {
        handleClose();
      }
    } catch (err) {
      console.error(err);
      setErrorText('Failed to save spending entries.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishRestock = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const approvedProposals = restockProposals.filter(p => p.approved);

      const toRestock = approvedProposals.filter(p => p.inventoryItem);
      const toAdd = approvedProposals.filter(p => !p.inventoryItem);

      if (toRestock.length > 0) {
        await restockFromReceipt({
          proposals: toRestock.map(p => ({
            item: p.inventoryItem!,
            addQuantity: p.addQuantity
          })),
          userId: profile.id,
          householdId
        });
      }

      for (const proposal of toAdd) {
        await addInventoryItem({
          householdId,
          userId: profile.id,
          item: {
            name: proposal.newItemName || 'Unknown Item',
            category: proposal.newItemCategory || 'Pantry',
            quantity: proposal.addQuantity,
            max_quantity: 1, // Deprecated but required by DB constraints for now
            threshold: 0,
            unit: 'pc'
          }
        });
      }

      handleClose();
    } catch (err) {
      console.error(err);
      setErrorText('Failed to update inventory.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep('pick');
    setImageUri(null);
    setLineItems([]);
    setRestockProposals([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated flex-shrink-0">
        <button onClick={handleClose} className="text-text-secondary hover:text-text-primary font-medium px-2 py-1">
          Cancel
        </button>
        <h2 className="text-lg font-bold text-text-primary">
          {step === 'inventoryMatch' ? 'Sync Inventory' : 'Scan Receipt'}
        </h2>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 'pick' && (
          <div className="flex flex-col items-center justify-center h-full p-6 max-w-sm mx-auto text-center">
            <div className="w-20 h-20 bg-primary-blue-light text-primary-blue rounded-full mb-6 flex items-center justify-center">
              <Camera size={36} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Import a receipt</h3>
            <p className="text-text-secondary mb-8">
              Upload a photo to auto-populate your spending entries.
            </p>
            
            {errorText && (
              <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-200 text-red-600 w-full text-sm text-left max-h-48 overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap">
                {errorText.replace(' | RAW_DETAILS: ', '\n\nDetails:\n')}
              </div>
            )}

            <label className="w-full py-4 bg-primary-blue hover:bg-opacity-90 text-white rounded-xl font-medium tracking-wide shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all">
              <Upload size={20} />
              Choose Photo
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {imageUri && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUri} alt="receipt" className="w-64 max-h-64 object-contain opacity-50 mb-8 rounded-lg shadow-sm" />
            )}
            <Loader2 className="animate-spin text-primary-blue mb-4" size={40} />
            <p className="text-lg font-medium text-text-secondary">Reading receipt data...</p>
          </div>
        )}

        {step === 'review' && (
          <div className="p-6 pb-32 max-w-lg mx-auto w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-primary">Review Items</h3>
              <span className="text-xs font-bold text-primary-blue bg-primary-blue-light px-2 py-1 rounded-md">
                {lineItems.length} items
              </span>
            </div>

            <div className="space-y-3">
              {lineItems.map((li, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-surface-elevated group">
                  <div className="flex justify-between items-start mb-2">
                    <input 
                      className="bg-transparent font-semibold text-text-primary focus:outline-none flex-1 truncate"
                      value={li.item}
                      onChange={(e) => handleUpdateItem(idx, { item: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">$</span>
                      <input 
                        className="bg-transparent font-bold text-text-primary w-16 text-right focus:outline-none"
                        value={li.amount}
                        onChange={(e) => handleUpdateItem(idx, { amount: e.target.value })}
                      />
                      <button onClick={() => handleRemoveItem(idx)} className="ml-2 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleUpdateItem(idx, { category: cat })}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-all whitespace-nowrap ${
                          li.category === cat 
                          ? 'bg-primary-blue border-primary-blue text-white font-bold' 
                          : 'border-border text-text-secondary'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-0 inset-x-0 p-6 bg-background/80 backdrop-blur-md border-t border-border">
              <button
                onClick={saveSpendingEntries}
                disabled={saving || lineItems.length === 0}
                className="w-full py-4 bg-primary-blue hover:bg-opacity-90 disabled:opacity-50 text-white rounded-xl font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                {saving ? 'Saving...' : 'Save & Review Inventory'}
              </button>
            </div>
          </div>
        )}

        {step === 'inventoryMatch' && (
          <div className="p-6 pb-32 max-w-lg mx-auto w-full">
            <h3 className="text-xl font-bold text-text-primary mb-2">Inventory Restock</h3>
            <p className="text-sm text-text-secondary mb-6">Which items would you like to add back to your inventory?</p>
            
            <div className="space-y-3">
              {restockProposals.map((p, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${
                    p.approved ? 'border-primary-blue bg-primary-blue/5' : 'border-border bg-surface'
                  }`}
                  onClick={() => {
                    const next = [...restockProposals];
                    next[idx].approved = !next[idx].approved;
                    setRestockProposals(next);
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    p.approved ? 'bg-primary-blue text-white' : 'bg-surface-elevated text-text-secondary'
                  }`}>
                    {p.approved ? <Check size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-border" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-text-primary">{p.inventoryItem?.name || p.newItemName}</div>
                    <div className="text-xs text-text-secondary">
                      {p.inventoryItem ? `Current: ${p.inventoryItem.quantity} ${p.inventoryItem.unit || ''}` : `New to inventory`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-surface-elevated p-1 rounded-lg" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        const next = [...restockProposals];
                        next[idx].addQuantity = Math.max(1, next[idx].addQuantity - 1);
                        setRestockProposals(next);
                      }}
                      className="w-6 h-6 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{p.addQuantity}</span>
                    <button 
                      onClick={() => {
                        const next = [...restockProposals];
                        next[idx].addQuantity += 1;
                        setRestockProposals(next);
                      }}
                      className="w-6 h-6 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-0 inset-x-0 p-6 bg-background/80 backdrop-blur-md border-t border-border">
              <button
                onClick={handleFinishRestock}
                disabled={saving}
                className="w-full py-4 bg-primary-green hover:bg-opacity-90 disabled:opacity-50 text-white rounded-xl font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: 'var(--primary-green, #10B981)' }}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                {saving ? 'Updating...' : 'Finish Restock'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
