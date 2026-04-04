'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUpdateQuantity, useInventory } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';
import { fuzzyMatchInventory } from '@/utils/fuzzyMatch';
import { X, Upload, Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Item } from '@/types/models';

interface FoundItem {
  name: string;
  category: string;
  stock_level: number; // 0-100
  matched_item?: Item;
}

interface Props {
  visible: boolean;
  householdId: string;
  onClose: () => void;
}

export default function CameraInventoryModal({ visible, householdId, onClose }: Props) {
  const { profile } = useAuthStore();
  const { mutateAsync: updateQuantity } = useUpdateQuantity();
  const { data: inventoryItems = [] } = useInventory(householdId);

  const [step, setStep] = useState<'pick' | 'processing' | 'review'>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log('[CameraInventoryModal] No files selected');
      return;
    }
    const file = e.target.files[0];
    console.log('[CameraInventoryModal] File selected:', file.name, file.size, file.type);
    const uri = URL.createObjectURL(file);
    setImageUri(uri);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = (reader.result as string).split(',')[1];
      console.log('[CameraInventoryModal] Image read as base64, starting processImage');
      processImage(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setStep('processing');
    setErrorText('');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { action: 'inventory', image: base64 },
      });

      if (error) throw error;

      if (data && data.items) {
        const enrichedItems = data.items.map((item: any) => {
          const match = fuzzyMatchInventory(item.name, inventoryItems);
          return { ...item, matched_item: match };
        });
        setFoundItems(enrichedItems);
      } else {
        setErrorText('Could not detect items. Please try a clearer photo.');
      }
      setStep('review');
    } catch (err) {
      console.error(err);
      setErrorText('Failed to analyze pantry.');
      setStep('pick');
    }
  };

  const handleSyncItems = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      for (const item of foundItems) {
        if (item.matched_item) {
          // Convert stock_level (0-100) to quantity
          const newQty = Math.round((item.stock_level / 100) * (item.matched_item.max_quantity || 10));
          await updateQuantity({
            itemId: item.matched_item.id,
            userId: profile.id,
            oldQuantity: item.matched_item.quantity,
            newQuantity: newQty,
            item: item.matched_item,
          });
        }
      }
      handleClose();
    } catch {
      setErrorText('Failed to sync inventory.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep('pick');
    setImageUri(null);
    setFoundItems([]);
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
        <h2 className="text-lg font-bold text-text-primary">Scan Pantry</h2>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 'pick' && (
          <div className="flex flex-col items-center justify-center h-full p-6 max-w-sm mx-auto text-center">
            <div className="w-20 h-20 bg-primary-blue-light text-primary-blue rounded-full mb-6 flex items-center justify-center">
              <Camera size={36} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Scan Your Pantry</h3>
            <p className="text-text-secondary mb-8 leading-relaxed">
              Take a photo of your shelves to automatically update stock levels.
            </p>
            
            {errorText && (
              <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300 text-red-700 w-full flex gap-3 text-left items-start">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">{errorText}</span>
              </div>
            )}

            <label className="w-full py-4 bg-primary-blue hover:bg-opacity-90 text-white rounded-xl font-medium tracking-wide shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all">
              <Upload size={20} />
              Take or Upload Photo
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
            
            <p className="mt-4 text-xs text-text-secondary">
              Direct camera access requested on supported mobile browsers.
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {imageUri && (
              <img src={imageUri} alt="pantry" className="w-64 max-h-64 object-contain opacity-50 mb-8 rounded-lg shadow-sm" />
            )}
            <Loader2 className="animate-spin text-primary-blue mb-4" size={40} />
            <p className="text-lg font-medium text-text-secondary">Detecting items in pantry...</p>
          </div>
        )}

        {step === 'review' && (
          <div className="p-6 pb-24 max-w-lg mx-auto w-full">
            <h3 className="text-xl font-bold text-text-primary mb-1">Detected Items</h3>
            <p className="text-sm text-text-secondary mb-6">Review the found items and their estimated stock levels.</p>

            <div className="space-y-4">
              {foundItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-surface flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-blue-light text-primary-blue flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {item.stock_level}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{item.name}</div>
                    <div className="text-xs text-text-secondary">
                      {item.matched_item ? `Matched with ${item.matched_item.name}` : 'No local match found'}
                    </div>
                  </div>
                  {item.matched_item && (
                    <div className="flex items-center gap-1 text-green text-[11px] font-bold uppercase tracking-wider">
                      <Check size={12} strokeWidth={3} />
                      Syncing
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sticky Actions */}
            <div className="fixed bottom-0 inset-x-0 p-6 bg-background/80 backdrop-blur-md border-t border-border">
              <button
                onClick={handleSyncItems}
                disabled={saving || foundItems.filter(i => i.matched_item).length === 0}
                className="w-full py-4 bg-primary-blue hover:bg-opacity-90 disabled:opacity-50 text-white rounded-xl font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                {saving ? 'Syncing...' : `Confirm & Sync ${foundItems.filter(i => i.matched_item).length} Items`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
