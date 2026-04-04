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
import {Colors, Typography, Spacing, Radius, Border, Shadows} from '../../constants/theme';
import {useAuthStore} from '../../store/authStore';
import {useInventory, useSpendingEntries, useShoppingList, useToggleShoppingListItem} from '../../hooks/queries';
import {useRealtimeHousehold} from '../../hooks/useRealtimeHousehold';
import ShoppingListScreen from '../../screens/ShoppingListScreen';
import ProfileScreen from '../../screens/ProfileScreen';

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
  const householdId = profile?.household_id ?? '';
  const now = new Date();

  const {data: items = [], isLoading: loadingItems} = useInventory(householdId);
  const {data: entries = [], isLoading: loadingEntries} = useSpendingEntries(householdId, now.getFullYear(), now.getMonth() + 1);
  const {data: shoppingItems = [], isLoading: loadingShopping} = useShoppingList(householdId);
  const {mutate: toggleComplete} = useToggleShoppingListItem();

  const loadingAll = loadingItems || loadingEntries || loadingShopping;

  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useRealtimeHousehold(householdId);

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
    () => items.filter(i => (i.quantity / i.max_quantity) * 100 < (i.threshold / i.max_quantity) * 100),
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

  if (!householdId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No household found. Please sign out and sign back in.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowProfile(true)}
            activeOpacity={0.7}
            style={styles.profileButton}>
            <Text style={styles.profileButtonText}>⚙</Text>
          </TouchableOpacity>
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
                          {color: item.quantity === 0 ? Colors.red : Colors.amber},
                        ]}>
                        {item.quantity === 0 ? 'Out' : `${Math.round((item.quantity / item.max_quantity) * 100)}%`}
                      </Text>
                      <StockBar stockLevel={Math.round((item.quantity / item.max_quantity) * 100)} threshold={Math.round((item.threshold / item.max_quantity) * 100)} />
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
                    onPress={() => toggleComplete({itemId: item.id, completed: true})}>
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

      {/* Profile / household settings modal */}
      <Modal
        visible={showProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfile(false)}>
        <ProfileScreen onClose={() => setShowProfile(false)} />
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
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.md,
    gap: Spacing.xl,
  },

  // Header
  header: {
    paddingTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  profileButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'flex-start',
    gap: 4,
    ...Shadows.soft,
  },
  statCardMiddle: {
    // Gap handled in statsRow
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Section
  section: {
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.3,
  },
  viewAllLink: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Card
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },

  // Weekly spend
  weekSpendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  weekAmount: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    letterSpacing: -1,
  },
  weekSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: 4,
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
