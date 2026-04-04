'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useAddInventoryItem, useDeleteInventoryItem } from '@/hooks/queries';
import Link from 'next/link';
import { Zap, Plus, X, Edit, Trash2 } from 'lucide-react';
import AIDialog from '@/components/AIDialog';
import BarcodeScanModal from '@/components/BarcodeScanModal';
import ReceiptScanModal from '@/components/ReceiptScanModal';
import CameraInventoryModal from '@/components/CameraInventoryModal';
import { Item, NewItem } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';

// Map Open Food Facts category strings → a sensible default string category
function mapOFFCategory(categoriesStr: string | undefined): string {
  if (!categoriesStr) return 'Kitchen';
  const cats = categoriesStr.toLowerCase();
  if (
    cats.includes('cleaning') ||
    cats.includes('household') ||
    cats.includes('detergent') ||
    cats.includes('dishwash') ||
    cats.includes('laundry') ||
    cats.includes('trash') ||
    cats.includes('paper')
  ) return 'Cleaning';

  if (
    cats.includes('cosmetics') ||
    cats.includes('bathroom') ||
    cats.includes('toilet') ||
    cats.includes('soap') ||
    cats.includes('shampoo') ||
    cats.includes('hygiene')
  ) return 'Bathroom';

  if (
    cats.includes('pantry') ||
    cats.includes('groceries') ||
    cats.includes('snack') ||
    cats.includes('canned') ||
    cats.includes('dry') ||
    cats.includes('baking')
  ) return 'Pantry';

  return 'Kitchen'; // default
}

function parseUnit(quantityStr: string | undefined): string {
  if (!quantityStr) return 'pc';
  const lower = quantityStr.toLowerCase();
  if (lower.includes('ml')) return 'ml';
  if (lower.includes(' l')) return 'L';
  if (lower.includes('g')) return 'g';
  if (lower.includes('kg')) return 'kg';
  if (lower.includes('oz')) return 'oz';
  if (lower.includes('lb')) return 'lb';
  return 'pc';
}

