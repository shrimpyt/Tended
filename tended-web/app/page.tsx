'use client';

import React, { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useSpendingEntries, useAddInventoryItem } from '@/hooks/queries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import AIDialog from '@/components/AIDialog';
import BarcodeScanModal from '@/components/BarcodeScanModal';
import ReceiptScanModal from '@/components/ReceiptScanModal';
import CameraInventoryModal from '@/components/CameraInventoryModal';
import { parseItem } from '@/utils/nlpParser';
import { fuzzyMatchInventory } from '@/utils/fuzzyMatch';

// ── Helpers ────────────────────────────────────────────────────────

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
    cats.includes('paper-towel') ||
    cats.includes('toilet-paper')
  ) return 'Cleaning';
  if (
    cats.includes('hygiene') ||
    cats.includes('beauty') ||
    cats.includes('personal-care') ||
    cats.includes('shampoo') ||
    cats.includes('soap') ||
    cats.includes('toothpaste') ||
    cats.includes('deodorant') ||
    cats.includes('cosmetic')
  ) return 'Bathroom';
  if (
    cats.includes('pasta') ||
    cats.includes('rice') ||
    cats.includes('cereal') ||
    cats.includes('flour') ||
    cats.includes('sugar') ||
    cats.includes('oil') ||
    cats.includes('sauce') ||
    cats.includes('condiment') ||
    cats.includes('canned') ||
    cats.includes('spice') ||
    cats.includes('coffee') ||
    cats.includes('tea') ||
    cats.includes('pantry')
  ) return 'Pantry';
  return 'Kitchen';
}

// Extract a clean unit from the quantity field
function parseUnit(quantity: string | undefined): string {
  if (!quantity) return '';
  const match = quantity.match(/\b(ml|l|g|kg|oz|lb|fl oz|count|rolls|sheets|pack)\b/i);
  return match ? match[1].toLowerCase() : '';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function isoWeek(offset = 0): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(mon), end: fmt(sun) };
}

interface InboxItem {
  id: string;
  raw_barcode: string;
  status: string;
  created_at: string;
}

