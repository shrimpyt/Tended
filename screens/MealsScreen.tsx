import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useShoppingListStore, ShoppingListItem} from '../store/shoppingListStore';
import {useAuthStore} from '../store/authStore';
import {useRealtimeHousehold} from '../hooks/useRealtimeHousehold';

function ShoppingRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingListItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isSystem = item.added_by === 'system';

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxDone]}
        onPress={onToggle}
        activeOpacity={0.7}>
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.rowContent}>
        <Text style={[styles.rowName, item.completed && styles.rowNameDone]}>
          {item.item_name}
        </Text>
        <View style={styles.rowMeta}>
          {isSystem ? (
            <View style={styles.autoTag}>
              <Text style={styles.autoTagText}>Auto-added</Text>
            </View>
          ) : (
            <Text style={styles.addedBy}>Added by {item.added_by_name}</Text>
          )}
          {item.note && <Text style={styles.note}> · {item.note}</Text>}
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MealsScreen() {
  const {profile} = useAuthStore();
  const {items, loading, fetchItems, addItem, toggleComplete, deleteItem} = useShoppingListStore();
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);

  const householdId = profile?.household_id ?? '';

  const refresh = useCallback(() => {
    if (householdId) fetchItems(householdId);
  }, [householdId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeHousehold(householdId, {onShoppingListChange: refresh});

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    setAdding(true);
    await addItem(householdId, profile!.id, newItemName.trim());
    setNewItemName('');
    setAdding(false);
  };

  const pendingItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meals</Text>
        </View>

        {/* Meal suggestions placeholder */}
        <View style={styles.mealsPlaceholder}>
          <Text style={styles.placeholderTitle}>Suggested meals</Text>
          <Text style={styles.placeholderSub}>Coming in Phase 9 — meal suggestions based on your pantry.</Text>
        </View>

        <View style={styles.divider} />

        {/* Shopping list header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shopping list</Text>
          <Text style={styles.sectionCount}>
            {pendingItems.length} {pendingItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.blue} />
          </View>
        ) : (
          <FlatList
            data={pendingItems}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <ShoppingRow
                item={item}
                onToggle={() => toggleComplete(item.id, true)}
                onDelete={() => deleteItem(item.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nothing on the list. Add something below.</Text>
            }
          />
        )}

        {/* Add item input */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add an item..."
            placeholderTextColor={Colors.textSecondary}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.addBtn, (!newItemName.trim() || adding) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newItemName.trim() || adding}
            activeOpacity={0.8}>
            {adding
              ? <ActivityIndicator color={Colors.textPrimary} size="small" />
              : <Text style={styles.addBtnText}>Add</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
  },

  // Meals placeholder
  mealsPlaceholder: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  placeholderTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  placeholderSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
  },

  divider: {
    height: Border.width,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  sectionCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  separator: {
    height: Border.width,
    backgroundColor: Colors.border,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  rowNameDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addedBy: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  note: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  autoTag: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  autoTagText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weights.medium,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  deleteText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  addBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    paddingVertical: Spacing.lg,
  },
});
