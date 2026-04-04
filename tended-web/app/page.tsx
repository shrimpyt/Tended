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
} from '@/hooks/queries';
import { useRealtimeHousehold } from '@/hooks/useRealtimeHousehold';
import { supabase } from '@/lib/supabase';
import AIDialog from '@/components/AIDialog';
import BarcodeScanModal from '@/components/BarcodeScanModal';
import ReceiptScanModal from '@/components/ReceiptScanModal';
import CameraInventoryModal from '@/components/CameraInventoryModal';
import { parseItem } from '@/utils/nlpParser';
import { fuzzyMatchInventory } from '@/utils/fuzzyMatch';

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

function fmt$(n: number) {
  return '$' + n.toFixed(2);
}

// ── Sub-components ─────────────────────────────────────────────────

function CardHeader({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  iconBg: string;
  iconColor: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      </div>
      {badge}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';
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

  const handleBarcodeScan = async (code: string) => {
    setQuickFeedback('Identifying product...');
    try {
      console.log('[Dashboard] Scanned barcode, invoking AI:', code);
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { action: 'barcode', barcode: code },
      });

      if (error) {
        console.error('[Dashboard] Edge function error:', error);
        setQuickFeedback('Lookup failed. Please try again.');
        setTimeout(() => setQuickFeedback(null), 3000);
        return;
      }

      let parsedData = data;
      if (typeof data === 'string') {
        try {
          // Strip markdown blocks if returned by the LLM
          let cleanData = data.trim();
          if (cleanData.startsWith('```')) {
            cleanData = cleanData.replace(/^```(json)?/, '').replace(/```$/, '').trim();
          }
          parsedData = JSON.parse(cleanData);
        } catch (e) {
          console.error('[Dashboard] Failed to parse barcode JSON response:', e);
        }
      }

      if (parsedData && parsedData.name && parsedData.name !== "Unknown") {
        setQuickFeedback(`Adding ${parsedData.name}...`);
        await addItem({
          householdId,
          userId: profile?.id ?? '',
          item: {
            name: parsedData.name,
            category: parsedData.category || 'Pantry',
            quantity: 1,
            unit: 'pc',
            max_quantity: 1,
            threshold: 1,
          }
        });
        setQuickFeedback(`Added ${parsedData.name}!`);
        setTimeout(() => setQuickFeedback(null), 3000);
      } else {
        setQuickFeedback('Product not identified.');
        setTimeout(() => setQuickFeedback(null), 3000);
      }
    } catch (err) {
      console.error('[Dashboard] Barcode handle error:', err);
      setQuickFeedback('An error occurred.');
      setTimeout(() => setQuickFeedback(null), 3000);
    }
  };
  const { data: shoppingItems = [], isLoading: loadingShopping } = useShoppingList(householdId);

  const { mutate: toggleComplete }  = useToggleShoppingListItem();
  const { mutate: updateQuantity }  = useUpdateQuantity();
  const { mutate: addShoppingItem } = useAddShoppingListItem();
  const { mutate: addWasteEvent }   = useAddWasteEvent();

  useRealtimeHousehold(householdId);

  // ── Quick Add handler ──────────────────────────────────────────
  const handleQuickAdd = useCallback(() => {
    if (!profile?.id || !quickAdd.trim()) return;
    const parsed = parseItem(quickAdd);
    if (!parsed) return;

    const match = fuzzyMatchInventory(parsed.name, items);

    if (match) {
      updateQuantity({
        itemId: match.id,
        userId: profile.id,
        oldQuantity: match.quantity,
        newQuantity: match.quantity + parsed.quantity,
        item: match,
      });
      setQuickFeedback(`Updated "${match.name}" ✓`);
    } else {
      addShoppingItem({
        householdId,
        userId: profile.id,
        itemName: parsed.name,
        note: parsed.quantity > 1
          ? `×${parsed.quantity}${parsed.unit ? ' ' + parsed.unit : ''}`
          : undefined,
      });
      setQuickFeedback(`Added "${parsed.name}" to list ✓`);
    }

    setQuickAdd('');
    setTimeout(() => setQuickFeedback(null), 2500);
  }, [quickAdd, items, profile, householdId, updateQuantity, addShoppingItem]);

  // ── Spending ───────────────────────────────────────────────────
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

  const weekDelta  = hasLastWeek ? thisTotal - lastTotal : null;
  const monthSpend = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  // ── Inventory ──────────────────────────────────────────────────
  const lowStockItems    = useMemo(
    () => items.filter(i => i.max_quantity > 0 && (i.quantity / i.max_quantity) <= i.threshold),
    [items]
  );
  const wellStockedCount = items.length - lowStockItems.length;

  // ── Shopping ───────────────────────────────────────────────────
  const pendingItems = useMemo(() => shoppingItems.filter(i => !i.completed), [shoppingItems]);
  const pendingSlice = pendingItems.slice(0, 6);

  const displayName = profile?.display_name ?? 'there';
  const loading     = loadingItems || loadingEntries || loadingShopping;

  const divStyle = { borderColor: 'var(--glass-border)' };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pt-8 pb-3">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {getGreeting()}, {displayName}
        </h1>
      </div>

      {/* ── Quick Add bar ────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pb-5">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
        >
          <Sparkles size={15} className="text-blue flex-shrink-0" />
          <input
            ref={quickInputRef}
            type="text"
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
            placeholder="Quick add — try '3 eggs' or '2 bags of rice'…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-text-secondary min-w-0"
          />
          {quickFeedback ? (
            <span className="text-xs text-green flex-shrink-0 font-medium">{quickFeedback}</span>
          ) : quickAdd.trim() ? (
            <button
              onClick={handleQuickAdd}
              className="text-xs text-blue hover:opacity-80 flex-shrink-0 font-medium"
            >
              Add ↵
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-blue border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="px-5 sm:px-8 pb-8">
          {/* ── Bento Grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* ① Active Shopping ── col-span-2 */}
            <div className="glass rounded-2xl p-5 md:col-span-2 flex flex-col">
              <CardHeader
                icon={ShoppingCart}
                label="Active Shopping"
                iconBg="bg-green/10"
                iconColor="text-green"
                badge={
                  pendingItems.length > 0 ? (
                    <span className="text-[11px] font-semibold text-green bg-green/10 px-2 py-0.5 rounded-full">
                      {pendingItems.length} pending
                    </span>
                  ) : undefined
                }
              />

              {pendingSlice.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2">
                  <CheckCircle2 size={28} className="text-green/40" />
                  <p className="text-sm text-text-secondary">All clear — nothing on the list.</p>
                </div>
              ) : (
                <div className="flex-1 space-y-0.5">
                  {pendingSlice.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                      onClick={() => toggleComplete({ itemId: item.id, completed: true })}
                    >
                      <Circle
                        size={15}
                        className="text-text-secondary group-hover:text-green transition-colors flex-shrink-0"
                      />
                      <span className="text-sm text-foreground flex-1">{item.item_name}</span>
                      {item.note && (
                        <span className="text-xs text-text-secondary">{item.note}</span>
                      )}
                    </div>
                  ))}
                  {pendingItems.length > 6 && (
                    <Link
                      href="/shopping-list"
                      className="flex items-center gap-1 pt-1 text-xs text-text-secondary hover:text-foreground transition-colors"
                    >
                      +{pendingItems.length - 6} more <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-4 pt-3 border-t" style={divStyle}>
                <Link
                  href="/shopping-list"
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-blue transition-colors"
                >
                  Open full list <ChevronRight size={11} />
                </Link>
              </div>
            </div>

            {/* ② Low Stock Alerts ── tall (row-span-2) */}
            <div className="glass rounded-2xl p-5 md:row-span-2 flex flex-col">
              <CardHeader
                icon={AlertTriangle}
                label="Low Stock"
                iconBg="bg-red/10"
                iconColor="text-red"
                badge={
                  lowStockItems.length > 0 ? (
                    <span className="text-[11px] font-semibold text-red bg-red/10 px-2 py-0.5 rounded-full">
                      {lowStockItems.length}
                    </span>
                  ) : undefined
                }
              />

              {lowStockItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2">
                  <CheckCircle2 size={28} className="text-green/40" />
                  <p className="text-sm text-text-secondary">Everything is well stocked!</p>
                </div>
              ) : (
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {lowStockItems.slice(0, 10).map(item => {
                    const pct = Math.min(
                      100,
                      Math.max(0, (item.quantity / item.max_quantity) * 100)
                    );
                    const isEmpty = item.quantity === 0;

                    const nudge = (delta: number) => {
                      if (!profile?.id) return;
                      updateQuantity({
                        itemId: item.id,
                        userId: profile.id,
                        oldQuantity: item.quantity,
                        newQuantity: item.quantity + delta,
                        item,
                      });
                    };

                    const handleWaste = () => {
                      if (!profile?.id || item.quantity <= 0) return;
                      // 1. Log the waste event
                      addWasteEvent({
                        householdId,
                        userId: profile.id,
                        event: {
                          item_id: item.id,
                          item_name: item.name,
                          quantity: item.quantity,
                          unit: item.unit,
                          cost: (item.price || 0) * item.quantity,
                          reason: 'discarded',
                        }
                      });
                      // 2. Set quantity to 0
                      updateQuantity({
                        itemId: item.id,
                        userId: profile.id,
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

                          {/* ── ±1 instant quantity nudge ── */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => nudge(-1)}
                              disabled={item.quantity <= 0}
                              className="w-5 h-5 flex items-center justify-center rounded transition-all text-text-secondary hover:text-red hover:bg-red/10 disabled:opacity-20"
                              aria-label={`Decrease ${item.name}`}
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
                              disabled={item.quantity >= item.max_quantity}
                              className="w-5 h-5 flex items-center justify-center rounded transition-all text-text-secondary hover:text-green hover:bg-green/10 disabled:opacity-20"
                              aria-label={`Increase ${item.name}`}
                            >
                              <Plus size={10} />
                            </button>

                            <button
                              onClick={handleWaste}
                              disabled={item.quantity <= 0}
                              className="w-5 h-5 flex items-center justify-center rounded transition-all text-text-secondary hover:text-red hover:bg-red/10 disabled:opacity-20 ml-1"
                              title="Log as waste"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        <div className="h-1 w-full rounded-full overflow-hidden bg-white/6">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isEmpty ? 'bg-red' : 'bg-amber'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {lowStockItems.length > 10 && (
                    <Link
                      href="/inventory"
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-foreground transition-colors"
                    >
                      +{lowStockItems.length - 10} more <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-4 pt-3 border-t" style={divStyle}>
                <button
                  onClick={() => setAiOpen(true)}
                  className="w-full text-xs py-2 rounded-xl transition-all text-text-secondary hover:text-blue"
                  style={{ border: '1px solid var(--glass-border)' }}
                >
                  + Add to shopping list
                </button>
              </div>
            </div>

            {/* ③ Household Status */}
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

            {/* ④ Spending Summary */}
            <div className="glass rounded-2xl p-5">
              <CardHeader
                icon={BarChart2}
                label="Spending"
                iconBg="bg-amber/10"
                iconColor="text-amber"
              />
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground tracking-tight">
                  {fmt$(thisTotal)}
                </div>
                <div className="text-xs text-text-secondary">this week</div>
              </div>
              {weekDelta !== null && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium mb-3 ${
                    weekDelta > 0 ? 'text-amber' : 'text-green'
                  }`}
                >
                  {weekDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {weekDelta > 0 ? '+' : ''}{fmt$(weekDelta)} vs last week
                </div>
              )}
              <div className="pt-3 border-t flex justify-between text-xs" style={divStyle}>
                <span className="text-text-secondary">This month</span>
                <span className="font-medium text-foreground">{fmt$(monthSpend)}</span>
              </div>
            </div>

            {/* ⑤ AI Scan / Add ── full width */}
            <div className="glass rounded-2xl p-6 md:col-span-3 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.07) 0%, transparent 65%)',
                }}
              />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-blue/15 flex items-center justify-center">
                      <Zap size={16} className="text-blue" />
                    </div>
                    <h2 className="text-base font-semibold text-foreground">AI Scan &amp; Add</h2>
                  </div>
                  <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
                    Scan your pantry, drop a receipt, or chat to instantly
                    update your household inventory.
                  </p>
                </div>

                <button
                  onClick={() => setAiOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-blue transition-all flex-shrink-0"
                  style={{
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.25)',
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.2)')
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.12)')
                  }
                >
                  <Zap size={15} />
                  Open AI Assistant
                </button>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-2">
                {[
                  { label: 'Scan pantry with camera', action: () => setCameraOpen(true) },
                  { label: 'Scan a barcode', action: () => setBarcodeOpen(true) },
                  { label: 'Upload receipt', action: () => setReceiptOpen(true) },
                  { label: 'Chat with AI', action: () => setAiOpen(true) },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="text-xs px-3 py-1.5 rounded-full text-text-secondary hover:text-blue transition-all"
                    style={{ border: '1px solid var(--glass-border)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