export default function InventoryPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: items = [], isLoading } = useInventory(householdId);
  const queryClient = useQueryClient();

  const allowedCategories: string[] | null =
    profile?.role === 'restricted' && profile.restricted_categories && profile.restricted_categories.length > 0
      ? profile.restricted_categories
      : null;

  const visibleItems = allowedCategories
    ? items.filter(item => item.category != null && allowedCategories.includes(item.category))
    : items;

  const [aiOpen, setAiOpen] = useState(false);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  // Manual Add/Edit State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<NewItem>({
    name: '',
    category: 'Pantry',
    quantity: 1,
    max_quantity: 1,
    threshold: 0,
    unit: 'pc',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: addItem } = useAddInventoryItem();
  const { mutateAsync: deleteItem } = useDeleteInventoryItem();

  const handleBarcodeScan = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
        {headers: {'User-Agent': 'TendedWebApp/1.0'}},
      );
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        setQuickFeedback(`Error: Product not found.`);
        setTimeout(() => setQuickFeedback(null), 4000);
        return false;
      }

      const p = json.product;
      const name =
        p.product_name_en?.trim() ||
        p.product_name?.trim() ||
        p.abbreviated_product_name?.trim() ||
        '';

      if (name) {
        await addItem({
          householdId,
          userId: profile?.id ?? '',
          item: {
            name: name,
            category: mapOFFCategory(p.categories),
            quantity: 1,
            unit: parseUnit(p.quantity) || 'pc',
            max_quantity: 1,
            threshold: 1,
          }
        });
        setQuickFeedback(`Added ${name}!`);
        setTimeout(() => setQuickFeedback(null), 3000);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const openManualAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Pantry',
      quantity: 1,
      max_quantity: 1,
      threshold: 0,
      unit: 'pc',
    });
    setIsManualModalOpen(true);
  };

  const openManualEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'Pantry',
      quantity: item.quantity,
      max_quantity: item.max_quantity,
      threshold: item.threshold,
      unit: item.unit || 'pc',
    });
    setIsManualModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setIsSaving(true);

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;

        // Invalidate cache
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
      } else {
        // Add new item
        await addItem({
          householdId,
          userId: profile.id,
          item: formData,
        });
      }
      setIsManualModalOpen(false);
    } catch (err) {
      console.error("Failed to save item", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteItem(itemId);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface-elevated border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-primary-blue">&larr; Back</Link>
          <div className="font-bold text-xl text-text-primary tracking-tight">Inventory</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openManualAdd} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:bg-white/5 transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Item</span>
          </button>
          <button onClick={() => setAiOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary-blue text-white rounded-md text-sm font-medium hover:bg-primary-blue/90 transition-colors">
            <Zap size={16} />
            <span className="hidden sm:inline">Quick Capture</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleItems.map(item => {
              const pct = Math.min(100, Math.max(0, (item.quantity / item.max_quantity) * 100));
              const isLow = (item.quantity / item.max_quantity) <= item.threshold;
              
              return (
                <div key={item.id} className="bg-surface-elevated rounded-xl p-5 border border-border shadow-sm relative">
                  <div className="absolute top-2 right-2 flex gap-1 bg-surface-elevated p-1 rounded-md">
                    <button onClick={() => openManualEdit(item)} className="p-1.5 text-text-secondary hover:text-primary-blue rounded-md hover:bg-white/5 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-text-secondary hover:text-danger-red rounded-md hover:bg-danger-red/10 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-4 pr-16">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary text-lg truncate">{item.name}</h3>
                      <p className="text-sm text-text-secondary">{item.category}</p>
                    </div>
                    {isLow && (
                      <span className="bg-danger-red-light text-danger-red px-2 py-1 rounded text-xs font-bold">
                        Low Stock
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-text-secondary">Level</span>
                    <span className="font-medium text-text-primary">{item.quantity} / {item.max_quantity} {item.unit}</span>
                  </div>
                  
                  <div className="h-2.5 w-full bg-border rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isLow ? 'bg-danger-red' : 'bg-success-green'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AIDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onTriggerScanner={(type) => {
          if (type === 'camera') setCameraOpen(true);
          else if (type === 'barcode') setBarcodeOpen(true);
          else if (type === 'receipt') setReceiptOpen(true);
        }}
      />

      <CameraInventoryModal
        visible={cameraOpen}
        householdId={householdId}
        onClose={() => setCameraOpen(false)}
      />

      <BarcodeScanModal
        visible={barcodeOpen}
        onScan={handleBarcodeScan}
        onClose={() => setBarcodeOpen(false)}
      />

      <ReceiptScanModal
        visible={receiptOpen}
        householdId={householdId}
        onClose={() => setReceiptOpen(false)}
      />

      {/* Manual Add/Edit Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-elevated rounded-xl p-6 w-full max-w-md border border-border relative">
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 text-text-primary">
              {editingItem ? 'Edit Item' : 'Add Item Manually'}
            </h2>

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text-secondary">Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue text-text-primary"
                  placeholder="e.g. Olive Oil"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-text-secondary">Category</label>
                <select
                  required
                  value={formData.category || 'Kitchen'}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue text-text-primary"
                >
                  <option value="Pantry">Pantry</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Bathroom">Bathroom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Current Qty</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Max Qty</label>
                  <input
                    required
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.max_quantity}
                    onChange={e => setFormData({...formData, max_quantity: parseFloat(e.target.value) || 1})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Threshold (reorder at)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.threshold}
                    onChange={e => setFormData({...formData, threshold: parseFloat(e.target.value) || 0})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Unit</label>
                  <input
                    required
                    type="text"
                    value={formData.unit || ''}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    placeholder="pc, kg, L..."
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue text-text-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary-blue text-white hover:bg-primary-blue/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
