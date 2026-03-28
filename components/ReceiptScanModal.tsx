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
import {useSpendingStore, SpendingCategory, NewSpendingEntry} from '../store/spendingStore';
import {useAuthStore} from '../store/authStore';

// Mock OCR line items shown after picking an image
const MOCK_OCR_ITEMS: LineItem[] = [
  {item: 'Milk', amount: '4.99', category: 'Groceries'},
  {item: 'Bread', amount: '3.49', category: 'Groceries'},
  {item: 'Dish Soap', amount: '2.99', category: 'Cleaning'},
];

const CATEGORIES: SpendingCategory[] = ['Groceries', 'Cleaning', 'Pantry', 'Personal care'];

interface LineItem {
  item: string;
  amount: string;
  category: SpendingCategory;
}

interface Props {
  visible: boolean;
  householdId: string;
  onClose: () => void;
}

type Step = 'pick' | 'processing' | 'review';

export default function ReceiptScanModal({visible, householdId, onClose}: Props) {
  const {profile} = useAuthStore();
  const {addEntry} = useSpendingStore();

  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>(MOCK_OCR_ITEMS.map(i => ({...i})));
  const [saving, setSaving] = useState(false);

  const handlePickFromCamera = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to scan receipts.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      processImage(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to import receipts.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      processImage(result.assets[0].uri);
    }
  };

  const processImage = (uri: string) => {
    setImageUri(uri);
    setStep('processing');

    // Simulate OCR processing delay, then populate mock items
    setTimeout(() => {
      setLineItems(MOCK_OCR_ITEMS.map(i => ({...i})));
      setStep('review');
    }, 1500);
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

  const handleAddAll = async () => {
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
      await addEntry(householdId, profile!.id, entry);
    }

    setSaving(false);
    handleClose();
  };

  const handleClose = () => {
    setStep('pick');
    setImageUri(null);
    setLineItems(MOCK_OCR_ITEMS.map(i => ({...i})));
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

                {/* Thumbnail */}
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

                {/* Line items */}
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

                    {/* Category pills */}
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

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.footerTotal}>
                  <Text style={styles.footerTotalLabel}>Total</Text>
                  <Text style={styles.footerTotalValue}>${totalAmount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addAllBtn, saving && styles.addAllBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={handleAddAll}
                  disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                    : <Text style={styles.addAllBtnText}>Add All to Spending</Text>
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
    width: 50, // balance the cancel text width
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

  // Add item button
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
