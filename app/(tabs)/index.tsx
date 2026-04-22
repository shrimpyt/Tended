import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import {
  useInventory,
  useSpendingEntries,
  useShoppingList,
  useToggleShoppingListItem,
} from '../../hooks/queries';
import { useRealtimeHousehold } from '../../hooks/useRealtimeHousehold';
import ShoppingListScreen from '../../screens/ShoppingListScreen';
import { getCategoryColor } from '../../utils/categoryColors';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatAmount(n: number): string {
  return '$' + n.toFixed(2);
}

function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function lastMonthOf(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  accentColor,
  accentBg,
}: {
  label: string;
  value: string | number;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <View style={[metricCardStyles.card, { borderColor: accentBg }]}>
      <Text style={[metricCardStyles.value, { color: accentColor }]}>
        {value}
      </Text>
      <Text style={metricCardStyles.label}>{label}</Text>
    </View>
  );
}

const metricCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: 4,
  },
  value: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: '#7A6E68',
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const householdId = profile?.household_id ?? '';
  const now = currentMonth();
  const lastMonth = lastMonthOf(now.year, now.month);

  const { data: items = [], isLoading: loadingItems } =
    useInventory(householdId);
  const { data: entries = [], isLoading: loadingEntries } = useSpendingEntries(
    householdId,
    now.year,
    now.month,
  );
  const { data: lastEntries = [] } = useSpendingEntries(
    householdId,
    lastMonth.year,
    lastMonth.month,
  );
  const { data: shoppingItems = [], isLoading: loadingShopping } =
    useShoppingList(householdId);
  const { mutate: toggleComplete } = useToggleShoppingListItem();

  const [showShoppingList, setShowShoppingList] = useState(false);
  useRealtimeHousehold(householdId);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const lowStockItems = useMemo(
    () => items.filter(i => i.quantity < i.threshold),
    [items],
  );

  const pendingShoppingCount = useMemo(
    () => shoppingItems.filter(i => !i.completed).length,
    [shoppingItems],
  );

  const monthSpend = useMemo(
    () => entries.reduce((s, e) => s + e.amount, 0),
    [entries],
  );
  const lastMonthSpend = useMemo(
    () => lastEntries.reduce((s, e) => s + e.amount, 0),
    [lastEntries],
  );
  const spendDelta = lastMonthSpend > 0 ? monthSpend - lastMonthSpend : null;

  // Category breakdown for pantry overview
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const cat = item.category ?? 'Other';
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [items]);

  const displayName = profile?.display_name
    ? profile.display_name.split(' ')[0]
    : 'there';

  const initials = profile?.display_name
    ? profile.display_name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const loadingAll = loadingItems || loadingEntries || loadingShopping;

  // ─── Dynamic styles ────────────────────────────────────────────────────────

  const dynStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 120,
      paddingTop: Spacing.md,
      gap: Spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: Spacing.lg,
    },
    greeting: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium,
    },
    name: {
      color: colors.textPrimary,
      fontSize: Typography.sizes.xxxl,
      fontWeight: Typography.weights.bold,
      letterSpacing: -0.5,
    },
    date: {
      color: colors.textMuted,
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.regular,
      marginTop: 2,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentBg,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    avatarText: {
      color: colors.accent,
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    metricsRow: {
      flexDirection: 'row',
      flex: 1,
      gap: Spacing.sm,
    },
    section: { gap: Spacing.sm },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.bold,
      letterSpacing: -0.3,
    },
    seeAll: {
      color: colors.accent,
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: Typography.sizes.sm,
    },
    // Expiring items
    expiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
    },
    expiryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: Spacing.sm,
    },
    expiryName: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium,
    },
    expiryQty: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.xs,
      marginRight: Spacing.sm,
    },
    expiryBadge: {
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    expiryBadgeText: {
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.medium,
    },
    // Shopping row
    shoppingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      gap: Spacing.sm,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    shoppingName: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: Typography.sizes.sm,
    },
    autoTag: {
      borderWidth: 1,
      borderColor: colors.info,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    autoTagText: {
      color: colors.info,
      fontSize: 10,
      fontWeight: Typography.weights.medium,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: Spacing.md,
    },
    // Pantry overview bar
    pantryRow: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: 6,
    },
    pantryLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pantryLabel: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.medium,
      flex: 1,
    },
    pantryCount: {
      color: colors.textMuted,
      fontSize: Typography.sizes.xs,
    },
    pantryTrack: {
      height: 5,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 3,
      overflow: 'hidden',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (!householdId) {
    return (
      <SafeAreaView style={dynStyles.container} edges={['top']}>
        <View style={dynStyles.center}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 }}>
            No household found. Please sign out and back in.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingAll) {
    return (
      <SafeAreaView style={dynStyles.container} edges={['top']}>
        <View style={dynStyles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const maxCategoryCount = categoryBreakdown[0]?.[1] ?? 1;

  return (
    <SafeAreaView style={dynStyles.container} edges={['top']}>
      <ScrollView
        style={dynStyles.scroll}
        contentContainerStyle={dynStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <View style={dynStyles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={dynStyles.greeting}>{getGreeting()},</Text>
            <Text style={dynStyles.name}>{displayName}</Text>
            <Text style={dynStyles.date}>{formatDate()}</Text>
          </View>
          <TouchableOpacity
            style={dynStyles.avatar}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={dynStyles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 2×2 Metric Cards ────────────────────────────────────────── */}
        <View style={{ gap: Spacing.sm }}>
          <View style={dynStyles.metricsRow}>
            <MetricCard
              label="Total Items"
              value={items.length}
              accentColor={colors.textPrimary}
              accentBg={colors.surfaceAlt}
            />
            <MetricCard
              label="Low Stock"
              value={lowStockItems.length}
              accentColor={colors.danger}
              accentBg={colors.dangerBg}
            />
          </View>
          <View style={dynStyles.metricsRow}>
            <MetricCard
              label="Shopping List"
              value={pendingShoppingCount}
              accentColor={colors.info}
              accentBg={colors.infoBg}
            />
            <MetricCard
              label="Monthly Spend"
              value={formatAmount(monthSpend)}
              accentColor={colors.success}
              accentBg={colors.successBg}
            />
          </View>
        </View>

        {/* ─── Expiring Soon ───────────────────────────────────────────── */}
        <View style={dynStyles.section}>
          <Text style={dynStyles.sectionTitle}>Expiring Soon</Text>
          {items.length === 0 ? (
            <View style={dynStyles.emptyCard}>
              <Text style={dynStyles.emptyText}>Nothing expiring soon</Text>
            </View>
          ) : (
            <View style={dynStyles.card}>
              {items
                .filter(i => i.expiry_date)
                .sort((a, b) =>
                  (a.expiry_date ?? '').localeCompare(
                    b.expiry_date ?? '',
                  ),
                )
                .slice(0, 5)
                .map((item, idx, arr) => {
                  const expiryDate: string | null =
                    item.expiry_date ?? null;
                  const daysLeft = expiryDate
                    ? Math.round(
                        (new Date(expiryDate + 'T00:00:00').getTime() -
                          new Date().setHours(0, 0, 0, 0)) /
                          86400000,
                      )
                    : null;
                  const badgeColor =
                    daysLeft === null
                      ? colors.textMuted
                      : daysLeft <= 0
                      ? colors.danger
                      : daysLeft === 1
                      ? colors.warning
                      : daysLeft <= 3
                      ? colors.warning
                      : colors.textSecondary;
                  const badgeBg =
                    daysLeft === null
                      ? colors.surfaceAlt
                      : daysLeft <= 0
                      ? colors.dangerBg
                      : daysLeft <= 3
                      ? colors.warningBg
                      : colors.surfaceAlt;
                  const badgeLabel =
                    daysLeft === null
                      ? '—'
                      : daysLeft <= 0
                      ? 'Today'
                      : daysLeft === 1
                      ? 'Tomorrow'
                      : `${daysLeft}d`;

                  return (
                    <View key={item.id}>
                      <View style={dynStyles.expiryRow}>
                        <View
                          style={[
                            dynStyles.expiryDot,
                            {
                              backgroundColor: getCategoryColor(item.category),
                            },
                          ]}
                        />
                        <Text style={dynStyles.expiryName}>{item.name}</Text>
                        <Text style={dynStyles.expiryQty}>
                          {item.quantity}
                          {item.unit ? ` ${item.unit}` : ''}
                        </Text>
                        <View
                          style={[
                            dynStyles.expiryBadge,
                            { backgroundColor: badgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              dynStyles.expiryBadgeText,
                              { color: badgeColor },
                            ]}
                          >
                            {badgeLabel}
                          </Text>
                        </View>
                      </View>
                      {idx < arr.length - 1 && (
                        <View style={dynStyles.separator} />
                      )}
                    </View>
                  );
                })}

              {items.filter(i => i.expiry_date).length === 0 && (
                <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                  <Text style={dynStyles.emptyText}>
                    Add expiry dates to items to track them here
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ─── Pantry Overview ─────────────────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <View style={dynStyles.section}>
            <Text style={dynStyles.sectionTitle}>Pantry Overview</Text>
            <View style={dynStyles.card}>
              {categoryBreakdown.map(([cat, count], idx) => {
                const pct = (count / maxCategoryCount) * 100;
                const catColor = getCategoryColor(cat);
                return (
                  <View key={cat}>
                    <View style={dynStyles.pantryRow}>
                      <View style={dynStyles.pantryLabelRow}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            flex: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: catColor,
                            }}
                          />
                          <Text style={dynStyles.pantryLabel}>{cat}</Text>
                        </View>
                        <Text style={dynStyles.pantryCount}>
                          {count} {count === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                      <View style={dynStyles.pantryTrack}>
                        <View
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: catColor,
                            borderRadius: 3,
                            opacity: 0.75,
                          }}
                        />
                      </View>
                    </View>
                    {idx < categoryBreakdown.length - 1 && (
                      <View style={dynStyles.separator} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Shopping List Preview ───────────────────────────────────── */}
        <View style={dynStyles.section}>
          <View style={dynStyles.sectionHeader}>
            <Text style={dynStyles.sectionTitle}>Shopping List</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowShoppingList(true)}
            >
              <Text style={dynStyles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {pendingShoppingCount === 0 ? (
            <View style={dynStyles.emptyCard}>
              <Text style={dynStyles.emptyText}>Your list is empty</Text>
            </View>
          ) : (
            <View style={dynStyles.card}>
              {shoppingItems
                .filter(i => !i.completed)
                .slice(0, 5)
                .map((item, idx, arr) => (
                  <View key={item.id}>
                    <TouchableOpacity
                      style={dynStyles.shoppingRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        toggleComplete({ itemId: item.id, completed: true })
                      }
                    >
                      <View style={dynStyles.checkbox} />
                      <Text style={dynStyles.shoppingName}>
                        {item.item_name}
                      </Text>
                      {item.added_by === 'system' && (
                        <View style={dynStyles.autoTag}>
                          <Text style={dynStyles.autoTagText}>Auto</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {idx < arr.length - 1 && (
                      <View style={dynStyles.separator} />
                    )}
                  </View>
                ))}
              {pendingShoppingCount > 5 && (
                <TouchableOpacity
                  style={{
                    padding: Spacing.md,
                    alignItems: 'center',
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setShowShoppingList(true)}
                >
                  <Text style={dynStyles.seeAll}>
                    +{pendingShoppingCount - 5} more
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ─── Spend Delta ─────────────────────────────────────────────── */}
        {spendDelta !== null && (
          <View style={dynStyles.section}>
            <Text style={dynStyles.sectionTitle}>Month vs Last Month</Text>
            <View
              style={[
                dynStyles.card,
                {
                  padding: Spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
              ]}
            >
              <View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: Typography.sizes.xxxl,
                    fontWeight: Typography.weights.bold,
                    letterSpacing: -1,
                  }}
                >
                  {formatAmount(monthSpend)}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: Typography.sizes.xs,
                    marginTop: 2,
                  }}
                >
                  this month
                </Text>
              </View>
              <View
                style={{
                  borderRadius: Radius.full,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: 6,
                  backgroundColor:
                    spendDelta > 0 ? colors.dangerBg : colors.successBg,
                }}
              >
                <Text
                  style={{
                    color: spendDelta > 0 ? colors.danger : colors.success,
                    fontSize: Typography.sizes.sm,
                    fontWeight: Typography.weights.medium,
                  }}
                >
                  {spendDelta > 0 ? '↑' : '↓'} {formatAmount(Math.abs(spendDelta))}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Shopping list modal */}
      <Modal
        visible={showShoppingList}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShoppingList(false)}
      >
        <ShoppingListScreen onClose={() => setShowShoppingList(false)} />
      </Modal>
    </SafeAreaView>
  );
}
