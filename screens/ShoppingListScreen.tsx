import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ListRenderItemInfo,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAuthStore} from '../store/authStore';
import {useShoppingList, useAddShoppingListItem, useToggleShoppingListItem, useDeleteShoppingListItem} from '../hooks/queries';
import {ShoppingListItem} from '../types/models';
import {useRealtimeHousehold} from '../hooks/useRealtimeHousehold';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListRow =
  | {type: 'sectionHeader'; title: string; count: number}
  | {type: 'item'; data: ShoppingListItem}
  | {type: 'empty'; message: string};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({title, count}: {title: string; count: number}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <Text style={styles.sectionHeaderCount}>{count}</Text>
    </View>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingListItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.itemRow}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.checkboxArea}
        onPress={onToggle}
        hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.completed && styles.itemNameDone]}>
          {item.item_name}
        </Text>
        {item.note ? (
          <Text style={[styles.itemNote, item.completed && styles.itemNoteDone]}>
            {item.note}
          </Text>
        ) : null}
        <Text style={styles.itemMeta}>
          {item.added_by === 'system' ? 'Auto-added · low stock' : `Added by ${item.added_by_name ?? 'you'}`}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
}

export default function ShoppingListScreen({onClose}: Props) {
  const {profile} = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const userId = profile?.id ?? '';

  const {data: items = [], isLoading: loading} = useShoppingList(householdId);
  const {mutateAsync: addItem} = useAddShoppingListItem();
  const {mutate: toggleComplete} = useToggleShoppingListItem();
  const {mutateAsync: deleteItemAsync, mutate: deleteItem} = useDeleteShoppingListItem();

  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useRealtimeHousehold(householdId);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleAdd = useCallback(async () => {
    const trimmed = newItemText.trim();
    if (!trimmed || !householdId || !userId) return;
    setAdding(true);
    setNewItemText('');
    await addItem({householdId, userId, itemName: trimmed});
    setAdding(false);
    inputRef.current?.focus();
  }, [newItemText, householdId, userId, addItem]);

  const handleToggle = useCallback(
    (item: ShoppingListItem) => {
      toggleComplete({itemId: item.id, completed: !item.completed});
    },
    [toggleComplete],
  );

  const handleDelete = useCallback(
    (itemId: string) => {
      deleteItem(itemId);
    },
    [deleteItem],
  );

  // Mark all items complete (removes them from the store/list)
  const handleClearAll = useCallback(async () => {
    await Promise.all(items.map(i => deleteItemAsync(i.id)));
  }, [items, deleteItemAsync]);

  // ---------------------------------------------------------------------------
  // List data
  // ---------------------------------------------------------------------------

  const {systemItems, manualItems} = useMemo(() => {
    const sys: ShoppingListItem[] = [];
    const manual: ShoppingListItem[] = [];
    for (const item of items) {
      if (item.added_by === 'system') {
        sys.push(item);
      } else {
        manual.push(item);
      }
    }
    return {systemItems: sys, manualItems: manual};
  }, [items]);

  const listData: ListRow[] = useMemo(() => {
    const rows: ListRow[] = [];

    if (systemItems.length > 0) {
      rows.push({type: 'sectionHeader', title: 'Low stock', count: systemItems.length});
      systemItems.forEach(i => rows.push({type: 'item', data: i}));
    }

    if (manualItems.length > 0) {
      rows.push({type: 'sectionHeader', title: 'Added manually', count: manualItems.length});
      manualItems.forEach(i => rows.push({type: 'item', data: i}));
    }

    if (systemItems.length === 0 && manualItems.length === 0) {
      rows.push({type: 'empty', message: 'Your shopping list is empty'});
    }

    return rows;
  }, [systemItems, manualItems]);

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<ListRow>) => {
      if (item.type === 'sectionHeader') {
        return <SectionHeader title={item.title} count={item.count} />;
      }
      if (item.type === 'item') {
        return (
          <ItemRow
            item={item.data}
            onToggle={() => handleToggle(item.data)}
            onDelete={() => handleDelete(item.data.id)}
          />
        );
      }
      if (item.type === 'empty') {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{item.message}</Text>
            <Text style={styles.emptyStateSub}>
              Add items below or they'll appear automatically when stock runs low.
            </Text>
          </View>
        );
      }
      return null;
    },
    [handleToggle, handleDelete],
  );

  const keyExtractor = useCallback((item: ListRow, index: number) => {
    if (item.type === 'item') return item.data.id;
    return `${item.type}-${index}`;
  }, []);

  const hasItems = items.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping list</Text>
          {hasItems ? (
            <TouchableOpacity activeOpacity={0.7} onPress={handleClearAll}>
              <Text style={styles.clearBtn}>Clear all</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.blue} />
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Add item input */}
        <View style={styles.addRow}>
          <TextInput
            ref={inputRef}
            style={styles.addInput}
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder="Add an item..."
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            editable={!adding}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.addBtn, (!newItemText.trim() || adding) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newItemText.trim() || adding}>
            {adding ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.addBtnText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  clearBtn: {
    color: Colors.amber,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  headerSpacer: {
    width: 60,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: 0,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionHeaderText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  checkboxArea: {
    padding: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    lineHeight: 14,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  itemNameDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  itemNote: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  itemNoteDone: {
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weights.regular,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },

  // Empty state
  emptyState: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyStateText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  emptyStateSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  addInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
  },
  addBtn: {
    height: 44,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.blue,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
