'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory, useUpdateQuantity, useDeleteInventoryItem } from '@/hooks/queries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Trash2 } from 'lucide-react';
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

  const { mutateAsync: updateQuantity } = useUpdateQuantity();
  const { mutateAsync: deleteItem } = useDeleteInventoryItem();

  const handleUpdateStockLevel = async (item: any, newStockPct: string) => {
    if (!profile?.id || newStockPct === '') return;
    const pct = parseFloat(newStockPct);
    if (isNaN(pct)) return;
    const newQuantity = (pct / 100) * item.max_quantity;

    await updateQuantity({
       itemId: item.id,
       userId: profile.id,
       oldQuantity: item.quantity,
       newQuantity,
       item
    });
  };

  const handleUpdateTarget = async (item: any, newTarget: string) => {
    if (newTarget === '') return;
    const target = parseFloat(newTarget);
    if (isNaN(target)) return;

    // In order to update max_quantity we must use supabase directly
    // since useUpdateQuantity is specifically for `quantity` and events
    await supabase.from('items').update({ max_quantity: target }).eq('id', item.id);
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const handleUpdateName = async (item: any, newName: string) => {
    if (!newName.trim()) return;
    await supabase.from('items').update({ name: newName.trim() }).eq('id', item.id);
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const handleDelete = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem(itemId);
    }
  };

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

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 bg-surface-elevated border-b border-border shadow-sm flex items-center justify-between">
         <h1 className="text-xl font-bold">Command Center</h1>
      </header>

      <div className="flex-1 p-6 grid grid-cols-[200px_300px_1fr] gap-6 max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="border-r border-border pr-4">
          <nav className="flex flex-col gap-2 text-sm font-medium">
             <div className="px-3 py-2 bg-primary-blue/10 text-primary-blue rounded-md">Command Center</div>
             <div className="px-3 py-2 text-text-secondary hover:text-text-primary">Reports</div>
             <div className="px-3 py-2 text-text-secondary hover:text-text-primary">Family Settings</div>
          </nav>
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
                            <th className="py-2 font-medium text-text-secondary w-10"></th>
                         </tr>
                      </thead>
                      <tbody>
                         {inventory.map(item => (
                            <tr key={item.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                               <td className="py-3 pr-4">
                                  <input
                                     defaultValue={item.name}
                                     onBlur={(e) => supabase.from('items').update({ name: e.target.value }).eq('id', item.id)}
                                     className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-full"
                                  />
                               </td>
                               <td className="py-3 pr-4 text-text-secondary">{item.category}</td>
                               <td className="py-3 pr-4">
                                  <input
                                    type="number"
                                    defaultValue={Math.round((item.quantity / item.max_quantity) * 100)}
                                    onBlur={(e) => handleUpdateStockLevel(item, e.target.value)}
                                    className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-16"
                                  />
                               </td>
                               <td className="py-3">
                                  <input
                                    type="number"
                                    defaultValue={item.max_quantity}
                                    onBlur={(e) => handleUpdateTarget(item, e.target.value)}
                                    className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-blue rounded px-1 -ml-1 w-16"
                                  />
                               </td>
                               <td className="py-3">
                                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16} />
                                  </button>
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
