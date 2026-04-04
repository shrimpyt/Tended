'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useWasteEvents } from '@/hooks/queries';
import Link from 'next/link';
import { Trash2, AlertCircle } from 'lucide-react';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export default function GraveyardPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: events = [], isLoading } = useWasteEvents(householdId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-surface-elevated border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-primary-blue">&larr; Back</Link>
          <div className="font-bold text-xl text-text-primary tracking-tight">Graveyard</div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Trash2 className="text-danger-red" /> Waste Log
          </h2>
          <p className="text-text-secondary mt-1">A record of items discarded or expired from your inventory.</p>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-surface-elevated border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={32} className="text-text-secondary opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">Your graveyard is empty</h3>
            <p className="text-sm text-text-secondary max-w-sm">
              Great job! You haven&#39;t discarded any items recently.
              Items marked as waste from the dashboard will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white/2 border-b border-border">
                    <th className="py-3 px-4 font-medium text-text-secondary">Item</th>
                    <th className="py-3 px-4 font-medium text-text-secondary">Quantity</th>
                    <th className="py-3 px-4 font-medium text-text-secondary">Reason</th>
                    <th className="py-3 px-4 font-medium text-text-secondary">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-medium text-text-primary">
                        {event.item_name}
                      </td>
                      <td className="py-4 px-4 text-text-secondary">
                        {event.quantity} {event.unit || ''}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          event.reason === 'expired' ? 'border-danger-red/30 bg-danger-red/10 text-danger-red' :
                          event.reason === 'spoiled' ? 'border-amber/30 bg-amber/10 text-amber' :
                          'border-text-secondary/30 bg-white/5 text-text-secondary'
                        }`}>
                          {event.reason === 'expired' && <AlertCircle size={12} />}
                          <span className="capitalize">{event.reason}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-text-secondary text-xs">
                        {formatDate(event.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
