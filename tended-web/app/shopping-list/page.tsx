'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useShoppingList, useAddShoppingListItem, useToggleShoppingListItem, useDeleteShoppingListItem } from '@/hooks/queries';
import Link from 'next/link';
import { Circle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function ShoppingListPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: items = [], isLoading } = useShoppingList(householdId);
  const { mutateAsync: addItem } = useAddShoppingListItem();
  const { mutate: toggleItem } = useToggleShoppingListItem();
  const { mutate: removeItem } = useDeleteShoppingListItem();

  const [newItemName, setNewItemName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !profile?.id) return;

    await addItem({
      householdId,
      userId: profile.id,
      itemName: newItemName.trim()
    });
    setNewItemName('');
  };

  const pendingItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface-elevated border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-primary-blue">&larr; Back</Link>
          <div className="font-bold text-xl text-text-primary tracking-tight">Shopping List</div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleAdd} className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="Add an item..."
            aria-label="Add an item"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue-light focus:border-primary-blue shadow-sm"
          />
          <button 
            type="submit"
            aria-label="Add"
            disabled={!newItemName.trim()}
            className="px-6 py-3 bg-primary-blue hover:bg-opacity-90 disabled:opacity-50 text-white rounded-xl font-medium shadow-md transition-colors flex items-center gap-2"
          >
            <Plus size={20} /> Add
          </button>
        </form>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                Pending <span className="bg-border text-text-secondary px-2 py-0.5 rounded-full text-xs">{pendingItems.length}</span>
              </h2>
              <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden shadow-sm">
                {pendingItems.length > 0 ? pendingItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-surface transition-colors">
                    <button 
                      onClick={() => toggleItem({ itemId: item.id, completed: true })}
                      aria-label={`Mark ${item.item_name} as completed`}
                      className="text-text-secondary hover:text-success-green flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-green rounded-full"
                    >
                      <Circle size={24} />
                    </button>
                    <div className="flex-1">
                      <span className="text-text-primary font-medium text-lg">{item.item_name}</span>
                    </div>
                    <button onClick={() => removeItem(item.id)} aria-label={`Delete ${item.item_name}`} className="text-text-secondary hover:text-danger-red p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-red rounded-md">
                      <Trash2 size={20} />
                    </button>
                  </div>
                )) : (
                  <div className="p-8 text-center text-text-secondary">You&#39;re all caught up!</div>
                )}
              </div>
            </div>

            {completedItems.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2 opacity-60">
                  Completed
                </h2>
                <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden opacity-60">
                  {completedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
                      <button 
                        onClick={() => toggleItem({ itemId: item.id, completed: false })}
                        aria-label={`Mark ${item.item_name} as pending`}
                        className="text-success-green flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-green rounded-full"
                      >
                        <CheckCircle2 size={24} />
                      </button>
                      <div className="flex-1">
                        <span className="text-text-secondary font-medium text-lg line-through">{item.item_name}</span>
                      </div>
                      <button onClick={() => removeItem(item.id)} aria-label={`Delete ${item.item_name}`} className="text-text-secondary hover:text-danger-red p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-red rounded-md">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
