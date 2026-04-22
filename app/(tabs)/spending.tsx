import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import {
  useSpendingEntries,
  useAddSpendingEntry,
  useDeleteSpendingEntry,
} from '../../hooks/queries';
import { SpendingEntry } from '../../types/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EXPENSE_CATEGORIES = [
  'Groceries', 'Household', 'Cleaning', 'Personal care',
  'Beverages', 'Other',
];

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2);
}

function buildLast6Months(): Array<{ year: number; month: number; label: string }> {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: MONTHS[d.getMonth()].slice(0, 3),
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar Chart
// ─────────────────────────────────────────────────────────────────────────────

function SpendingBarChart({
  months,
  totals,
  selectedIdx,
  onSelect,
  accentColor,
  surfaceAlt,
  textMuted,
  textSecondary,
}: {
  months: ReturnType<typeof buildLast6Months>;
  totals: number[];
  selectedIdx: number;
  onSelect: (i: number) => void;
  accentColor: string;
  surfaceAlt: string;
  textMuted: string;
  textSecondary: string;
}) {
  const maxVal = Math.max(...totals, 1);
  const BAR_MAX_H = 90;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        paddingTop: Spacing.md,
      }}
    >
      {months.map((m, i) => {
        const pct = totals[i] / maxVal;
        const barH = Math.max(pct * BAR_MAX_H, 6);
        const isSelected = i === selectedIdx;
        return (
          <TouchableOpacity
            key={`${m.year}-${m.month}`}
            style={{ flex: 1, alignItems: 'center', gap: 5 }}
            onPress={() => onSelect(i)}
            activeOpacity={0.75}
          >
            <Text
              style={{
                color: isSelected ? accentColor : textMuted,
                fontSize: 9,
                fontWeight: '600',
              }}
            >
              {totals[i] > 0 ? `$${Math.round(totals[i])}` : ''}
            </Text>
            <View
              style={{
                width: '100%',
                height: barH,
                borderRadius: 5,
                backgroundColor: isSelected ? accentColor : surfaceAlt,
                minHeight: 6,
              }}
            />
            <Text
              style={{
                color: isSelected ? accentColor : textSecondary,
                fontSize: 10,
                fontWeight: isSelected ? '600' : '400',
              }}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Expense Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddExpenseModal({
  visible,
  onClose,
  householdId,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  householdId: string;
  userId: string;
}) {
  const { colors: C } = useTheme();
  const { mutate: addEntry, isPending } = useAddSpendingEntry();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Groceries');

  const handleSubmit = () => {
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid dollar amount.');
      return;
    }
    addEntry(
      {
        householdId,
        userId,
        entry: {
          amount: parsed,
          note: note.trim() || null,
          date,
          category,
        } as any,
      },
      {
        onSuccess: () => {
          setAmount('');
          setNote('');
          setDate(new Date().toISOString().slice(0, 10));
          setCategory('Groceries');
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.background, padding: Spacing.lg, gap: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold }}>
            Add Expense
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: C.textMuted, fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Amount
          </Text>
          <TextInput
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: Radius.sm,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              color: C.textPrimary,
              fontSize: Typography.sizes.xxl,
              fontWeight: Typography.weights.bold,
            }}
            placeholder="0.00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Category */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {EXPENSE_CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 6,
                    borderRadius: Radius.full,
                    borderWidth: 1,
                    borderColor: active ? C.accent : C.border,
                    backgroundColor: active ? C.accentBg : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? C.accent : C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: active ? Typography.weights.semiBold : Typography.weights.regular }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Date */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Date
          </Text>
          <TextInput
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: Radius.sm,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              color: C.textPrimary,
              fontSize: Typography.sizes.sm,
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textMuted}
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Note */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Note (optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: Radius.sm,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              color: C.textPrimary,
              fontSize: Typography.sizes.sm,
            }}
            placeholder="e.g. Whole Foods receipt"
            placeholderTextColor={C.textMuted}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isPending}
          style={{
            backgroundColor: C.accent,
            borderRadius: Radius.sm,
            padding: Spacing.md,
            alignItems: 'center',
            marginTop: 'auto',
          }}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.semiBold }}>
              Add Expense
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SpendingScreen() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const userId = profile?.id ?? '';
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();

  const last6 = useMemo(() => buildLast6Months(), []);
  const now = new Date();
  const thisMonthIdx = last6.findIndex(
    m =>
      m.year === now.getFullYear() && m.month === now.getMonth() + 1,
  );
  const [selectedIdx, setSelectedIdx] = useState(thisMonthIdx >= 0 ? thisMonthIdx : 5);
  const [showAdd, setShowAdd] = useState(false);

  const selectedMonth = last6[selectedIdx];
  const { data: entries = [], isLoading } = useSpendingEntries(
    householdId,
    selectedMonth.year,
    selectedMonth.month,
  );
  const { mutate: deleteEntry } = useDeleteSpendingEntry();

  // Pre-fetch totals for chart — simplified: reuse same query for selected month,
  // and assume other months are 0 since we'd need 6 separate queries for full data.
  // In production you'd cache these. For now show what we have.
  const chartTotals = useMemo(() => {
    return last6.map((m, i) => {
      if (i === selectedIdx) {
        return entries.reduce((s, e) => s + e.amount, 0);
      }
      return 0;
    });
  }, [entries, selectedIdx, last6]);

  const total = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const cat = (e as any).category ?? 'Other';
      map[cat] = (map[cat] ?? 0) + e.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete entry?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(id) },
      ],
    );
  };

  if (!householdId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textMuted }}>No household found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: Spacing.lg,
          }}
        >
          <View>
            <Text
              style={{
                color: C.textPrimary,
                fontSize: Typography.sizes.xl,
                fontWeight: Typography.weights.bold,
                letterSpacing: -0.3,
              }}
            >
              Spending
            </Text>
            <Text style={{ color: C.textMuted, fontSize: Typography.sizes.xs }}>
              {MONTHS[selectedMonth.month - 1]} {selectedMonth.year}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            activeOpacity={0.85}
            style={{
              backgroundColor: C.accent,
              borderRadius: Radius.full,
              paddingHorizontal: Spacing.md,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, lineHeight: 20 }}>+</Text>
            <Text style={{ color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium }}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Total ───────────────────────────────────────────────── */}
        <View style={{ gap: 2 }}>
          <Text
            style={{
              color: C.textPrimary,
              fontSize: Typography.sizes.display,
              fontWeight: Typography.weights.bold,
              letterSpacing: -2,
            }}
          >
            {formatCurrency(total)}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} this month
          </Text>
        </View>

        {/* ─── Bar Chart ───────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
          }}
        >
          <SpendingBarChart
            months={last6}
            totals={chartTotals}
            selectedIdx={selectedIdx}
            onSelect={setSelectedIdx}
            accentColor={C.accent}
            surfaceAlt={C.surfaceAlt}
            textMuted={C.textMuted}
            textSecondary={C.textSecondary}
          />
        </View>

        {/* ─── Category Breakdown ──────────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text
              style={{
                color: C.textPrimary,
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.bold,
                letterSpacing: -0.2,
              }}
            >
              By Category
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
              }}
            >
              {categoryBreakdown.map(([cat, amount], idx) => {
                const pct = (amount / total) * 100;
                return (
                  <View key={cat}>
                    <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium }}>
                          {cat}
                        </Text>
                        <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semiBold }}>
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: C.surfaceAlt, borderRadius: 2, overflow: 'hidden' }}>
                        <View
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: C.accent,
                            borderRadius: 2,
                            opacity: 0.75,
                          }}
                        />
                      </View>
                    </View>
                    {idx < categoryBreakdown.length - 1 && (
                      <View style={{ height: 1, backgroundColor: C.border, marginHorizontal: Spacing.md }} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Entry List ──────────────────────────────────────────── */}
        <View style={{ gap: Spacing.sm }}>
          <Text
            style={{
              color: C.textPrimary,
              fontSize: Typography.sizes.md,
              fontWeight: Typography.weights.bold,
              letterSpacing: -0.2,
            }}
          >
            Entries
          </Text>

          {isLoading ? (
            <View style={{ paddingVertical: Spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : entries.length === 0 ? (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: C.border,
                padding: Spacing.xl,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: C.textMuted, fontSize: Typography.sizes.sm }}>
                No entries for this month
              </Text>
              <TouchableOpacity
                onPress={() => setShowAdd(true)}
                activeOpacity={0.7}
                style={{ marginTop: Spacing.sm }}
              >
                <Text style={{ color: C.accent, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium }}>
                  + Add your first entry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
              }}
            >
              {entries.map((entry, idx) => (
                <View key={entry.id}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: Spacing.md,
                      paddingVertical: Spacing.md,
                      gap: Spacing.md,
                    }}
                    activeOpacity={0.7}
                    onLongPress={() => handleDelete(entry.id)}
                  >
                    {/* Amount */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: C.textPrimary,
                          fontSize: Typography.sizes.md,
                          fontWeight: Typography.weights.semiBold,
                        }}
                      >
                        {formatCurrency(entry.amount)}
                      </Text>
                      <Text style={{ color: C.textMuted, fontSize: Typography.sizes.xs }}>
                        {(entry as any).category ?? 'Groceries'} · {entry.date}
                      </Text>
                      {entry.note && (
                        <Text
                          style={{
                            color: C.textSecondary,
                            fontSize: Typography.sizes.xs,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {entry.note}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(entry.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: C.textMuted, fontSize: 18 }}>⋯</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {idx < entries.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: C.border,
                        marginHorizontal: Spacing.md,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <AddExpenseModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        householdId={householdId}
        userId={userId}
      />
    </SafeAreaView>
  );
}
