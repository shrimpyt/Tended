import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../../constants/theme';
import {useInventory} from '../../hooks/queries';
import {Item} from '../../types/models';
import {useAuthStore} from '../../store/authStore';
import {useRealtimeHousehold} from '../../hooks/useRealtimeHousehold';
import {useDepletionRate} from '../../hooks/useDepletionRate';
import AddItemModal from '../../components/AddItemModal';
import UpdateStockModal from '../../components/UpdateStockModal';
import BarcodeScanModal from '../../components/BarcodeScanModal';
import CameraInventoryModal from '../../components/CameraInventoryModal';

export function getUniqueCategories(items: Item[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category && item.category.trim()) {
      seen.add(item.category.trim());
    }
  }
  return Array.from(seen).sort();
}

type FilterCategory = 'All' | string;
type StockStatus = 'OK' | 'Low' | 'Critical';

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function getStatus(quantity: number, threshold: number): StockStatus {
  if (quantity === 0) return 'Critical';
  if (quantity < threshold) return 'Low';
  return 'OK';
}

function getBarColor(quantity: number, threshold: number): string {
  if (quantity === 0) return Colors.red;
  if (quantity < threshold) return Colors.amber;
  return Colors.green;
}

function getStatusColor(status: StockStatus): string {
  switch (status) {
    case 'OK':       return Colors.green;
    case 'Low':      return Colors.amber;
    case 'Critical': return Colors.red;
  }
}

function StockBar({quantity, maxQuantity, threshold}: {quantity: number; maxQuantity: number; threshold: number}) {
  const pct = Math.min(100, (quantity / maxQuantity) * 100);
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: `${pct}%` as `${number}%`,
            backgroundColor: getBarColor(quantity, threshold),
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
  const status = getStatus(item.quantity, item.threshold);
  const depletion = useDepletionRate(item.id, item.quantity);
  const qtyLabel = `${fmtQty(item.quantity)} / ${fmtQty(item.max_quantity)}${item.unit ? ' ' + item.unit : ''}`;

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <StatusBadge status={status} />
      </View>
      <View style={styles.itemMeta}>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemStockPct}>{qtyLabel}</Text>
      </View>
      <StockBar quantity={item.quantity} maxQuantity={item.max_quantity} threshold={item.threshold} />
      {depletion.available && depletion.daysRemaining > 0 && (
        <Text style={styles.depletionText}>~{depletion.daysRemaining} days left</Text>
      )}
    </View>
  );
}

export default function InventoryScreen() {
  const {profile} = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const {data: items = [], isLoading: loading} = useInventory(householdId);

  // RBAC: restricted users only see their allowed categories
  const allowedCategories: string[] | null =
    profile?.role === 'restricted' && profile.restricted_categories && profile.restricted_categories.length > 0
      ? profile.restricted_categories
      : null;

  const visibleItems = allowedCategories
    ? items.filter(item => item.category && allowedCategories.includes(item.category))
    : items;

  const filterCategories: FilterCategory[] = ['All', ...getUniqueCategories(visibleItems)];

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const insets = useSafeAreaInsets();
  const fabBottomOffset = insets.bottom + 80;

  useRealtimeHousehold(householdId);

  const filtered = activeCategory === 'All'
    ? visibleItems
    : visibleItems.filter(i => i.category === activeCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerCount}>{visibleItems.length} items</Text>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContent}
        style={styles.pillsRow}>
        {filterCategories.map(cat => (
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

      {/* Speed-dial backdrop */}
      {fabOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        />
      )}

      {/* Speed-dial actions */}
      {fabOpen && (
        <View style={[styles.speedDial, {bottom: fabBottomOffset + 60}]}>
          <TouchableOpacity
            style={styles.dialAction}
            activeOpacity={0.8}
            onPress={() => {
              setFabOpen(false);
              setShowCameraModal(true);
            }}>
            <Text style={styles.dialActionLabel}>Scan Items</Text>
            <View style={styles.dialActionBtn}>
              <Text style={styles.dialActionIcon}>🪄</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dialAction}
            activeOpacity={0.8}
            onPress={() => {
              setFabOpen(false);
              setShowBarcodeModal(true);
            }}>
            <Text style={styles.dialActionLabel}>Scan Barcode</Text>
            <View style={styles.dialActionBtn}>
              <Text style={styles.dialActionIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dialAction}
            activeOpacity={0.8}
            onPress={() => {
              setFabOpen(false);
              setShowAddModal(true);
            }}>
            <Text style={styles.dialActionLabel}>Add Manually</Text>
            <View style={styles.dialActionBtn}>
              <Text style={styles.dialActionIcon}>✏️</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, fabOpen && styles.fabOpen, {bottom: fabBottomOffset}]}
        activeOpacity={0.8}
        onPress={() => setFabOpen(o => !o)}>
        <Text style={[styles.fabIcon, fabOpen && styles.fabIconOpen]}>+</Text>
      </TouchableOpacity>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <BarcodeScanModal
        visible={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
      />

      <CameraInventoryModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
      />

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
  depletionText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    marginTop: 2,
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  speedDial: {
    position: 'absolute',
    bottom: Spacing.xl + 60,
    right: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'flex-end',
    zIndex: 20,
  },
  dialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dialActionLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dialActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialActionIcon: {
    fontSize: 20,
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
    zIndex: 20,
  },
  fabOpen: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
  },
  fabIcon: {
    color: Colors.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: Typography.weights.regular,
  },
  fabIconOpen: {
    transform: [{rotate: '45deg'}],
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
