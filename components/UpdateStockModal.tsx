import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useUpdateQuantity, useDeleteInventoryItem} from '../hooks/queries';
import {Item} from '../types/models';
import {useAuthStore} from '../store/authStore';

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function getBarColor(quantity: number, _maxQuantity: number, threshold: number): string {
  if (quantity === 0) return Colors.red;
  if (quantity < threshold) return Colors.amber;
  return Colors.green;
}

interface Props {
  item: Item | null;
  onClose: () => void;
}

export default function UpdateStockModal({item, onClose}: Props) {
  const {profile} = useAuthStore();
  const {mutateAsync: updateQuantity} = useUpdateQuantity();
  const {mutateAsync: deleteItem} = useDeleteInventoryItem();

  const [pendingQuantity, setPendingQuantity] = useState(0);
  const [exactInput, setExactInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setPendingQuantity(item.quantity);
      setExactInput(fmtQty(item.quantity));
    }
  }, [item]);

  if (!item) return null;

  const clamp = (v: number) => Math.max(0, Math.min(v, item.max_quantity));
  const barPct = Math.min(100, (pendingQuantity / item.max_quantity) * 100);
  const barColor = getBarColor(pendingQuantity, item.max_quantity, item.threshold);
  const hasChanged = pendingQuantity !== item.quantity;
  const willGoLow = pendingQuantity < item.threshold && pendingQuantity > 0;
  const willBeEmpty = pendingQuantity === 0;

  const adjust = (delta: number) => {
    const next = clamp(pendingQuantity + delta);
    setPendingQuantity(next);
    setExactInput(fmtQty(next));
  };

  const setPreset = (value: number) => {
    const next = clamp(value);
    setPendingQuantity(next);
    setExactInput(fmtQty(next));
  };

  const handleExactChange = (text: string) => {
    setExactInput(text);
    // Allow ending with decimal, don't update pending quantity if it's invalid or empty.
    if (text === '') {
        setPendingQuantity(0);
        return;
    }
    const num = parseFloat(text);
    if (!isNaN(num)) {
      setPendingQuantity(clamp(num));
    }
  };

  const handleSave = async () => {
    if (!hasChanged) { onClose(); return; }
    if (!profile?.id) return;
    setLoading(true);
    await updateQuantity({
      itemId: item.id,
      userId: profile.id,
      oldQuantity: item.quantity,
      newQuantity: pendingQuantity,
      item,
    });
    setLoading(false);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleDelete = () => {
    if (loading) return;
    Alert.alert(
      `Delete "${item.name}"?`,
      'This will permanently remove the item from your inventory.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await deleteItem(item.id);
            setLoading(false);
            handleClose();
          },
        },
      ],
    );
  };

  const unitLabel = item.unit ? ` ${item.unit}` : '';

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Stock</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator color={Colors.blue} />
              : <Text style={[styles.saveText, !hasChanged && styles.saveDisabled]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Item info */}
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>
            {item.category}{item.unit ? ` · ${item.unit}` : ''}
          </Text>

          {/* Stock bar */}
          <View style={styles.barSection}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {width: `${barPct}%` as `${number}%`, backgroundColor: barColor},
                ]}
              />
            </View>
            <Text style={[styles.barLabel, {color: barColor}]}>
              {fmtQty(pendingQuantity)}/{fmtQty(item.max_quantity)}{unitLabel}
            </Text>
          </View>

          {/* Warnings */}
          {willBeEmpty && (
            <View style={[styles.alert, {borderColor: Colors.red}]}>
              <Text style={[styles.alertText, {color: Colors.red}]}>
                Item will be marked Critical and added to your shopping list.
              </Text>
            </View>
          )}
          {willGoLow && (
            <View style={[styles.alert, {borderColor: Colors.amber}]}>
              <Text style={[styles.alertText, {color: Colors.amber}]}>
                Item will be marked Low and added to your shopping list.
              </Text>
            </View>
          )}

          {/* +/- controls */}
          <Text style={styles.sectionLabel}>Adjust</Text>
          <View style={styles.adjustRow}>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => adjust(-1)} activeOpacity={0.7}>
              <Text style={styles.adjustBtnText}>−1{unitLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => adjust(-0.5)} activeOpacity={0.7}>
              <Text style={styles.adjustBtnText}>−½{unitLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => adjust(0.5)} activeOpacity={0.7}>
              <Text style={styles.adjustBtnText}>+½{unitLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => adjust(1)} activeOpacity={0.7}>
              <Text style={styles.adjustBtnText}>+1{unitLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick presets */}
          <Text style={styles.sectionLabel}>Quick set</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPreset(Math.round(pendingQuantity * 0.5 * 10) / 10)}
              activeOpacity={0.7}>
              <Text style={styles.presetBtnText}>Used ½</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPreset(0)}
              activeOpacity={0.7}>
              <Text style={styles.presetBtnText}>Used all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetBtn, {borderColor: Colors.green}]}
              onPress={() => setPreset(item.max_quantity)}
              activeOpacity={0.7}>
              <Text style={[styles.presetBtnText, {color: Colors.green}]}>Refill</Text>
            </TouchableOpacity>
          </View>

          {/* Exact amount */}
          <Text style={styles.sectionLabel}>Set exact amount</Text>
          <View style={styles.exactRow}>
            <TextInput
              style={styles.exactInput}
              value={exactInput}
              onChangeText={handleExactChange}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={styles.exactMax}>/ {fmtQty(item.max_quantity)}{unitLabel}</Text>
          </View>

          {/* Info rows */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current</Text>
            <Text style={styles.infoValue}>{fmtQty(item.quantity)}{unitLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reorder at</Text>
            <Text style={styles.infoValue}>{fmtQty(item.threshold)}{unitLabel}</Text>
          </View>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>Delete item</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  saveText: {
    color: Colors.blue,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  saveDisabled: {
    color: Colors.textSecondary,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
  },
  itemCategory: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    marginTop: -Spacing.sm,
  },
  barSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    minWidth: 70,
    textAlign: 'right',
  },
  alert: {
    borderWidth: Border.width,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  alertText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.xs,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  adjustBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  adjustBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  presetBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  exactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exactInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  exactMax: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  infoValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  deleteBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
    borderColor: Colors.red,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.red,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