function SortableInboxItem({ item }: { item: InboxItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 mb-2 bg-surface-elevated border border-border rounded cursor-grab active:cursor-grabbing hover:bg-surface-elevated/80"
    >
      <div className="text-sm font-medium">Scanned Barcode: {item.raw_barcode}</div>
      <div className="text-xs text-text-secondary">{new Date(item.created_at).toLocaleTimeString()}</div>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading: isLoadingInventory } = useInventory(householdId);

  const { data: inboxItems = [], isLoading: isLoadingInbox } = useQuery<InboxItem[], Error, InboxItem[]>({
    queryKey: ['inbox_scans', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from('inbox_scans')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'unparsed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!householdId,
  });

  const parseItemMutation = useMutation({
    mutationFn: async ({ id, category, name }: { id: string, category: string, name: string }) => {
      if (!householdId) return;

      await supabase.from('items').insert({
         household_id: householdId,
         name,
         category,
         stock_level: 100,
         threshold: 20,
      });

      await supabase.from('inbox_scans').update({ status: 'parsed' }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox_scans'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const { setNodeRef: setMainInventoryRef, isOver } = useDroppable({
    id: 'main-inventory',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<InboxItem | null>(null);
  const [itemName, setItemName] = useState("New Item");
  const [itemCategory, setItemCategory] = useState("Pantry");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === 'main-inventory') {
      const activeItem = inboxItems.find(i => i.id === active.id);
      if (activeItem) {
        setPendingItem(activeItem);
        setItemName("");
        setItemCategory("Pantry");
        setModalOpen(true);
      }
    }
  };

  const now = new Date();
  const [aiOpen, setAiOpen] = useState(false);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Quick Add state
  const [quickAdd, setQuickAdd] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading: loadingItems }     = useInventory(householdId);
  const { data: entries = [], isLoading: loadingEntries } = useSpendingEntries(householdId, now.getFullYear(), now.getMonth() + 1);
  const { mutateAsync: addItem } = useAddInventoryItem();

  const handleBarcodeScan = async (code: string): Promise<boolean> => {
    try {
      console.log('[Dashboard] Scanned barcode, looking up on OpenFoodFacts/OpenProductsFacts:', code);
      let res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
        {headers: {'User-Agent': 'TendedWebApp/1.0'}},
      );
      let json = await res.json();

      // Fallback to OpenProductsFacts for non-food items
      if (json.status !== 1 || !json.product) {
        res = await fetch(
          `https://world.openproductsfacts.org/api/v0/product/${code}.json`,
          {headers: {'User-Agent': 'TendedWebApp/1.0'}},
        );
        json = await res.json();
      }

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

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingItem && itemName && itemCategory) {
      parseItemMutation.mutate({ id: pendingItem.id, name: itemName, category: itemCategory });
      setModalOpen(false);
      setPendingItem(null);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 bg-surface-elevated border-b border-border shadow-sm flex items-center justify-between">
         <h1 className="text-xl font-bold">Command Center</h1>
      </header>

      <div className="flex-1 p-6 grid grid-cols-[200px_300px_1fr] gap-6 max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="border-r border-border pr-4">
          <nav className="flex flex-col gap-2 text-sm font-medium mb-8">
             <div className="px-3 py-2 bg-primary-blue/10 text-primary-blue rounded-md">Command Center</div>
             <div className="px-3 py-2 text-text-secondary hover:text-text-primary">Reports</div>
             <div className="px-3 py-2 text-text-secondary hover:text-text-primary">Family Settings</div>
          </nav>

          <Link href="/scan" className="block w-full bg-primary-blue text-white text-center py-2 rounded-md font-medium text-sm hover:bg-primary-blue/90 transition-colors">
            + Quick Capture
          </Link>
        </aside>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* Inbox Column */}
          <section className="bg-surface-elevated/50 p-4 border border-border rounded-xl flex flex-col">
            <h2 className="text-lg font-bold mb-4">Inbox Scans</h2>
            {isLoadingInbox ? (
              <div className="text-sm text-text-secondary">Loading...</div>
            ) : inboxItems.length === 0 ? (
              <div className="text-sm text-text-secondary text-center py-8">No unparsed scans.</div>
            ) : (
              <SortableContext items={inboxItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto pr-2">
                  {inboxItems.map(item => (
                     <SortableInboxItem key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>

          {/* Main Inventory Dropzone & Grid */}
          <section className="flex flex-col bg-surface-elevated/50 p-4 border border-border rounded-xl">
             <h2 className="text-lg font-bold mb-4">Main Inventory (Bulk Edit)</h2>

             {/* Drop zone wrapper component can just be a div we check in over.id */}
             <div
                ref={setMainInventoryRef}
                id="main-inventory"
                className={`flex-1 bg-surface-elevated border-2 border-dashed rounded-xl p-4 overflow-y-auto transition-colors ${isOver ? 'border-primary-blue bg-primary-blue/5' : 'border-border/50'}`}
             >
                {isLoadingInventory ? (
                   <div className="text-sm text-text-secondary">Loading...</div>
                ) : (
                   <table className="w-full text-left border-collapse text-sm">
                      <thead>
                         <tr className="border-b border-border">
                            <th className="py-2 font-medium text-text-secondary">Name</th>
                            <th className="py-2 font-medium text-text-secondary">Category</th>
                            <th className="py-2 font-medium text-text-secondary">Stock %</th>
                            <th className="py-2 font-medium text-text-secondary">Target</th>
                         </tr>
                      </thead>
                      <tbody>
                         {inventory.map(item => (
                            <tr key={item.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                               <td className="py-3 pr-4">
                                  <input
                                     defaultValue={item.name}
                                     className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-full"
                                  />
                               </td>
                               <td className="py-3 pr-4 text-text-secondary">{item.category}</td>
                               <td className="py-3 pr-4">
                                  <input
                                    type="number"
                                    defaultValue={Math.round((item.quantity / item.max_quantity) * 100)}
                                    className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-16"
                                  />
                               </td>
                               <td className="py-3">
                                  <input
                                    type="number"
                                    defaultValue={item.max_quantity}
                                    className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-16"
                                  />
                               </td>
                            </tr>
                         ))}
                         {inventory.length === 0 && (
                            <tr>
                               <td colSpan={4} className="py-8 text-center text-text-secondary">
                                  Drop items here from the Inbox to add them.
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                )}
             </div>
          </section>
        </DndContext>
      </div>

      {/* Parse Modal */}
      {modalOpen && pendingItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface-elevated rounded-xl p-6 w-full max-w-sm border border-border">
               <h2 className="text-xl font-bold mb-4">Add Scanned Item</h2>
               <div className="text-sm text-text-secondary mb-4 break-all">
                  Barcode: {pendingItem.raw_barcode}
               </div>

               <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
                  <div>
                     <label className="block text-sm font-medium mb-1 text-text-secondary">Name</label>
                     <input
                        required
                        type="text"
                        value={itemName}
                        onChange={e => setItemName(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        placeholder="e.g. Olive Oil"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium mb-1 text-text-secondary">Category</label>
                     <select
                        required
                        value={itemCategory}
                        onChange={e => setItemCategory(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                     >
                        <option value="Pantry">Pantry</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Bathroom">Bathroom</option>
                     </select>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                     <button
                        type="button"
                        onClick={() => {
                           setModalOpen(false);
                           setPendingItem(null);
                        }}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-background border border-border text-text-secondary hover:text-text-primary"
                     >
                        Cancel
                     </button>
                     <button
                        type="submit"
                        className="px-4 py-2 rounded-md text-sm font-medium bg-primary-blue text-white hover:bg-primary-blue/90"
                     >
                        Add to Inventory
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
