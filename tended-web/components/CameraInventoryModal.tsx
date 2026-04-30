'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';

import { useAuthStore } from '../store/authStore';
import { useInventory, useAddInventoryItem } from '../hooks/queries';
const getUniqueCategories = (items: any[]) => Array.from(new Set(items.map(i => i.category).filter(Boolean)));
import type { NewItem } from '../types/models';
import { supabase } from '../lib/supabase';

type Props = { visible: boolean; householdId: string; onClose: () => void };
type Step = 'pick' | 'analyzing' | 'review' | 'saving';
type IdentifiedItem = { name: string; category: string; quantity: number; max_quantity: number; threshold: number; unit: string | null; checked: boolean };

async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 800;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
      resolve(dataUrl.split(',')[1]); // return raw base64
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function CameraInventoryModal({ visible, householdId, onClose }: Props) {
  const { profile } = useAuthStore();
  const { data: items = [] } = useInventory(householdId);
  const { mutateAsync: addItem } = useAddInventoryItem();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('pick');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [identified, setIdentified] = useState<IdentifiedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const categorySuggestions =
    getUniqueCategories(items).length > 0
      ? getUniqueCategories(items)
      : ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

  const reset = () => {
    setStep('pick');
    setPhotoDataUrl(null);
    setIdentified([]);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setError(null);
    setStep('analyzing');

    try {
      const base64 = await compressImageToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoDataUrl(previewUrl);

      const { data, error: fnError } = await supabase.functions.invoke('analyze-image', {
        body: { action: 'inventory', image: base64 },
      });

      if (fnError) throw new Error(fnError.message ?? 'Edge function failed');

      if (data?.items) {
        setIdentified(
          data.items.map((item: { name: string; category: string; stock_level?: number; unit?: string }) => ({
            name: item.name,
            category: item.category,
            quantity: Math.round(((item.stock_level || 50) / 100) * 10) / 10,
            max_quantity: 1,
            threshold: 0.25,
            unit: item.unit || null,
            checked: true,
          }))
        );
      } else {
        setIdentified([]);
      }
      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image.');
      setStep('pick');
    }
  };

  const toggleItem = (index: number) =>
    setIdentified(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item));

  const updateItem = (index: number, field: 'name' | 'category', value: string) =>
    setIdentified(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));

  const handleAddAll = async () => {
    if (!profile?.household_id || !profile?.id) return;
    setStep('saving');
    const toAdd = identified.filter(i => i.checked && i.name.trim());
    for (const item of toAdd) {
      const newItem: NewItem = {
        name: item.name.trim(),
        category: item.category.trim() || null,
        quantity: item.quantity,
        max_quantity: item.max_quantity,
        threshold: item.threshold,
        unit: item.unit,
      };
      try {
        await addItem({ householdId: profile.household_id, userId: profile.id, item: newItem });
      } catch (e) { console.error(e); }
    }
    handleClose();
  };

  const selectedCount = identified.filter(i => i.checked).length;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-[20px] p-4">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button onClick={handleClose} className="text-sm text-text-secondary hover:text-foreground transition-colors">Cancel</button>
          <h2 className="text-sm font-semibold">
            {step === 'pick' && 'Scan Items'}
            {step === 'analyzing' && 'Analyzing…'}
            {step === 'review' && `${identified.length} item${identified.length !== 1 ? 's' : ''} found`}
            {step === 'saving' && 'Saving…'}
          </h2>
          <div className="w-12" />
        </div>

        {/* Pick step */}
        {step === 'pick' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
            <div className="text-4xl">📷</div>
            <div className="text-center">
              <p className="text-base font-medium text-foreground mb-1">Scan your pantry</p>
              <p className="text-sm text-text-secondary">Take a photo of any shelf, fridge, or cupboard. AI will identify what it sees.</p>
            </div>
            {error && (
              <div className="w-full px-4 py-3 rounded-lg bg-red/10 border border-red/30 text-sm text-red">
                {error}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl bg-primary-blue text-white font-semibold text-sm hover:bg-primary-blue/90 transition-colors"
            >
              Take Photo
            </button>
            <input
              type="file"
              accept="image/*"
              id="camera-gallery-input"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="camera-gallery-input"
              className="w-full py-3 rounded-xl bg-surface-elevated border border-border text-foreground font-medium text-sm text-center cursor-pointer hover:bg-white/5 transition-colors"
            >
              Choose from Library
            </label>
            <p className="text-xs text-text-secondary text-center">💡 Works best with good lighting and items visible</p>
          </div>
        )}

        {/* Analyzing step */}
        {step === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            {photoDataUrl && (
              <Image src={photoDataUrl} alt="Preview" width={128} height={128} className="w-32 h-32 rounded-xl object-cover opacity-60" unoptimized />
            )}
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue" />
            <p className="text-base font-medium">Identifying items…</p>
            <p className="text-sm text-text-secondary">AI is scanning your photo</p>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && (
          <>
            <p className="text-xs text-text-secondary px-5 py-2 border-b border-border">
              Tap to deselect, or edit names and categories
            </p>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {identified.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-opacity ${
                    item.checked ? 'bg-surface-elevated border-border' : 'bg-transparent border-border/30 opacity-50'
                  }`}
                >
                  <button
                    role="checkbox"
                    aria-checked={item.checked}
                    aria-label={`Select ${item.name}`}
                    onClick={() => toggleItem(idx)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.checked ? 'bg-primary-blue border-primary-blue' : 'border-border bg-transparent'
                    }`}
                  >
                    {item.checked && <span className="text-white text-[10px] font-bold">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <input
                      value={item.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none border-b border-transparent focus:border-primary-blue pb-0.5 mb-2"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {categorySuggestions.map(cat => (
                        <button
                          key={cat}
                          aria-pressed={item.category === cat}
                          onClick={() => updateItem(idx, 'category', cat)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
                            item.category === cat
                              ? 'bg-primary-blue border-primary-blue text-white'
                              : 'border-border text-text-secondary bg-transparent hover:text-foreground'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {identified.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-6">No items identified. Try again with better lighting.</p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs text-text-secondary">{selectedCount} of {identified.length} selected</span>
              <button
                onClick={handleAddAll}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 rounded-xl bg-primary-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-primary-blue/90 transition-colors"
              >
                Add {selectedCount} item{selectedCount !== 1 ? 's' : ''} →
              </button>
            </div>
          </>
        )}

        {/* Saving step */}
        {step === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue" />
            <p className="text-base font-medium">Adding to inventory…</p>
          </div>
        )}
      </div>
    </div>
  );
}
