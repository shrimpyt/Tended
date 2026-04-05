'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useAddInventoryItem, useDeleteInventoryItem } from '@/hooks/queries';
import Link from 'next/link';
import { Zap, Plus, X, Edit, Trash2, Search, Package, Clock, AlertTriangle, MoreHorizontal } from 'lucide-react';
import AIDialog from '@/components/AIDialog';
import BarcodeScanModal from '@/components/BarcodeScanModal';
import ReceiptScanModal from '@/components/ReceiptScanModal';
import CameraInventoryModal from '@/components/CameraInventoryModal';
import { Item, NewItem } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import { mapOFFCategory, parseUnit } from '@/utils/productParsers';

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

  const lowStockCount = visibleItems.filter(item => item.quantity <= item.threshold).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#11131A]">
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-2xl font-bold text-white">Inventory Dashboard</h1>

           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                 <input
                    type="text"
                    placeholder="Search"
                    className="bg-[#1A1C23] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                 />
              </div>
              <button
                 onClick={openManualAdd}
                 className="w-9 h-9 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors"
              >
                 <Plus size={20} />
              </button>
              <button
                 onClick={() => setAiOpen(true)}
                 className="w-9 h-9 bg-[#1A1C23] border border-white/10 hover:bg-white/5 rounded-lg flex items-center justify-center text-white transition-colors"
                 title="Quick Capture"
              >
                 <Zap size={18} />
              </button>
           </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           {/* Card 1 */}
           <div className="bg-[#1A1C23] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                 <Package size={24} />
              </div>
              <div>
                 <p className="text-sm text-text-secondary font-medium">Total Items</p>
                 <p className="text-2xl font-bold text-white">{visibleItems.length} items</p>
              </div>
           </div>

           {/* Card 2 */}
           <div className="bg-[#1A1C23] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                 <AlertTriangle size={24} />
              </div>
              <div>
                 <p className="text-sm text-text-secondary font-medium">Low Stock</p>
                 <p className="text-2xl font-bold text-white">{lowStockCount} items</p>
              </div>
           </div>

           {/* Card 3 */}
           <div className="bg-[#1A1C23] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                 <Clock size={24} />
              </div>
              <div>
                 <p className="text-sm text-text-secondary font-medium">Expired</p>
                 <p className="text-2xl font-bold text-white">0 items</p>
              </div>
           </div>
        </div>

        {/* Inventory List */}
        <div>
           <h2 className="text-lg font-bold text-white mb-4">Recent Inventory</h2>

           <div className="bg-[#1A1C23] rounded-2xl border border-white/5 overflow-hidden">
             {isLoading ? (
               <div className="flex h-32 items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
               </div>
             ) : (
               <div className="divide-y divide-white/5">
                 {visibleItems.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary">No items found in inventory.</div>
                 ) : (
                    visibleItems.map(item => {
                      // Calculate a mock percentage based on threshold/quantity just for the UI
                      // Since user said progress bars aren't relevant, we'll just fake a 50% or calculate loosely
                      let percentage = 50;
                      if (item.quantity > 0 && item.threshold > 0) {
                         percentage = Math.min(100, (item.quantity / (item.threshold * 2)) * 100);
                      }

                      return (
                         <div key={item.id} className="flex items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary mr-4">
                               <Package size={20} />
                            </div>

                            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                               <div className="col-span-4">
                                  <h3 className="font-semibold text-white text-sm truncate">{item.name}</h3>
                                  <p className="text-xs text-text-secondary mt-0.5">{item.category}</p>
                               </div>

                               <div className="col-span-4">
                                  <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                                     <span>{Math.round(percentage)}% remaining</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                     <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                     />
                                  </div>
                               </div>

                               <div className="col-span-3 text-right">
                                  <span className="text-xs text-text-secondary">Expires: N/A</span>
                               </div>

                               <div className="col-span-1 flex justify-end">
                                  <button onClick={() => openManualEdit(item)} className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                     <MoreHorizontal size={18} />
                                  </button>
                               </div>
                            </div>
                         </div>
                      );
                    })
                 )}
               </div>
             )}
           </div>
        </div>
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
