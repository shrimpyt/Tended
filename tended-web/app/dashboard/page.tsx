'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, AlertTriangle, Zap,
  Circle, CheckCircle2, ChevronRight,
  TrendingUp, TrendingDown, Package, BarChart2,
  Minus, Plus, Sparkles, Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  useInventory,
  useSpendingEntries,
  useShoppingList,
  useToggleShoppingListItem,
  useUpdateQuantity,
  useAddShoppingListItem,
  useAddWasteEvent,
  useAddInventoryItem,
  useUpdateItem,
} from '@/hooks/queries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeHousehold } from '@/hooks/useRealtimeHousehold';
import { supabase } from '@/lib/supabase';
import AIDialog from '@/components/AIDialog';
import BarcodeScanModal from '@/components/BarcodeScanModal';
import ReceiptScanModal from '@/components/ReceiptScanModal';
import CameraInventoryModal from '@/components/CameraInventoryModal';
import { parseItem } from '@/utils/nlpParser';
import { fuzzyMatchInventory } from '@/utils/fuzzyMatch';
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

// ── Helpers ────────────────────────────────────────────────────────

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

function CardHeader({
  icon: Icon,
  label,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
        <Icon size={14} className={iconColor} />
      </div>
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
    </div>
  );
}

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

// ── Main Dashboard Component ──────────────────────────────────────────────

