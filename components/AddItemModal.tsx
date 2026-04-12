import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useInventory, useAddInventoryItem} from '../hooks/queries';
import {NewItem} from '../types/models';
import {useAuthStore} from '../store/authStore';
import { getSuggestedUnits } from '../utils/item-utils';

function getUniqueCategories(items: any[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category && item.category.trim()) {
      seen.add(item.category.trim());
    }
  }
  return Array.from(seen).sort();
}

const DEFAULT_CATEGORY_SUGGESTIONS = ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddItemModal({visible, onClose}: Props) {
  const {profile} = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const {data: items = []} = useInventory(householdId);
  const {mutateAsync: addItem} = useAddInventoryItem();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [maxQuantity, setMaxQuantity] = useState('1');
  const [threshold, setThreshold] = useState('0.25');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCategory('');
    setUnit('');
    setQuantity('1');
    setMaxQuantity('1');
    setThreshold('0.25');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    const qty = parseFloat(quantity);
    const maxQty = parseFloat(maxQuantity);
    const thresh = parseFloat(threshold);

    if (isNaN(qty) || qty < 0) {
      setError('Starting quantity must be 0 or more.');
      return;
    }
    if (isNaN(maxQty) || maxQty <= 0) {
      setError('Max quantity must be greater than 0.');
      return;
    }
    if (qty > maxQty) {
      setError('Starting quantity cannot exceed max quantity.');
      return;
    }
    if (isNaN(thresh) || thresh < 0) {
      setError('Reorder threshold must be 0 or more.');
      return;
    }

    setError(null);
    setLoading(true);

    const newItem: NewItem = {
      name: name.trim(),
      category: category.trim() || null,
      quantity: qty,
      max_quantity: maxQty,
      threshold: thresh,
      unit: unit.trim() || null,
    };

    try {
      await addItem({
        householdId: profile!.household_id!,
        userId: profile!.id,
        item: newItem,
      });
    } catch {
      setLoading(false);
      setError('Failed to save item. Please try again.');
      return;
    }

    setLoading(false);
    handleClose();
  };

  const qtyNum = parseFloat(quantity) || 0;
  const maxQtyNum = parseFloat(maxQuantity) || 1;
  const barPct = Math.min(100, (qtyNum / maxQtyNum) * 100);
  const unitLabel = unit.trim() ? ` ${unit.trim()}` : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Item</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading
                ? <ActivityIndicator color={Colors.blue} />
                : <Text style={styles.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Name */}
            <Text style={styles.label}>Item name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dish Soap"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
            />

            {/* Unit */}
            <Text style={styles.label}>Unit <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. bottles, rolls, kg"
              placeholderTextColor={Colors.textSecondary}
              value={unit}
              onChangeText={setUnit}
              autoCapitalize="none"
            />

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.unitChipsContainer}
              contentContainerStyle={styles.unitChipsContent}
            >
              {getSuggestedUnits(category).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitChip,
                    unit === u && styles.unitChipSelected
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[
                    styles.unitChipText,
                    unit === u && styles.unitChipTextSelected
                  ]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category */}
            <Text style={styles.label}>Category <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kitchen, Bedroom..."
              placeholderTextColor={Colors.textSecondary}
              value={category}
              onChangeText={setCategory}
              autoCapitalize="words"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionRow}>
              {(getUniqueCategories(items).length > 0
                ? getUniqueCategories(items)
                : DEFAULT_CATEGORY_SUGGESTIONS
              ).map(chip => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => setCategory(chip)}>
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quantity */}
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.quantityRow}>
              <View style={styles.quantityField}>
                <Text style={styles.quantityFieldLabel}>Current{unitLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={Colors.textSecondary}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.quantitySep}>/</Text>
              <View style={styles.quantityField}>
                <Text style={styles.quantityFieldLabel}>Max{unitLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={Colors.textSecondary}
                  value={maxQuantity}
                  onChangeText={setMaxQuantity}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Stock preview bar */}
            <View style={styles.stockPreview}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barPct}%` as `${number}%`,
                      backgroundColor: barPct === 0 ? Colors.red : barPct <= 25 ? Colors.amber : Colors.green,
                    },
                  ]}
                />
              </View>
              <Text style={styles.stockPct}>{Math.round(barPct)}%</Text>
            </View>

            {/* Threshold */}
            <Text style={styles.label}>Reorder when below{unitLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.25"
              placeholderTextColor={Colors.textSecondary}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>
              You'll be alerted when{unitLabel ? unitLabel.trim() : ' amount'} drops below this.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  form: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.md,
  },
  optional: {
    color: Colors.textSecondary,
    fontWeight: Typography.weights.regular,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    marginBottom: Spacing.sm,
  },
  unitChipsContainer: {
    marginBottom: Spacing.lg,
  },
  unitChipsContent: {
    gap: Spacing.xs,
  },
  unitChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  unitChipSelected: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  unitChipText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
  },
  unitChipTextSelected: {
    color: '#FFF',
  },
  suggestionRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  quantityField: {
    flex: 1,
    gap: Spacing.xs,
  },
  quantityFieldLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  quantitySep: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.regular,
    paddingBottom: Spacing.md,
  },
  stockPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockPct: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    width: 36,
    textAlign: 'right',
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    marginTop: 2,
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
});
