import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  SectionList,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeHousehold } from '../../hooks/useRealtimeHousehold';
import {
  useShoppingList,
  useToggleShoppingListItem,
  useAddShoppingListItem,
  useDeleteShoppingListItem,
} from '../../hooks/queries';
import { ShoppingListItem } from '../../types/models';
import { getCategoryColor } from '../../utils/categoryColors';

const ALL_CATEGORIES = [
  'Pantry', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Beverages', 'Household', 'Other',
];

export default function ShoppingListTab() {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: shoppingItems = [], isLoading } = useShoppingList(householdId);
  const { mutate: toggleItem } = useToggleShoppingListItem();
  const { mutate: addItem, isPending: adding } = useAddShoppingListItem();
  const { mutate: deleteItem } = useDeleteShoppingListItem();

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('Pantry');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useRealtimeHousehold(householdId);

  const C = colors;

  // Note: the shopping list query only returns incomplete items.
  // Completed items are toggled and then disappear from the list naturally.
  const sections = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    for (const item of shoppingItems) {
      const cat = (item as any).category ?? 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return Object.entries(groups).map(([cat, items]) => ({
      title: cat,
      data: items,
      completed: false,
    }));
  }, [shoppingItems]);

  const handleAdd = () => {
    const name = newItemName.trim();
    const userId = profile?.id;
    if (!name || !householdId || !userId) return;
    addItem({ householdId, userId, itemName: name });
    setNewItemName('');
  };

  const handleClearChecked = () => {
    shoppingItems
      .filter(i => i.completed)
      .forEach(i => deleteItem(i.id));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.md,
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
            Shopping List
          </Text>
          <Text style={{ color: C.textMuted, fontSize: Typography.sizes.xs }}>
            {shoppingItems.length} items remaining
          </Text>
        </View>
      </View>

      {/* ─── List ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 120,
            gap: 4,
          }}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingVertical: Spacing.sm,
                marginTop: Spacing.sm,
              }}
            >
              {section.title !== 'Checked' && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: getCategoryColor(section.title),
                  }}
                />
              )}
              <Text
                style={{
                  color: section.completed ? C.textMuted : C.textSecondary,
                  fontSize: Typography.sizes.xs,
                  fontWeight: Typography.weights.semiBold,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
                {section.completed && ` (${section.data.length})`}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: C.surface,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm + 2,
                gap: Spacing.sm,
                marginBottom: 4,
                opacity: section.completed ? 0.6 : 1,
              }}
            >
              {/* Checkbox */}
              <TouchableOpacity
                onPress={() =>
                  toggleItem({ itemId: item.id, completed: !item.completed })
                }
                activeOpacity={0.7}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: item.completed ? C.success : C.border,
                  backgroundColor: item.completed ? C.successBg : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.completed && (
                  <Text
                    style={{
                      color: C.success,
                      fontSize: 12,
                      fontWeight: Typography.weights.bold,
                    }}
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>

              {/* Item name */}
              <Text
                style={{
                  flex: 1,
                  color: item.completed ? C.textMuted : C.textPrimary,
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.regular,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                }}
              >
                {item.item_name}
              </Text>

              {/* Auto-added pill */}
              {item.added_by === 'system' && !item.completed && (
                <View
                  style={{
                    borderRadius: Radius.full,
                    borderWidth: 1,
                    borderColor: C.info,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      color: C.info,
                      fontSize: 10,
                      fontWeight: Typography.weights.medium,
                    }}
                  >
                    Auto
                  </Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View
              style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}
            >
              <Text
                style={{
                  fontSize: 40,
                  marginBottom: Spacing.md,
                }}
              >
                🛒
              </Text>
              <Text
                style={{
                  color: C.textMuted,
                  fontSize: Typography.sizes.md,
                  textAlign: 'center',
                }}
              >
                Your shopping list is empty
              </Text>
              <Text
                style={{
                  color: C.textMuted,
                  fontSize: Typography.sizes.sm,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                Add items below
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Add Item Row ──────────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          paddingBottom: insets.bottom + 72,
          backgroundColor: C.surface,
          borderTopWidth: 1,
          borderTopColor: C.border,
          gap: Spacing.sm,
        }}
      >
        {/* Category picker */}
        <ScrollViewRow colors={C} selected={newItemCategory} onSelect={setNewItemCategory} />

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: C.background,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: Radius.sm,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              color: C.textPrimary,
              fontSize: Typography.sizes.sm,
            }}
            placeholder="Add an item…"
            placeholderTextColor={C.textMuted}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.85}
            disabled={!newItemName.trim() || adding}
            style={{
              backgroundColor:
                newItemName.trim() ? C.accent : C.surfaceAlt,
              borderRadius: Radius.sm,
              paddingHorizontal: Spacing.md,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
            }}
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text
                style={{
                  color: newItemName.trim() ? '#fff' : C.textMuted,
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semiBold,
                }}
              >
                Add
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Mini horizontal category scroller for the add-row
function ScrollViewRow({
  colors,
  selected,
  onSelect,
}: {
  colors: any;
  selected: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {ALL_CATEGORIES.map(cat => {
        const active = selected === cat;
        const catColor = getCategoryColor(cat);
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onSelect(cat)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: active ? catColor : colors.border,
              backgroundColor: active ? `${catColor}20` : 'transparent',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: catColor,
              }}
            />
            <Text
              style={{
                color: active ? catColor : colors.textSecondary,
                fontSize: 11,
                fontWeight: active ? '600' : '400',
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