export default function Dashboard() {
  const { profile, loading } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const now = new Date();

  useRealtimeHousehold(householdId);

  // --- MOBILE STATE & QUERIES ---
  const [aiOpen, setAiOpen] = useState(false);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  const { data: items = [], isLoading: loadingItems }     = useInventory(householdId);
  const { data: entries = [], isLoading: loadingEntries } = useSpendingEntries(householdId, now.getFullYear(), now.getMonth() + 1);
  const { data: shoppingItems = [], isLoading: loadingShopping } = useShoppingList(householdId);

  const { mutate: updateQuantity }  = useUpdateQuantity();
  const { mutate: addWasteEvent }   = useAddWasteEvent();
  const { mutateAsync: addItem } = useAddInventoryItem();
  const { mutate: updateItem } = useUpdateItem();

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
        const nowTimestamp = new Date().getTime();
        const isoDateString = new Date(nowTimestamp).toISOString();
        setPendingItem({ id: 'manual-' + nowTimestamp, raw_barcode: code, status: 'pending', created_at: isoDateString });
        setModalOpen(true);
        return true; // Return true to close the scanner modal
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
        const nowTimestamp = new Date().getTime();
        const isoDateString = new Date(nowTimestamp).toISOString();
        setPendingItem({ id: 'manual-' + nowTimestamp, raw_barcode: code, status: 'pending', created_at: isoDateString });
        setModalOpen(true);
        return true;
      }
    } catch (err) {
      console.error(err);
      setQuickFeedback(`Error looking up product. Please add manually.`);
      setTimeout(() => setQuickFeedback(null), 4000);
      const nowTimestamp = new Date().getTime();
        const isoDateString = new Date(nowTimestamp).toISOString();
        setPendingItem({ id: 'manual-' + nowTimestamp, raw_barcode: code, status: 'pending', created_at: isoDateString });
      setModalOpen(true);
      return true;
    }
  };

  const thisWeek = useMemo(() => isoWeek(0), []);
  const lastWeek = useMemo(() => isoWeek(-1), []);

  const { thisTotal, lastTotal, hasLastWeek } = useMemo(() => {
    let thisTotal = 0, lastTotal = 0, hasLastWeek = false;
    for (const e of entries) {
      if (e.date >= thisWeek.start && e.date <= thisWeek.end) thisTotal += e.amount;
      if (e.date >= lastWeek.start && e.date <= lastWeek.end) {
        lastTotal += e.amount;
        hasLastWeek = true;
      }
    }
    return { thisTotal, lastTotal, hasLastWeek };
  }, [entries, thisWeek, lastWeek]);

  const monthSpend = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  const lowStockItems    = useMemo(
    () => items.filter(i => i.quantity <= i.threshold),
    [items]
  );
  const wellStockedCount = items.length - lowStockItems.length;

  const pendingItems = useMemo(() => shoppingItems.filter(i => !i.completed), [shoppingItems]);

  const displayName = profile?.display_name ?? 'there';


  // --- DESKTOP STATE & QUERIES ---
  const queryClient = useQueryClient();
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

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingItem && itemName && itemCategory) {
      parseItemMutation.mutate({ id: pendingItem.id, name: itemName, category: itemCategory });
      setModalOpen(false);
      setPendingItem(null);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <>
      {/* =========================================================
          MOBILE VIEW (Hidden on Desktop)
          ========================================================= */}
      <div className="md:hidden min-h-screen bg-background pb-32">
        <div className="px-5 sm:px-8 pt-8 pb-3">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-1">
            Dashboard
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {displayName}
          </h1>
        </div>

        <div className="px-5 sm:px-8 pb-5">
           <button onClick={() => setAiOpen(true)} className="w-full flex items-center justify-center gap-2 py-4 bg-primary-blue text-white font-semibold rounded-2xl shadow-lg hover:bg-primary-blue/90 transition-all">
             <Zap size={20} />
             Quick Capture
           </button>
        </div>

        <div className="px-5 sm:px-8 grid grid-cols-1 gap-4 mt-2">
            {/* Attention Needed (Mobile) */}
            <div className="glass rounded-2xl p-5 flex flex-col">
              <CardHeader
                icon={AlertTriangle}
                label="Attention Needed"
                iconBg="bg-amber/10"
                iconColor="text-amber"
              />

              {lowStockItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 opacity-60">
                   <CheckCircle2 size={24} className="text-green mb-2" />
                   <p className="text-xs text-center text-text-secondary">All stocked up</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-3">
                  {lowStockItems.slice(0, 10).map(item => {
                    const isEmpty = item.quantity === 0;

                    const nudge = (delta: number) => {
                      updateQuantity({
                        itemId: item.id,
                        userId: profile?.id ?? '',
                        oldQuantity: item.quantity,
                        newQuantity: item.quantity + delta,
                        item,
                      });
                    };

                    const handleWaste = () => {
                      addWasteEvent({
                        householdId,
                        userId: profile?.id ?? '',
                        event: {
                          item_id: item.id,
                          item_name: item.name,
                          quantity: item.quantity,
                          unit: item.unit,
                          cost: 0,
                          reason: 'expired'
                        }
                      });
                      updateQuantity({
                        itemId: item.id,
                        userId: profile?.id ?? '',
                        oldQuantity: item.quantity,
                        newQuantity: 0,
                        item,
                      });
                    };

                    return (
                      <div key={item.id}>
                        <div className="flex items-center text-xs mb-1.5 gap-2">
                          <span className="font-medium text-foreground truncate flex-1">
                            {item.name}
                          </span>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => nudge(-1)}
                              disabled={item.quantity <= 0}
                              className="w-5 h-5 flex items-center justify-center rounded transition-all text-text-secondary hover:text-red hover:bg-red/10 disabled:opacity-20"
                            >
                              <Minus size={10} />
                            </button>
                            <span className={`w-10 text-center ${isEmpty ? 'text-red' : 'text-amber'}`}>
                              {isEmpty
                                ? 'Out'
                                : `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`}
                            </span>
                            <button
                              onClick={() => nudge(1)}
                              className="w-5 h-5 flex items-center justify-center rounded transition-all text-text-secondary hover:text-green hover:bg-green/10 disabled:opacity-20"
                            >
                              <Plus size={10} />
                            </button>

                            <button
                              onClick={handleWaste}
                              disabled={item.quantity <= 0}
                              className="w-5 h-5 flex items-center justify-center rounded transition-all text-text-secondary hover:text-red hover:bg-red/10 disabled:opacity-20 ml-1"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Household Status (Mobile) */}
            <div className="glass rounded-2xl p-5">
              <CardHeader
                icon={Package}
                label="Household"
                iconBg="bg-blue/10"
                iconColor="text-blue"
              />
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: items.length,        label: 'Items tracked', color: 'text-foreground' },
                  { value: wellStockedCount,     label: 'Well stocked',  color: 'text-green'      },
                  { value: lowStockItems.length, label: 'Low / empty',   color: 'text-amber'      },
                  { value: pendingItems.length,  label: 'In cart',       color: 'text-foreground' },
                ].map(({ value, label, color }) => (
                  <div key={label} className="rounded-xl p-3 bg-white/5">
                    <div className={`text-xl font-bold ${color}`}>{value}</div>
                    <div className="text-[11px] text-text-secondary mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
        </div>

        {/* Floating Modals for Mobile */}
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
          onManualEntry={async () => true}
          onScan={handleBarcodeScan}
          onClose={() => setBarcodeOpen(false)}
        />

        <ReceiptScanModal
          visible={receiptOpen}
          householdId={householdId}
          onClose={() => setReceiptOpen(false)}
        />
      </div>

      {/* =========================================================
          DESKTOP VIEW (Hidden on Mobile)
          ========================================================= */}
      <div className="hidden md:flex min-h-screen bg-background flex-col">
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

            <button onClick={() => setAiOpen(true)} className="w-full bg-primary-blue text-white text-center py-2 rounded-md font-medium text-sm hover:bg-primary-blue/90 transition-colors">
              + Quick Capture
            </button>
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

               <div
                  ref={setMainInventoryRef}
                  id="main-inventory"
                  className={`flex-1 bg-surface-elevated border-2 border-dashed rounded-xl p-4 overflow-y-auto transition-colors ${isOver ? 'border-primary-blue bg-primary-blue/5' : 'border-border/50'}`}
               >
                  {loadingItems ? (
                     <div className="text-sm text-text-secondary">Loading...</div>
                  ) : (
                     <table className="w-full text-left border-collapse text-sm">
                        <thead>
                           <tr className="border-b border-border">
                              <th className="py-2 font-medium text-text-secondary">Name</th>
                              <th className="py-2 font-medium text-text-secondary">Category</th>
                              <th className="py-2 font-medium text-text-secondary">Quantity</th>
                              <th className="py-2 font-medium text-text-secondary">Reorder At</th>
                           </tr>
                        </thead>
                        <tbody>
                           {items.map(item => (
                              <tr key={item.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                                 <td className="py-3 pr-4">
                                    <input
                                       defaultValue={item.name}
                                       onBlur={(e) => {
                                         if (e.target.value !== item.name) {
                                           updateItem({ itemId: item.id, updates: { name: e.target.value }});
                                         }
                                       }}
                                       className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-full"
                                    />
                                 </td>
                                 <td className="py-3 pr-4">
                                    <select
                                       defaultValue={item.category || 'Kitchen'}
                                       onChange={(e) => {
                                         if (e.target.value !== item.category) {
                                           updateItem({ itemId: item.id, updates: { category: e.target.value }});
                                         }
                                       }}
                                       className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 text-text-secondary cursor-pointer"
                                    >
                                       <option value="Pantry" className="bg-surface text-text-primary">Pantry</option>
                                       <option value="Kitchen" className="bg-surface text-text-primary">Kitchen</option>
                                       <option value="Cleaning" className="bg-surface text-text-primary">Cleaning</option>
                                       <option value="Bathroom" className="bg-surface text-text-primary">Bathroom</option>
                                    </select>
                                 </td>
                                 <td className="py-3 pr-4">
                                    <div className="flex items-center">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        defaultValue={item.quantity}
                                        onBlur={(e) => {
                                          const val = parseFloat(e.target.value);
                                          if (!isNaN(val) && val !== item.quantity) {
                                            updateItem({ itemId: item.id, updates: { quantity: Math.max(0, val) }});
                                          }
                                        }}
                                        className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-16"
                                      />
                                      <span className="text-text-secondary text-xs ml-1">{item.unit || 'pc'}</span>
                                    </div>
                                 </td>
                                 <td className="py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      defaultValue={item.threshold}
                                      onBlur={(e) => {
                                          const val = parseFloat(e.target.value);
                                          if (!isNaN(val) && val !== item.threshold) {
                                            updateItem({ itemId: item.id, updates: { threshold: Math.max(0, val) }});
                                          }
                                      }}
                                      className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-16"
                                    />
                                 </td>
                              </tr>
                           ))}
                           {items.length === 0 && (
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
        {/* Floating Modals for Desktop */}
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
          onManualEntry={async () => true}
          onScan={handleBarcodeScan}
          onClose={() => setBarcodeOpen(false)}
        />

        <ReceiptScanModal
          visible={receiptOpen}
          householdId={householdId}
          onClose={() => setReceiptOpen(false)}
        />

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
    </>
  );
}
