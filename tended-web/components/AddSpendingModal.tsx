import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAddSpendingEntry} from '../hooks/queries';
import {SpendingCategory} from '../types/models';
import {useAuthStore} from '../store/authStore';

const CATEGORIES: SpendingCategory[] = ['Groceries', 'Cleaning', 'Pantry', 'Personal care'];

interface Props {
  visible: boolean;
  householdId: string;
  onClose: () => void;
}

export default function AddSpendingModal({visible, householdId, onClose}: Props) {
  const {profile} = useAuthStore();
  const {mutateAsync: addEntry} = useAddSpendingEntry();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<SpendingCategory>('Groceries');
  const [itemName, setItemName] = useState('');
  const [isWaste, setIsWaste] = useState(false);
  const [loading, setLoading] = useState(false);

  const amountNum = parseFloat(amount);
  const canSave = !isNaN(amountNum) && amountNum > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await addEntry({
      householdId,
      userId: profile!.id,
      entry: {
        amount: amountNum,
        category,
        item_name: itemName.trim() || null,
        date: dateStr,
        is_waste: isWaste,
      }
    });
    setLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setCategory('Groceries');
    setItemName('');
    setIsWaste(false);
    onClose();
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
            <Text style={styles.headerTitle}>Add Entry</Text>
            <TouchableOpacity onPress={handleSave} disabled={!canSave || loading}>
              {loading
                ? <ActivityIndicator color={Colors.blue} />
                : <Text style={[styles.saveText, !canSave && styles.saveDisabled]}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

            {/* Amount */}
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                autoFocus
              />
            </View>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}>
                  <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Item name (optional) */}
            <Text style={styles.label}>Item name <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.textInput}
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Paper towels"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              returnKeyType="done"
            />

            {/* Waste toggle */}
            <View style={styles.wasteRow}>
              <View>
                <Text style={styles.wasteLabel}>Mark as waste</Text>
                <Text style={styles.wasteSub}>Food spoiled or unused items discarded</Text>
              </View>
              <Switch
                value={isWaste}
                onValueChange={setIsWaste}
                trackColor={{false: Colors.border, true: Colors.amber}}
                thumbColor={Colors.textPrimary}
              />
            </View>
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
  saveDisabled: {
    color: Colors.textSecondary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.md,
  },
  optional: {
    color: Colors.textSecondary,
    fontWeight: Typography.weights.regular,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  currencySymbol: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.regular,
    marginRight: Spacing.xs,
  },
  amountInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.regular,
    paddingVertical: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  categoryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  categoryTextActive: {
    color: Colors.textPrimary,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    marginTop: Spacing.xs,
  },
  wasteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
  },
  wasteLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  wasteSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    marginTop: 2,
  },
});
