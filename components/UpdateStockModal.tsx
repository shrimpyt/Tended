import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useInventoryStore, Item} from '../store/inventoryStore';
import {useAuthStore} from '../store/authStore';

const PRESETS = [
  {label: 'Full',  value: 100},
  {label: 'Half',  value: 50},
  {label: 'Low',   value: 20},
  {label: 'Empty', value: 0},
];

interface Props {
  item: Item | null;
  onClose: () => void;
}

function getBarColor(level: number, threshold: number): string {
  if (level === 0) return Colors.red;
  if (level < threshold) return Colors.amber;
  return Colors.green;
}

export default function UpdateStockModal({item, onClose}: Props) {
  const {profile} = useAuthStore();
  const {updateStockLevel} = useInventoryStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const pendingLevel = selected ?? item.stock_level;
  const barColor = getBarColor(pendingLevel, item.threshold);
  const willGoLow = pendingLevel < item.threshold && pendingLevel > 0;
  const willBeEmpty = pendingLevel === 0;

  const handleSave = async () => {
    if (selected === null || selected === item.stock_level) {
      onClose();
      return;
    }
    setLoading(true);
    await updateStockLevel(item.id, profile!.id, item.stock_level, selected);
    setLoading(false);
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

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
              : <Text style={[styles.saveText, selected === null && styles.saveDisabled]}>
                  Save
                </Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Item name + category */}
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category}{item.unit ? ` · ${item.unit}` : ''}</Text>

          {/* Stock bar */}
          <View style={styles.barSection}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pendingLevel}%` as `${number}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barPct, {color: barColor}]}>{pendingLevel}%</Text>
          </View>

          {/* Warning */}
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

          {/* Presets */}
          <Text style={styles.sectionLabel}>Quick set</Text>
          <View style={styles.presetRow}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.presetBtn,
                  pendingLevel === p.value && styles.presetBtnActive,
                ]}
                onPress={() => setSelected(p.value)}
                activeOpacity={0.7}>
                <Text style={[
                  styles.presetLabel,
                  pendingLevel === p.value && styles.presetLabelActive,
                ]}>
                  {p.label}
                </Text>
                <Text style={[
                  styles.presetPct,
                  pendingLevel === p.value && styles.presetLabelActive,
                ]}>
                  {p.value}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Current level indicator */}
          <View style={styles.currentRow}>
            <Text style={styles.currentLabel}>Current level</Text>
            <Text style={styles.currentValue}>{item.stock_level}%</Text>
          </View>
          <View style={styles.currentRow}>
            <Text style={styles.currentLabel}>Alert threshold</Text>
            <Text style={styles.currentValue}>{item.threshold}%</Text>
          </View>
        </View>
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
  barPct: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    width: 44,
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
    marginTop: Spacing.sm,
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
    gap: 2,
  },
  presetBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  presetLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  presetPct: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  presetLabelActive: {
    color: Colors.textPrimary,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  currentLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  currentValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
