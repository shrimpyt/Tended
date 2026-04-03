'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventory } from '@/hooks/queries';
import Link from 'next/link';

export default function InventoryPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: items = [], isLoading } = useInventory(householdId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface-elevated border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-primary-blue">&larr; Back</Link>
          <div className="font-bold text-xl text-text-primary tracking-tight">Inventory</div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => {
              const pct = Math.min(100, Math.max(0, (item.quantity / item.max_quantity) * 100));
              const isLow = (item.quantity / item.max_quantity) <= item.threshold;
              
              return (
                <div key={item.id} className="bg-surface-elevated rounded-xl p-5 border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-text-primary text-lg">{item.name}</h3>
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
    </div>
  );
}
