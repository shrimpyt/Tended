'use client';

import React, { useMemo } from 'react';
import { Trash2, TrendingDown, Calendar, Package } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import type { WasteEvent } from '@/types/models';

// ── Helpers ────────────────────────────────────────────────────────

function fmt$(n: number) {
  return '$' + n.toFixed(2);
}

function reasonLabel(reason: WasteEvent['reason']) {
  return { expired: 'Expired', discarded: 'Discarded', spoiled: 'Spoiled' }[reason] ?? reason;
}

function reasonColor(reason: WasteEvent['reason']) {
  return {
    expired:   'text-red   bg-red/10',
    spoiled:   'text-amber bg-amber/10',
    discarded: 'text-text-secondary bg-white/5',
  }[reason] ?? 'text-text-secondary bg-white/5';
}

// ── Sub-components ─────────────────────────────────────────────────

function StatChip({
  icon: Icon,
  label,
  value,
  color = 'text-foreground',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl p-4 bg-white/5 border border-white/6">
      <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
        <Icon size={12} />
        {label}
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

interface GraveyardProps {
  events: WasteEvent[];
  isLoading?: boolean;
}

export default function Graveyard({ events, isLoading }: GraveyardProps) {
  const divStyle = { borderColor: 'rgba(255,255,255,0.08)' };

  // ── Aggregate stats ──────────────────────────────────────────
  const totalCost  = useMemo(() => events.reduce((s, e) => s + e.cost, 0),  [events]);
  const totalItems = events.length;

  const thisMonthCost = useMemo(() => {
    const start = startOfMonth(new Date()).toISOString();
    return events
      .filter(e => e.created_at >= start)
      .reduce((s, e) => s + e.cost, 0);
  }, [events]);

  // ── Group events by calendar month ───────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, WasteEvent[]>();
    for (const e of events) {
      const key = format(parseISO(e.created_at), 'MMMM yyyy');
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary stats row ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatChip
          icon={TrendingDown}
          label="Total wasted"
          value={fmt$(totalCost)}
          color="text-red"
        />
        <StatChip
          icon={Calendar}
          label="This month"
          value={fmt$(thisMonthCost)}
          color="text-amber"
        />
        <StatChip
          icon={Package}
          label="Events logged"
          value={String(totalItems)}
        />
      </div>

      {/* ── Empty state ───────────────────────────────────── */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Trash2 size={36} className="text-text-secondary/20" />
          <p className="text-sm text-text-secondary">
            No waste events recorded yet.
          </p>
          <p className="text-xs text-text-secondary/60 max-w-xs">
            When items expire or are discarded, they'll appear here so you can
            track and reduce household waste over time.
          </p>
        </div>
      )}

      {/* ── Event list grouped by month ───────────────────── */}
      {Array.from(grouped.entries()).map(([month, monthEvents]) => {
        const monthCost = monthEvents.reduce((s, e) => s + e.cost, 0);

        return (
          <div key={month}>
            {/* Month header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {month}
              </h3>
              <span className="text-xs font-medium text-red">{fmt$(monthCost)} wasted</span>
            </div>

            {/* Events */}
            <div className="space-y-2">
              {monthEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Reason badge */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${reasonColor(event.reason)}`}>
                    {reasonLabel(event.reason)}
                  </span>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {event.item_name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {event.quantity}{event.unit ? ` ${event.unit}` : ' unit(s)'}
                    </div>
                  </div>

                  {/* Cost & date */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-red">{fmt$(event.cost)}</div>
                    <div className="text-[10px] text-text-secondary">
                      {format(parseISO(event.created_at), 'MMM d')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t" style={divStyle} />
          </div>
        );
      })}
    </div>
  );
}
