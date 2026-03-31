import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAddSpendingEntry, useInventory, useRestockFromReceipt} from '../hooks/queries';
import {SpendingCategory, NewSpendingEntry, Item} from '../types/models';
import {useAuthStore} from '../store/authStore';
import {supabase} from '../lib/supabase';
import {fuzzyMatchInventory} from '../utils/fuzzyMatch';

const CATEGORIES: SpendingCategory[] = ['Groceries', 'Cleaning', 'Pantry', 'Personal care'];

interface LineItem {
  item: string;
  amount: string;
  category: SpendingCategory;
}

interface RestockProposal {
  inventoryItem: Item;
  addQuantity: number;
  approved: boolean;
}

interface Props {
  visible: boolean;
  householdId: string;
  onClose: () => void;
}

type Step = 'pick' | 'processing' | 'review' | 'inventoryMatch';

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export default function ReceiptScanModal({visible, householdId, onClose}: Props) {
  const {profile} = useAuthStore();
  const {mutateAsync: addEntry} = useAddSpendingEntry();
  const {mutateAsync: restockFromReceipt} = useRestockFromReceipt();
  const {data: inventoryItems = []} = useInventory(householdId);

  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [restockProposals, setRestockProposals] = useState<RestockProposal[]>([]);
  const [saving, setSaving] = useState(false);

  const handlePickFromCamera = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to scan receipts.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      processImage(result.assets[0].uri, result.assets[0].base64);
    }
  };

  const handlePickFromGallery = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to import receipts.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      processImage(result.assets[0].uri, result.assets[0].base64);
    }
  };

  const processImage = async (uri: string, base64?: string | null) => {
    setImageUri(uri);
    setStep('processing');

    try {
      const {data, error} = await supabase.functions.invoke('analyze-image', {
        body: {action: 'receipt', image: base64},
      });

      if (error) throw error;

      if (data && data.items) {
        setLineItems(data.items);
      } else {
        Alert.alert('OCR Failed', 'Could not parse receipt. Please add manually.');
        setLineItems([]);
      }
      setStep('review');
    } catch {
      Alert.alert('Error', 'Failed to analyze receipt.');
      setStep('pick');
    }
  };

  const handleUpdateItem = (index: number, field: keyof LineItem, value: string) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = {...updated[index], [field]: value};
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setLineItems(prev => [...prev, {item: '', amount: '', category: 'Groceries'}]);
  };

  // Called from review step — checks for inventory matches before saving
  const handleContinue = () => {
    const matched: RestockProposal[] = lineItems
      .filter(li => li.item.trim())
      .reduce<RestockProposal[]>((acc, li) => {
        const match = fuzzyMatchInventory(li.item, inventoryItems);
        if (match && !acc.find(p => p.inventoryItem.id === match.id)) {
          acc.push({inventoryItem: match, addQuantity: 1, approved: true});
        }
        return acc;
      }, []);

    if (matched.length === 0) {
      // No inventory matches — skip directly to saving spending entries
      saveSpendingEntries();
      return;
    }

    setRestockProposals(matched);
    setStep('inventoryMatch');
  };

  const saveSpendingEntries = async () => {
    if (!profile?.id) return;
    const valid = lineItems.filter(li => li.item.trim() && parseFloat(li.amount) > 0);
    if (valid.length === 0) {
      Alert.alert('No valid items', 'Please ensure each item has a name and a valid amount.');
      return;
    }

    setSaving(true);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (const li of valid) {
      const entry: NewSpendingEntry = {
        amount: parseFloat(li.amount),
        category: li.category,
        item_name: li.item.trim(),
        date: dateStr,
        is_waste: false,
      };
      await addEntry({householdId, userId: profile.id, entry});
    }

    setSaving(false);
    handleClose();
  };

  const handleApplyRestocks = async () => {
    if (!profile?.id) return;
    setSaving(true);

    const approved = restockProposals.filter(p => p.approved);
    if (approved.length > 0) {
      await restockFromReceipt({
        proposals: approved.map(p => ({item: p.inventoryItem, addQuantity: p.addQuantity})),
        userId: profile.id,
        householdId,
      });
    }

    await saveSpendingEntries();
  };

  const handleClose = () => {
    setStep('pick');
    setImageUri(null);
    setLineItems([]);
    setRestockProposals([]);
    onClose();
  };

  const totalAmount = lineItems
    .map(li => parseFloat(li.amount) || 0)
    .reduce((sum, n) => sum + n, 0);

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
            <Text style={styles.headerTitle}>Scan Receipt</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Step: Pick */}
          {step === 'pick' && (
            <View style={styles.pickContainer}>
              <View style={styles.scanIconWrap}>
                <Text style={styles.scanIcon}>&#128444;</Text>
              </View>
              <Text style={styles.pickTitle}>Import a receipt</Text>
              <Text style={styles.pickSub}>
                Take a photo or choose from your library to auto-populate spending entries.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.8}
                onPress={handlePickFromCamera}>
                <Text style={styles.primaryBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.8}
                onPress={handlePickFromGallery}>
                <Text style={styles.secondaryBtnText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <View style={styles.processingContainer}>
              {imageUri && (
                <Image
                  source={{uri: imageUri}}
                  style={styles.receiptImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.processingOverlay}>
                <ActivityIndicator color={Colors.blue} size="large" />
                <Text style={styles.processingText}>Reading receipt...</Text>
              </View>
            </View>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <>
              <ScrollView
                style={styles.reviewScroll}
                contentContainerStyle={styles.reviewContent}
                keyboardShouldPersistTaps="handled">

                {imageUri && (
                  <Image
                    source={{uri: imageUri}}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.reviewLabel}>Review extracted items</Text>
                <Text style={styles.reviewSub}>
                  Edit names, amounts, or categories before adding to your spending.
                </Text>

                {lineItems.map((li, index) => (
                  <View key={index} style={styles.lineItem}>
                    <View style={styles.lineItemTop}>
                      <TextInput
                        style={styles.lineItemNameInput}
                        value={li.item}
                        onChangeText={val => handleUpdateItem(index, 'item', val)}
                        placeholder="Item name"
                        placeholderTextColor={Colors.textSecondary}
                        autoCapitalize="words"
                      />
                      <View style={styles.lineItemAmountRow}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.lineItemAmountInput}
                          value={li.amount}
                          onChangeText={val => handleUpdateItem(index, 'amount', val)}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryScroll}
                      contentContainerStyle={styles.categoryScrollContent}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryPill,
                            li.category === cat && styles.categoryPillActive,
                          ]}
                          onPress={() => handleUpdateItem(index, 'category', cat)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.categoryPillText,
                              li.category === cat && styles.categoryPillTextActive,
                            ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <TouchableOpacity
                      style={styles.removeItemBtn}
                      onPress={() => handleRemoveItem(index)}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <Text style={styles.removeItemText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addLineBtn} onPress={handleAddItem}>
                  <Text style={styles.addLineBtnText}>+ Add item</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.footerTotal}>
                  <Text style={styles.footerTotalLabel}>Total</Text>
                  <Text style={styles.footerTotalValue}>${totalAmount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addAllBtn, saving && styles.addAllBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={handleContinue}
                  disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                    : <Text style={styles.addAllBtnText}>Continue →</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step: Inventory match */}
          {step === 'inventoryMatch' && (
            <>
              <ScrollView
                style={styles.reviewScroll}
                contentContainerStyle={styles.reviewContent}>

                <Text style={styles.reviewLabel}>Restock inventory?</Text>
                <Text style={styles.reviewSub}>
                  These items were found in your inventory. Adjust amounts and toggle to apply.
                </Text>

                {restockProposals.map((proposal, idx) => {
                  const item = proposal.inventoryItem;
                  const newQty = Math.min(item.quantity + proposal.addQuantity, item.max_quantity);
                  const barPct = Math.min(100, (item.quantity / item.max_quantity) * 100);
                  const newBarPct = Math.min(100, (newQty / item.max_quantity) * 100);
                  const unitLabel = item.unit ? ` ${item.unit}` : '';

                  return (
                    <View key={idx} style={[styles.restockCard, !proposal.approved && styles.restockCardDisabled]}>
                      <View style={styles.restockCardHeader}>
                        <Text style={styles.restockItemName}>{item.name}</Text>
                        <TouchableOpacity
                          onPress={() => setRestockProposals(prev =>
                            prev.map((p, i) => i === idx ? {...p, approved: !p.approved} : p)
                          )}
                          activeOpacity={0.7}>
                          <View style={[styles.toggle, proposal.approved && styles.toggleActive]}>
                            <Text style={[styles.toggleText, proposal.approved && styles.toggleTextActive]}>
                              {proposal.approved ? 'On' : 'Off'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>

                      {/* Stock bar: before and after */}
                      <View style={styles.restockBars}>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, {width: `${barPct}%` as `${number}%`, backgroundColor: Colors.amber}]} />
                        </View>
                        <Text style={styles.restockArrow}>→</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, {width: `${newBarPct}%` as `${number}%`, backgroundColor: Colors.green}]} />
                        </View>
                      </View>

                      <View style={styles.restockMeta}>
                        <Text style={styles.restockCurrent}>{fmtQty(item.quantity)}{unitLabel}</Text>
                        <Text style={styles.restockArrow}>→</Text>
                        <Text style={styles.restockNew}>{fmtQty(newQty)}{unitLabel}</Text>
                      </View>

                      {/* Add quantity stepper */}
                      <View style={styles.restockStepper}>
                        <Text style={styles.restockStepperLabel}>Add</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => setRestockProposals(prev =>
                            prev.map((p, i) => i === idx
                              ? {...p, addQuantity: Math.max(0.5, p.addQuantity - 0.5)}
                              : p)
                          )}
                          disabled={proposal.addQuantity <= 0.5}>
                          <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepQty}>+{fmtQty(proposal.addQuantity)}{unitLabel}</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => setRestockProposals(prev =>
                            prev.map((p, i) => i === idx
                              ? {...p, addQuantity: p.addQuantity + 0.5}
                              : p)
                          )}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.skipBtn}
                  activeOpacity={0.8}
                  onPress={saveSpendingEntries}
                  disabled={saving}>
                  <Text style={styles.skipBtnText}>Skip, just save spending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addAllBtn, saving && styles.addAllBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={handleApplyRestocks}
                  disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                    : <Text style={styles.addAllBtnText}>Apply Restocks</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
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
  headerRight: {
    width: 50,
  },

  // Pick step
  pickContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  scanIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  scanIcon: {
    fontSize: 32,
  },
  pickTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  pickSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },

  // Processing step
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  receiptImage: {
    width: '80%',
    height: 300,
    borderRadius: Radius.md,
    opacity: 0.5,
  },
  processingOverlay: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  processingText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },

  // Review step
  reviewScroll: {
    flex: 1,
  },
  reviewContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  thumbnail: {
    width: '100%',
    height: 140,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  reviewLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  reviewSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },

  // Line item card
  lineItem: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  lineItemTop: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  lineItemNameInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    backgroundColor: Colors.background,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  lineItemAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    minWidth: 90,
  },
  currencySymbol: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  lineItemAmountInput: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    paddingVertical: Spacing.sm,
    width: 64,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    gap: Spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  categoryPillActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  categoryPillText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  categoryPillTextActive: {
    color: Colors.textPrimary,
  },
  removeItemBtn: {
    alignSelf: 'flex-end',
  },
  removeItemText: {
    color: Colors.red,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  addLineBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderStyle: 'dashed',
  },
  addLineBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Restock cards
  restockCard: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  restockCardDisabled: {
    opacity: 0.45,
  },
  restockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restockItemName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  toggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  toggleActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  restockBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  restockArrow: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  restockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  restockCurrent: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  restockNew: {
    color: Colors.green,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  restockStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  restockStepperLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    marginRight: Spacing.xs,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    borderWidth: Border.width,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  stepQty: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    minWidth: 48,
    textAlign: 'center',
  },

  // Footer
  footer: {
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTotalLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  footerTotalValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  skipBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  addAllBtn: {
    backgroundColor: Colors.green,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  addAllBtnDisabled: {
    opacity: 0.5,
  },
  addAllBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
