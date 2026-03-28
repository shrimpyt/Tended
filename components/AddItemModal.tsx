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
import {useInventoryStore, NewItem, getUniqueCategories} from '../store/inventoryStore';
import {useAuthStore} from '../store/authStore';

const DEFAULT_CATEGORY_SUGGESTIONS = ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

const STOCK_PRESETS = [
  {label: 'Full',  value: 100},
  {label: 'Half',  value: 50},
  {label: 'Low',   value: 20},
  {label: 'Empty', value: 0},
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddItemModal({visible, onClose, onAdded}: Props) {
  const {profile} = useAuthStore();
  const {addItem, items} = useInventoryStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [stockLevel, setStockLevel] = useState(100);
  const [threshold, setThreshold] = useState('25');
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCategory('');
    setStockLevel(100);
    setThreshold('25');
    setUnit('');
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
    const thresholdNum = parseInt(threshold, 10);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      setError('Threshold must be between 0 and 100.');
      return;
    }

    setError(null);
    setLoading(true);

    const newItem: NewItem = {
      name: name.trim(),
      category: category.trim() || null,
      stock_level: stockLevel,
      threshold: thresholdNum,
      unit: unit.trim() || null,
    };

    const id = await addItem(
      profile!.household_id!,
      profile!.id,
      newItem,
    );

    setLoading(false);

    if (!id) {
      setError('Failed to save item. Please try again.');
      return;
    }

    onAdded();
    handleClose();
  };

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

            {/* Stock level */}
            <Text style={styles.label}>Starting stock level</Text>
            <View style={styles.pillRow}>
              {STOCK_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.value}
                  style={[styles.pill, stockLevel === preset.value && styles.pillActive]}
                  onPress={() => setStockLevel(preset.value)}>
                  <Text style={[styles.pillText, stockLevel === preset.value && styles.pillTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.stockPreview}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${stockLevel}%` as `${number}%`,
                      backgroundColor: stockLevel === 0
                        ? Colors.red
                        : stockLevel <= 25
                        ? Colors.amber
                        : Colors.green,
                    },
                  ]}
                />
              </View>
              <Text style={styles.stockPct}>{stockLevel}%</Text>
            </View>

            {/* Threshold */}
            <Text style={styles.label}>Low stock threshold (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              placeholderTextColor={Colors.textSecondary}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}>
              You'll be alerted when stock drops below this level.
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
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
