import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useInventory } from '../../hooks/queries';
import { Item } from '../../types/models';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeHousehold } from '../../hooks/useRealtimeHousehold';
import { getCategoryColor, getCategoryChipBg } from '../../utils/categoryColors';
import AddItemModal from '../../components/AddItemModal';
import UpdateStockModal from '../../components/UpdateStockModal';
import BarcodeScanModal from '../../components/BarcodeScanModal';
import CameraInventoryModal from '../../components/CameraInventoryModal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function getUniqueCategories(items: Item[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category?.trim()) seen.add(item.category.trim());
  }
  return Array.from(seen).sort();
}

export { getUniqueCategories };

// ─────────────────────────────────────────────────────────────────────────────
// Item Card — Grid view
// ─────────────────────────────────────────────────────────────────────────────

function ItemGridCard({
  item,
  colors,
  onPress,
}: {
  item: Item;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  const catColor = getCategoryColor(item.category);
  const isLow = item.quantity < item.threshold;
  const isOut = item.quantity === 0;

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.md,
        gap: 6,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Category dot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: catColor,
          }}
        />
        <Text
          style={{
            color: colors.textMuted,
            fontSize: Typography.sizes.xs,
          }}
        >
          {item.category ?? '—'}
        </Text>
      </View>

      {/* Name */}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: Typography.sizes.sm,
          fontWeight: Typography.weights.semiBold,
          lineHeight: 18,
        }}
        numberOfLines={2}
      >
        {item.name}
      </Text>

      {/* Large quantity */}
      <Text
        style={{
          color: isOut
            ? colors.danger
            : isLow
            ? colors.warning
            : colors.textPrimary,
          fontSize: Typography.sizes.xxl,
          fontWeight: Typography.weights.bold,
          letterSpacing: -0.5,
        }}
      >
        {fmtQty(item.quantity)}
        {item.unit ? (
          <Text
            style={{
              fontSize: Typography.sizes.sm,
              fontWeight: Typography.weights.regular,
              color: colors.textSecondary,
            }}
          >
            {' '}
            {item.unit}
          </Text>
        ) : null}
      </Text>

      {/* Badge */}
      {(isLow || isOut) && (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: Radius.full,
            paddingHorizontal: 7,
            paddingVertical: 2,
            backgroundColor: isOut ? colors.dangerBg : colors.warningBg,
          }}
        >
          <Text
            style={{
              color: isOut ? colors.danger : colors.warning,
              fontSize: 10,
              fontWeight: Typography.weights.medium,
            }}
          >
            {isOut ? 'Out' : 'Low'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Item Row — List view
// ─────────────────────────────────────────────────────────────────────────────

function ItemListRow({
  item,
  colors,
  onPress,
}: {
  item: Item;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  const catColor = getCategoryColor(item.category);
  const isLow = item.quantity < item.threshold;
  const isOut = item.quantity === 0;
  const pct = Math.min(100, (item.quantity / item.max_quantity) * 100);

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: catColor,
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: Typography.sizes.md,
            fontWeight: Typography.weights.medium,
          }}
        >
          {item.name}
        </Text>
        <View
          style={{
            height: 4,
            backgroundColor: colors.surfaceAlt,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: isOut
                ? colors.danger
                : isLow
                ? colors.warning
                : colors.success,
              borderRadius: 2,
            }}
          />
        </View>
      </View>
      <Text
        style={{
          color: isOut
            ? colors.danger
            : isLow
            ? colors.warning
            : colors.textPrimary,
          fontSize: Typography.sizes.sm,
          fontWeight: Typography.weights.semiBold,
          minWidth: 40,
          textAlign: 'right',
        }}
      >
        {fmtQty(item.quantity)}
        {item.unit ? ` ${item.unit}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list';

export default function InventoryScreen() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: items = [], isLoading: loading } = useInventory(householdId);

  const allowedCategories: string[] | null =
    profile?.role === 'restricted' &&
    profile.restricted_categories &&
    profile.restricted_categories.length > 0
      ? profile.restricted_categories
      : null;

  const visibleItems = allowedCategories
    ? items.filter(item => allowedCategories.includes(item.category ?? ''))
    : items;

  const filterCategories = ['All', ...getUniqueCategories(visibleItems)];

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useRealtimeHousehold(householdId);

  const filtered: Item[] = useMemo(() => {
    let result = activeCategory === 'All'
      ? visibleItems
      : visibleItems.filter(i => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }
    return result;
  }, [activeCategory, visibleItems, search]);

  const fabBottom = insets.bottom + 80;

  // ─── Dynamic styles ────────────────────────────────────────────────────────
  const C = colors;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.background }}
      edges={['top']}
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
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
            Inventory
          </Text>
          <Text style={{ color: C.textMuted, fontSize: Typography.sizes.xs }}>
            {visibleItems.length} items
          </Text>
        </View>

        {/* Grid/List Toggle */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.surfaceAlt,
            borderRadius: Radius.sm,
            padding: 3,
          }}
        >
          {(['list', 'grid'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={{
                paddingHorizontal: Spacing.sm,
                paddingVertical: 4,
                borderRadius: Radius.xs,
                backgroundColor:
                  viewMode === mode ? C.surface : 'transparent',
              }}
              onPress={() => setViewMode(mode)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: viewMode === mode ? C.accent : C.textMuted,
                }}
              >
                {mode === 'list' ? '≡' : '⊞'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Search bar ───────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.surface,
            borderRadius: Radius.sm,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: Spacing.md,
            gap: Spacing.sm,
          }}
        >
          <Text style={{ color: C.textMuted, fontSize: 16 }}>⌕</Text>
          <TextInput
            style={{
              flex: 1,
              color: C.textPrimary,
              fontSize: Typography.sizes.sm,
              paddingVertical: Spacing.sm,
            }}
            placeholder="Search items…"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Category filter chips ────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          gap: Spacing.sm,
          paddingBottom: Spacing.sm,
        }}
        style={{ flexGrow: 0 }}
      >
        {filterCategories.map(cat => {
          const active = activeCategory === cat;
          const catColor = cat === 'All' ? C.accent : getCategoryColor(cat);
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: Spacing.md,
                paddingVertical: 6,
                borderRadius: Radius.full,
                borderWidth: 1,
                borderColor: active ? catColor : C.border,
                backgroundColor: active
                  ? isDark
                    ? getCategoryChipBg(cat)
                    : getCategoryChipBg(cat, 0.12)
                  : C.surface,
              }}
              activeOpacity={0.7}
            >
              {cat !== 'All' && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: catColor,
                  }}
                />
              )}
              <Text
                style={{
                  color: active ? catColor : C.textSecondary,
                  fontSize: Typography.sizes.xs,
                  fontWeight: active
                    ? Typography.weights.semiBold
                    : Typography.weights.medium,
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Item list / grid ─────────────────────────────────────── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textMuted, fontSize: Typography.sizes.md }}>
            {search ? 'No results' : 'No items yet — tap + to add one'}
          </Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: fabBottom + 24,
            gap: Spacing.sm,
          }}
          renderItem={({ item }) => (
            <ItemGridCard
              item={item}
              colors={C}
              onPress={() => setSelectedItem(item)}
            />
          )}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{
            paddingBottom: fabBottom + 24,
            backgroundColor: C.surface,
            marginHorizontal: Spacing.lg,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
          }}
          renderItem={({ item }) => (
            <ItemListRow
              item={item}
              colors={C}
              onPress={() => setSelectedItem(item)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={{ height: 1, backgroundColor: C.border, marginHorizontal: Spacing.md }}
            />
          )}
        />
      )}

      {fabOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(28,25,22,0.25)',
            zIndex: 10,
          }}
        />
      )}

      {fabOpen && (
        <View
          style={{
            position: 'absolute',
            bottom: fabBottom + 64,
            right: Spacing.xl,
            gap: Spacing.md,
            alignItems: 'flex-end',
            zIndex: 20,
          }}
        >
          {[
            { label: 'Scan Items', icon: '🪄', action: () => { setFabOpen(false); setShowCameraModal(true); } },
            { label: 'Scan Barcode', icon: '📷', action: () => { setFabOpen(false); setShowBarcodeModal(true); } },
            { label: 'Add Manually', icon: '✏️', action: () => { setFabOpen(false); setShowAddModal(true); } },
          ].map(({ label, icon, action }) => (
            <TouchableOpacity
              key={label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
              onPress={action}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color: C.textPrimary,
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.medium,
                  backgroundColor: C.surface,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.xs,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                }}
              >
                {label}
              </Text>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>{icon}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── FAB ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: fabBottom,
          right: Spacing.xl,
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: fabOpen ? C.surfaceAlt : C.accent,
          borderWidth: fabOpen ? 1 : 0,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          shadowColor: C.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
        onPress={() => setFabOpen(o => !o)}
        activeOpacity={0.85}
      >
        <Text
          style={{
            color: fabOpen ? C.textSecondary : '#fff',
            fontSize: 26,
            lineHeight: 30,
            transform: [{ rotate: fabOpen ? '45deg' : '0deg' }],
          }}
        >
          +
        </Text>
      </TouchableOpacity>

      <AddItemModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
      <BarcodeScanModal visible={showBarcodeModal} onClose={() => setShowBarcodeModal(false)} />
      <CameraInventoryModal visible={showCameraModal} onClose={() => setShowCameraModal(false)} />
      <UpdateStockModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </SafeAreaView>
  );
}
