import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useInventoryStore, Item, Category} from '../store/inventoryStore';
import {useAuthStore} from '../store/authStore';
import {useRealtimeHousehold} from '../hooks/useRealtimeHousehold';
import AddItemModal from '../components/AddItemModal';
import UpdateStockModal from '../components/UpdateStockModal';

type FilterCategory = 'All' | Category;
type StockStatus = 'OK' | 'Low' | 'Critical';

const CATEGORIES: FilterCategory[] = ['All', 'Kitchen', 'Cleaning', 'Pantry', 'Bathroom'];

function getStatus(stockLevel: number, threshold: number): StockStatus {
  if (stockLevel === 0) return 'Critical';
  if (stockLevel < threshold) return 'Low';
  return 'OK';
}

function getBarColor(stockLevel: number, threshold: number): string {
  if (stockLevel === 0) return Colors.red;
  if (stockLevel < threshold) return Colors.amber;
  return Colors.green;
}

function getStatusColor(status: StockStatus): string {
  switch (status) {
    case 'OK':       return Colors.green;
    case 'Low':      return Colors.amber;
    case 'Critical': return Colors.red;
  }
}

function StockBar({stockLevel, threshold}: {stockLevel: number; threshold: number}) {
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: `${stockLevel}%` as `${number}%`,
            backgroundColor: getBarColor(stockLevel, threshold),
          },
        ]}
      />
    </View>
  );
}

function StatusBadge({status}: {status: StockStatus}) {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, {borderColor: color}]}>
      <Text style={[styles.badgeText, {color}]}>{status}</Text>
    </View>
  );
}

function ItemRow({item}: {item: Item}) {
  const status = getStatus(item.stock_level, item.threshold);
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <StatusBadge status={status} />
      </View>
      <View style={styles.itemMeta}>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemStockPct}>{item.stock_level}%</Text>
      </View>
      <StockBar stockLevel={item.stock_level} threshold={item.threshold} />
    </View>
  );
}

export default function InventoryScreen() {
  const {profile} = useAuthStore();
  const {items, loading, fetchItems} = useInventoryStore();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const householdId = profile?.household_id ?? '';

  const refresh = useCallback(() => {
    if (householdId) fetchItems(householdId);
  }, [householdId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time sync
  useRealtimeHousehold(householdId, {onItemsChange: refresh});

  const filtered = activeCategory === 'All'
    ? items
    : items.filter(i => i.category === activeCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerCount}>{items.length} items</Text>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContent}
        style={styles.pillsRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[styles.pill, activeCategory === cat && styles.pillActive]}>
            <Text style={[styles.pillText, activeCategory === cat && styles.pillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No items yet. Tap + to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <TouchableOpacity onPress={() => setSelectedItem(item)} activeOpacity={0.7}>
              <ItemRow item={item} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add item modal */}
      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={refresh}
      />

      {/* Update stock modal */}
      <UpdateStockModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
  },
  headerCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  pillsRow: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  pillsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  pillTextActive: {
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
  },
  separator: {
    height: Border.width,
    backgroundColor: Colors.border,
  },
  itemRow: {
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemCategory: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  itemStockPct: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: Colors.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: Typography.weights.regular,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
});
