import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAuthStore} from '../store/authStore';
import {useInventoryStore} from '../store/inventoryStore';
import {useSpendingStore} from '../store/spendingStore';
import {useShoppingListStore} from '../store/shoppingListStore';
import {useRealtimeHousehold} from '../hooks/useRealtimeHousehold';
import ShoppingListScreen from './ShoppingListScreen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Returns [weekStart, weekEnd] as ISO date strings (Monday-based week). */
function currentWeekRange(): {start: string; end: string} {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {start: fmt(mon), end: fmt(sun)};
}

/** Returns last week's [start, end] as ISO date strings. */
function lastWeekRange(): {start: string; end: string} {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() + diffToMon);

  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {start: fmt(lastMon), end: fmt(lastSun)};
}

function formatAmount(n: number): string {
  return '$' + n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StockBar({stockLevel, threshold}: {stockLevel: number; threshold: number}) {
  const pct = Math.min(100, Math.max(0, stockLevel));
  const color =
    stockLevel === 0 ? Colors.red : stockLevel < threshold ? Colors.amber : Colors.green;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, {width: `${pct}%` as `${number}%`, backgroundColor: color}]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const {profile} = useAuthStore();
  const {items, fetchItems} = useInventoryStore();
  const {entries, fetchEntries} = useSpendingStore();
  const {items: shoppingItems, fetchItems: fetchShoppingItems, toggleComplete} = useShoppingListStore();

  const [loadingAll, setLoadingAll] = useState(true);
  const [showShoppingList, setShowShoppingList] = useState(false);

  const householdId = profile?.household_id ?? '';
  const now = new Date();

  // Fetch all data on mount
  const refresh = useCallback(async () => {
    if (!householdId) return;
    await Promise.all([
      fetchItems(householdId),
      fetchEntries(householdId, now.getFullYear(), now.getMonth() + 1),
      fetchShoppingItems(householdId),
    ]);
    setLoadingAll(false);
  }, [householdId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscriptions
  useRealtimeHousehold(householdId, {
    onItemsChange: () => fetchItems(householdId),
    onShoppingListChange: () => fetchShoppingItems(householdId),
    onSpendingChange: () => fetchEntries(householdId, now.getFullYear(), now.getMonth() + 1),
  });

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const thisWeek = useMemo(() => currentWeekRange(), []);
  const lastWeek = useMemo(() => lastWeekRange(), []);

  const weeklySpend = useMemo(() => {
    let thisTotal = 0;
    let lastTotal = 0;
    let hasLastWeek = false;

    for (const e of entries) {
      if (e.date >= thisWeek.start && e.date <= thisWeek.end) {
        thisTotal += e.amount;
      }
      if (e.date >= lastWeek.start && e.date <= lastWeek.end) {
        lastTotal += e.amount;
        hasLastWeek = true;
      }
    }
    return {thisTotal, lastTotal, hasLastWeek};
  }, [entries, thisWeek, lastWeek]);

  const lowStockItems = useMemo(
    () => items.filter(i => i.stock_level < i.threshold),
    [items],
  );

  const pendingShoppingItems = useMemo(
    () => shoppingItems.filter(i => !i.completed).slice(0, 5),
    [shoppingItems],
  );

  const monthSpend = useMemo(
    () => entries.reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );

  // Week-over-week delta
  const weekDelta = weeklySpend.hasLastWeek
    ? weeklySpend.thisTotal - weeklySpend.lastTotal
    : null;

  const displayName = profile?.display_name ?? 'there';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loadingAll) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={[styles.statValue, lowStockItems.length > 0 && {color: Colors.amber}]}>
              {lowStockItems.length}
            </Text>
            <Text style={styles.statLabel}>Low stock</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatAmount(monthSpend)}</Text>
            <Text style={styles.statLabel}>This month</Text>
          </View>
        </View>

        {/* Weekly spend card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This week</Text>
          <View style={styles.card}>
            <View style={styles.weekSpendRow}>
              <View>
                <Text style={styles.weekAmount}>{formatAmount(weeklySpend.thisTotal)}</Text>
                <Text style={styles.weekSub}>spent this week</Text>
              </View>
              {weekDelta !== null && (
                <View
                  style={[
                    styles.deltaBadge,
                    {borderColor: weekDelta > 0 ? Colors.amber : Colors.green},
                  ]}>
                  <Text
                    style={[
                      styles.deltaText,
                      {color: weekDelta > 0 ? Colors.amber : Colors.green},
                    ]}>
                    {weekDelta > 0 ? '+' : ''}{formatAmount(weekDelta)} vs last week
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Inventory alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory alerts</Text>
          {lowStockItems.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyStateText}>All stocked up ✓</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {lowStockItems.map((item, idx) => (
                <View key={item.id}>
                  <View style={styles.alertRow}>
                    <View style={styles.alertLeft}>
                      <Text style={styles.alertName}>{item.name}</Text>
                      {item.category ? (
                        <Text style={styles.alertCategory}>{item.category}</Text>
                      ) : null}
                    </View>
                    <View style={styles.alertRight}>
                      <Text
                        style={[
                          styles.alertLevel,
                          {color: item.stock_level === 0 ? Colors.red : Colors.amber},
                        ]}>
                        {item.stock_level === 0 ? 'Out' : `${item.stock_level}%`}
                      </Text>
                      <StockBar stockLevel={item.stock_level} threshold={item.threshold} />
                    </View>
                  </View>
                  {idx < lowStockItems.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Shopping list preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Shopping list</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowShoppingList(true)}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {pendingShoppingItems.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyStateText}>Nothing on your list</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {pendingShoppingItems.map((item, idx) => (
                <View key={item.id}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.shoppingRow}
                    onPress={() => toggleComplete(item.id, true)}>
                    <View style={styles.checkbox} />
                    <View style={styles.shoppingInfo}>
                      <Text style={styles.shoppingName}>{item.item_name}</Text>
                      {item.note ? (
                        <Text style={styles.shoppingNote}>{item.note}</Text>
                      ) : null}
                    </View>
                    {item.added_by === 'system' && (
                      <View style={styles.autoTag}>
                        <Text style={styles.autoTagText}>Auto</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {idx < pendingShoppingItems.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
              {shoppingItems.filter(i => !i.completed).length > 5 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.viewMoreRow}
                  onPress={() => setShowShoppingList(true)}>
                  <Text style={styles.viewMoreText}>
                    +{shoppingItems.filter(i => !i.completed).length - 5} more items
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Shopping list full-screen modal */}
      <Modal
        visible={showShoppingList}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShoppingList(false)}>
        <ShoppingListScreen onClose={() => setShowShoppingList(false)} />
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.xl,
  },

  // Header
  header: {
    paddingTop: Spacing.lg,
    gap: 2,
  },
  greeting: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.medium,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statCardMiddle: {
    // no extra style needed, gap handled in statsRow
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
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
  viewAllLink: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // Weekly spend
  weekSpendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  weekAmount: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.medium,
  },
  weekSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    marginTop: 2,
  },
  deltaBadge: {
    borderWidth: Border.width,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  deltaText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },

  // Inventory alerts
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  alertLeft: {
    flex: 1,
    gap: 2,
  },
  alertName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  alertCategory: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  alertRight: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 60,
  },
  alertLevel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  barTrack: {
    width: 60,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },

  // Shopping list preview
  shoppingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
  },
  shoppingInfo: {
    flex: 1,
    gap: 2,
  },
  shoppingName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  shoppingNote: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  autoTag: {
    borderWidth: Border.width,
    borderColor: Colors.blue,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  autoTagText: {
    color: Colors.blue,
    fontSize: 10,
    fontWeight: Typography.weights.medium,
  },
  viewMoreRow: {
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
  },
  viewMoreText: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Shared
  separator: {
    height: Border.width,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    padding: Spacing.md,
    textAlign: 'center',
  },
});
