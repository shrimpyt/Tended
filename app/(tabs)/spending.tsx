import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../../constants/theme';
import {useSpendingEntries, useDeleteSpendingEntry} from '../../hooks/queries';
import {SpendingEntry, SpendingCategory} from '../../types/models';
import {useAuthStore} from '../../store/authStore';
import {useRealtimeHousehold} from '../../hooks/useRealtimeHousehold';
import AddSpendingModal from '../../components/AddSpendingModal';
import ReceiptScanModal from '../../components/ReceiptScanModal';

const CATEGORIES: SpendingCategory[] = ['Groceries', 'Cleaning', 'Pantry', 'Personal care'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatAmount(n: number): string {
  return '$' + n.toFixed(2);
}

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1].slice(0, 3)} ${parseInt(day, 10)}`;
}

function MetricCard({label, value, sub, accent}: {label: string; value: string; sub?: string; accent?: string}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent ? {color: accent} : null]}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

function CategoryRow({category, amount, count}: {category: string; amount: number; count: number}) {
  return (
    <View style={styles.catRow}>
      <View style={styles.catLeft}>
        <Text style={styles.catName}>{category}</Text>
        <Text style={styles.catCount}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
      </View>
      <Text style={styles.catAmount}>{formatAmount(amount)}</Text>
    </View>
  );
}

function EntryRow({entry, onDelete}: {entry: SpendingEntry; onDelete: () => void}) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <View style={styles.entryTop}>
          <Text style={styles.entryName}>{entry.item_name || entry.category}</Text>
          {entry.is_waste && (
            <View style={styles.wasteTag}>
              <Text style={styles.wasteTagText}>Waste</Text>
            </View>
          )}
        </View>
        <Text style={styles.entrySub}>
          {entry.category} · {formatDate(entry.date)}
        </Text>
      </View>
      <View style={styles.entryRight}>
        <Text style={[styles.entryAmount, entry.is_waste && {color: Colors.amber}]}>
          {formatAmount(entry.amount)}
        </Text>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SpendingScreen() {
  const {profile} = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const {data: entries = [], isLoading: loading} = useSpendingEntries(householdId, year, month);
  const {mutate: deleteEntry} = useDeleteSpendingEntry();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  const insets = useSafeAreaInsets();

  useRealtimeHousehold(householdId);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Derived stats
  const {totalSpent, totalWaste, categoryBreakdown} = useMemo(() => {
    let total = 0;
    let waste = 0;
    const catMap: Record<string, {amount: number; count: number}> = {};

    for (const e of entries) {
      total += e.amount;
      if (e.is_waste) waste += e.amount;
      if (!catMap[e.category]) catMap[e.category] = {amount: 0, count: 0};
      catMap[e.category].amount += e.amount;
      catMap[e.category].count += 1;
    }

    const breakdown = CATEGORIES
      .filter(cat => catMap[cat])
      .map(cat => ({category: cat, ...catMap[cat]}))
      .sort((a, b) => b.amount - a.amount);

    return {totalSpent: total, totalWaste: waste, categoryBreakdown: breakdown};
  }, [entries]);

  const wastePercent = totalSpent > 0 ? (totalWaste / totalSpent) * 100 : 0;

  type ListItem =
    | {type: 'metrics'}
    | {type: 'breakdown'}
    | {type: 'entriesHeader'}
    | {type: 'entry'; data: SpendingEntry}
    | {type: 'empty'};

  const listData: ListItem[] = [
    {type: 'metrics'},
    ...(categoryBreakdown.length > 0 ? [{type: 'breakdown'} as ListItem] : []),
    {type: 'entriesHeader'},
    ...(entries.length === 0
      ? [{type: 'empty'} as ListItem]
      : entries.map(e => ({type: 'entry', data: e} as ListItem))),
  ];

  const renderItem = ({item}: {item: ListItem}) => {
    if (item.type === 'metrics') {
      return (
        <View style={styles.metricsRow}>
          <MetricCard
            label="Total spent"
            value={formatAmount(totalSpent)}
          />
          <MetricCard
            label="Wasted"
            value={formatAmount(totalWaste)}
            sub={totalSpent > 0 ? `${wastePercent.toFixed(0)}% of total` : undefined}
            accent={totalWaste > 0 ? Colors.amber : undefined}
          />
        </View>
      );
    }

    if (item.type === 'breakdown') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By category</Text>
          <View style={styles.card}>
            {categoryBreakdown.map((row, i) => (
              <View key={row.category}>
                <CategoryRow {...row} />
                {i < categoryBreakdown.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (item.type === 'entriesHeader') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Entries</Text>
          <Text style={styles.sectionCount}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      );
    }

    if (item.type === 'empty') {
      return <Text style={styles.emptyText}>No entries this month. Tap + to add one.</Text>;
    }

    if (item.type === 'entry') {
      return (
        <View style={styles.entryCard}>
          <EntryRow
            entry={item.data}
            onDelete={() => deleteEntry(item.data.id)}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending</Text>
        <TouchableOpacity
          style={styles.scanBtn}
          activeOpacity={0.7}
          onPress={() => setShowScanModal(true)}>
          <Text style={styles.scanBtnIcon}>&#128247;</Text>
          <Text style={styles.scanBtnText}>Scan Receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Month selector */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month - 1]} {year}</Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.monthBtn}
          disabled={isCurrentMonth}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => {
            if (item.type === 'entry') return item.data.id;
            return `${item.type}-${index}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Action buttons */}
      <View style={[styles.actionRow, {paddingBottom: insets.bottom + 90}]}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => setShowAddModal(true)}>
          <Text style={styles.actionBtnIcon}>✏️</Text>
          <Text style={styles.actionBtnText}>Add Manually</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          activeOpacity={0.8}
          onPress={() => setShowScanModal(true)}>
          <Text style={styles.actionBtnIcon}>📷</Text>
          <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Scan Receipt</Text>
        </TouchableOpacity>
      </View>

      <AddSpendingModal
        visible={showAddModal}
        householdId={householdId}
        onClose={() => setShowAddModal(false)}
      />

      <ReceiptScanModal
        visible={showScanModal}
        householdId={householdId}
        onClose={() => setShowScanModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  scanBtnIcon: {
    fontSize: 15,
  },
  scanBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Month selector
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  monthBtn: {
    padding: Spacing.xs,
  },
  monthArrow: {
    color: Colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: Typography.weights.regular,
  },
  monthArrowDisabled: {
    color: Colors.border,
  },
  monthLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    minWidth: 140,
    textAlign: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
  },
  metricSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },

  // Section
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  sectionCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // Category row
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  catLeft: {
    gap: 2,
  },
  catName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  catCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  catAmount: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  separator: {
    height: Border.width,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  // Entry card
  entryCard: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  entryLeft: {
    flex: 1,
    gap: 2,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  entrySub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  entryAmount: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  deleteText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },

  // Waste tag
  wasteTag: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.amber,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  wasteTagText: {
    color: Colors.amber,
    fontSize: 10,
    fontWeight: Typography.weights.medium,
  },

  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    paddingVertical: Spacing.lg,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  actionBtnIcon: {
    fontSize: 16,
  },
  actionBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  actionBtnTextPrimary: {
    color: Colors.textPrimary,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
