'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useWasteEvents } from '@/hooks/queries';
import Graveyard from '@/components/Graveyard';

export default function GraveyardPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const { data: events = [], isLoading } = useWasteEvents(householdId);

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="px-5 sm:px-8 pt-8 pb-6">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-1">
          Waste tracker
        </p>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red/10 flex items-center justify-center">
            <Trash2 size={16} className="text-red" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Graveyard</h1>
        </div>
        <p className="text-sm text-text-secondary mt-2 max-w-md">
          Items that expired or were discarded. Use this to spot patterns and
          reduce future waste.
        </p>
      </div>

      <div className="px-5 sm:px-8 pb-12">
        <Graveyard events={events} isLoading={isLoading} />
      </div>
    </div>
  );
}
