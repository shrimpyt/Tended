'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useAddInventoryItem, useDeleteInventoryItem } from '@/hooks/queries';
import Link from 'next/link';
import { Zap, Plus, X, Edit, Trash2, Package, AlertTriangle, Clock, MoreHorizontal, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const match = quantityStr.match(/(?:\b|(?<=\d))(ml|l|g|kg|oz|lb|fl oz|count|rolls|sheets|pack)\b/i);
  if (match && match[1]) {
    const u = match[1].toLowerCase();
    if (u === 'l') return 'L';
    return u;
  }
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
        setQuickFeedback(`Product not found. Please add manually.`);
        setTimeout(() => setQuickFeedback(null), 4000);
        setFormData({ name: '', category: 'Pantry', quantity: 1, max_quantity: 1, threshold: 0, unit: 'pc' });
        setIsManualModalOpen(true);
        return true; // Return true to close scanner
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
        setQuickFeedback(`Product not found. Please add manually.`);
        setTimeout(() => setQuickFeedback(null), 4000);
        setFormData({ name: '', category: 'Pantry', quantity: 1, max_quantity: 1, threshold: 0, unit: 'pc' });
        setIsManualModalOpen(true);
        return true;
      }
    } catch (err) {
      console.error(err);
      setQuickFeedback(`Error looking up product. Please add manually.`);
      setTimeout(() => setQuickFeedback(null), 4000);
      setFormData({ name: '', category: 'Pantry', quantity: 1, max_quantity: 1, threshold: 0, unit: 'pc' });
      setIsManualModalOpen(true);
      return true;
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

  const handleUpdateQuantity = async (item: Item, newQuantity: number) => {
    if (newQuantity < 0) return;
    try {
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQuantity })
        .eq('id', item.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
      setQuickFeedback(`Updated ${item.name} quantity to ${newQuantity}`);
      setTimeout(() => setQuickFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to update quantity", err);
      setQuickFeedback(`Error updating ${item.name}`);
      setTimeout(() => setQuickFeedback(null), 3000);
    }
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
      <header className="bg-background/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-primary-blue">&larr; Back</Link>
          <div className="font-bold text-xl text-text-primary tracking-tight">Inventory</div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={openManualAdd} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:bg-white/5 transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Item</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={() => setAiOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary-blue text-white rounded-md text-sm font-medium hover:bg-primary-blue/90 transition-colors">
            <Zap size={16} />
            <span className="hidden sm:inline">Quick Capture</span>
          </motion.button>
        </div>
      </header>
      {quickFeedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-surface-elevated border border-border px-4 py-2 rounded-full shadow-lg">
          <p className="text-sm font-medium text-white">{quickFeedback}</p>
        </div>
      )}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Stats Row - Scrollable horizontally on mobile */}
        <div className="flex overflow-x-auto pb-6 gap-4 hide-scrollbar snap-x">
           <div className="min-w-[280px] sm:min-w-0 sm:flex-1 bg-[#1A1C23] rounded-2xl p-5 border border-white/5 flex items-center gap-4 snap-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                 <Package size={24} />
              </div>
              <div className="min-w-0">
                 <p className="text-sm text-text-secondary font-medium">Total Items</p>
                 <p className="text-2xl font-bold text-white truncate">{visibleItems.length}</p>
              </div>
           </div>

           <div className="min-w-[280px] sm:min-w-0 sm:flex-1 bg-[#1A1C23] rounded-2xl p-5 border border-white/5 flex items-center gap-4 snap-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                 <AlertTriangle size={24} />
              </div>
              <div className="min-w-0">
                 <p className="text-sm text-text-secondary font-medium">Low Stock</p>
                 <p className="text-2xl font-bold text-white truncate">
                   {visibleItems.filter(i => i.quantity <= i.threshold).length}
                 </p>
              </div>
           </div>

           <div className="min-w-[280px] sm:min-w-0 sm:flex-1 bg-[#1A1C23] rounded-2xl p-5 border border-white/5 flex items-center gap-4 snap-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                 <Clock size={24} />
              </div>
              <div className="min-w-0">
                 <p className="text-sm text-text-secondary font-medium">Recently Added</p>
                 <p className="text-2xl font-bold text-white truncate">-- items</p>
              </div>
           </div>
        </div>


{/* Inventory List */}
        <div>
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold text-white">Recent Inventory</h2>
           </div>

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
                      let percentage = 50;
                      if (item.quantity > 0 && item.threshold > 0) {
                         percentage = Math.min(100, (item.quantity / (item.threshold * 2)) * 100);
                      }

                      const isLowStock = item.quantity <= item.threshold;
                      return (
                         <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center p-4 sm:px-6 sm:py-4 hover:bg-white/[0.02] transition-colors gap-4 ${isLowStock ? 'bg-red-500/5 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)] animate-pulse-slow' : ''}`}>
                            {/* Mobile: Icon & Title Row */}
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary shrink-0">
                                 <Package size={20} />
                              </div>
                              <div className="flex-1 min-w-0 sm:w-48">
                                 <h3 className="font-semibold text-white text-sm truncate">{item.name}</h3>
                                 <p className="text-xs text-text-secondary mt-0.5 truncate">{item.category}</p>
                              </div>
                              {/* Mobile: Actions */}
                              <div className="flex sm:hidden shrink-0 gap-1">
                                <button onClick={() => openManualEdit(item)} className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                   <Edit size={18} />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-text-secondary hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                                   <Trash2 size={18} />
                                </button>
                              </div>
                            </div>

                            {/* Quick Adjust Quantity Controls */}
                            <div className="flex items-center gap-3">
                               <motion.button
                                  whileTap={{ scale: 0.9, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                                  onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                               >
                                  <Minus size={14} />
                               </motion.button>
                               <span className="text-white font-medium min-w-[2ch] text-center">{item.quantity}</span>
                               <motion.button
                                  whileTap={{ scale: 0.9, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                                  onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                               >
                                  <Plus size={14} />
                               </motion.button>
                            </div>

                            {/* Progress bar */}
                            <div className="flex-1 w-full min-w-0 hidden sm:block">
                               <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                                  <span>{Math.round(percentage)}% remaining</span>
                               </div>
                               <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                     className={`h-full rounded-full ${isLowStock ? 'bg-red-500' : 'bg-blue-500'}`}
                                     style={{ width: `${percentage}%` }}
                                  />
                               </div>
                            </div>

                            {/* Actions - Desktop right side */}
                            <div className="hidden sm:flex items-center gap-2 shrink-0 justify-end">
                               <button onClick={() => openManualEdit(item)} className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                  <Edit size={18} />
                               </button>
                               <button onClick={() => handleDelete(item.id)} className="p-2 text-text-secondary hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                                  <Trash2 size={18} />
                               </button>
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
