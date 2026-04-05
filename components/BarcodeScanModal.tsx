import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useInventory, useAddInventoryItem} from '../hooks/queries';
import {NewItem} from '../types/models';
import {useAuthStore} from '../store/authStore';
import {mapOFFCategory, parseUnit} from '../utils/productParsers';

function getUniqueCategories(items: any[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category && item.category.trim()) {
      seen.add(item.category.trim());
    }
  }
  return Array.from(seen).sort();
}

type Step = 'scanning' | 'loading' | 'confirm' | 'notFound' | 'saving';

interface ProductDraft {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  brand: string;
}

const DEFAULT_CATEGORY_SUGGESTIONS = ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

async function lookupBarcode(barcode: string): Promise<ProductDraft | null> {
  try {
    // 1. Try OpenFoodFacts (food)
    let res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {headers: {'User-Agent': 'TendedApp/1.0'}},
    );
    let json = await res.json();

    // 2. Fallback to OpenProductsFacts (non-food)
    if (json.status !== 1 || !json.product) {
      res = await fetch(
        `https://world.openproductsfacts.org/api/v0/product/${barcode}.json`,
        {headers: {'User-Agent': 'TendedApp/1.0'}},
      );
      json = await res.json();
    }

    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const name =
      p.product_name_en?.trim() ||
      p.product_name?.trim() ||
      p.abbreviated_product_name?.trim() ||
      '';
    if (!name) return null;

    return {
      barcode,
      name,
      category: mapOFFCategory(p.categories),
      unit: parseUnit(p.quantity),
      brand: p.brands?.split(',')[0]?.trim() ?? '',
    };
  } catch {
    return null;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BarcodeScanModal({visible, onClose}: Props) {
  const {profile} = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const {data: items = []} = useInventory(householdId);
  const {mutateAsync: addItem} = useAddInventoryItem();

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('scanning');
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [maxQuantity, setMaxQuantity] = useState('1');
  const [threshold, setThreshold] = useState('0.25');
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      setStep('scanning');
      setDraft(null);
      setQuantity('1');
      setMaxQuantity('1');
      setThreshold('0.25');
      setManualName('');
      setManualCategory('');
      setError(null);
    }
  }, [visible]);

  // Request camera permission on open
  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarcodeScanned = useCallback(async ({data}: {data: string}) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setStep('loading');

    const product = await lookupBarcode(data);
    if (product) {
      setDraft(product);
      setStep('confirm');
    } else {
      setManualName('');
      setStep('notFound');
    }
  }, []);

  const handleSave = async () => {
    if (!profile?.household_id || !profile?.id) return;

    const name = draft ? draft.name.trim() : manualName.trim();
    if (!name) {
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
      setError('Threshold must be 0 or more.');
      return;
    }

    setStep('saving');
    setError(null);

    const resolvedCategory = draft ? draft.category.trim() || null : manualCategory.trim() || null;
    const newItem: NewItem = {
      name,
      category: resolvedCategory,
      quantity: qty,
      max_quantity: maxQty,
      threshold: thresh,
      unit: draft?.unit || null,
    };

    try {
      await addItem({
        householdId: profile.household_id,
        userId: profile.id,
        item: newItem,
      });
    } catch {
      setError('Failed to save. Please try again.');
      setStep(draft ? 'confirm' : 'notFound');
      return;
    }

    onClose();
  };

  const handleClose = () => {
    scannedRef.current = false;
    onClose();
  };

  if (!visible) return null;

  const unitLabel = draft?.unit ? ` ${draft.unit}` : '';

  // Shared quantity fields rendered in both confirm and notFound steps
  const QuantityFields = () => (
    <>
      <Text style={styles.label}>Quantity</Text>
      <View style={styles.quantityRow}>
        <View style={styles.quantityField}>
          <Text style={styles.quantityFieldLabel}>Current{unitLabel}</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textSecondary}
            placeholder="1"
          />
        </View>
        <Text style={styles.quantitySep}>/</Text>
        <View style={styles.quantityField}>
          <Text style={styles.quantityFieldLabel}>Max{unitLabel}</Text>
          <TextInput
            style={styles.input}
            value={maxQuantity}
            onChangeText={setMaxQuantity}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textSecondary}
            placeholder="1"
          />
        </View>
      </View>

      <Text style={styles.label}>Reorder when below{unitLabel}</Text>
      <TextInput
        style={styles.input}
        value={threshold}
        onChangeText={setThreshold}
        keyboardType="decimal-pad"
        placeholderTextColor={Colors.textSecondary}
        placeholder="0.25"
      />
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* ── Scanning ── */}
        {step === 'scanning' && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Barcode</Text>
              <View style={{width: 60}} />
            </View>

            {!permission?.granted ? (
              <View style={styles.center}>
                <Text style={styles.permText}>Camera access is needed to scan barcodes.</Text>
                <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                  <Text style={styles.btnText}>Allow Camera</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
                  }}
                />
                <View style={styles.overlay}>
                  <View style={styles.overlayTop} />
                  <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    <View style={styles.viewfinder}>
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.overlaySide} />
                  </View>
                  <View style={styles.overlayBottom}>
                    <Text style={styles.scanHint}>Point the camera at a product barcode</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text style={styles.loadingText}>Looking up product…</Text>
          </View>
        )}

        {/* ── Saving ── */}
        {step === 'saving' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text style={styles.loadingText}>Adding to inventory…</Text>
          </View>
        )}

        {/* ── Confirm (product found) ── */}
        {step === 'confirm' && draft && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => {
                scannedRef.current = false;
                setStep('scanning');
              }}>
                <Text style={styles.cancelText}>Rescan</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Product Found</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.productCard}>
                <Text style={styles.productBrand}>{draft.brand || 'Unknown brand'}</Text>
                <TextInput
                  style={styles.productNameInput}
                  value={draft.name}
                  onChangeText={t => setDraft(d => d ? {...d, name: t} : d)}
                  autoCapitalize="words"
                  placeholderTextColor={Colors.textSecondary}
                />
                {draft.unit ? <Text style={styles.productUnit}>{draft.unit}</Text> : null}
                <Text style={styles.barcodeLabel}>#{draft.barcode}</Text>
              </View>

              <Text style={styles.label}>Category <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Kitchen, Bedroom..."
                placeholderTextColor={Colors.textSecondary}
                value={draft.category}
                onChangeText={t => setDraft(d => d ? {...d, category: t} : d)}
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
                    onPress={() => setDraft(d => d ? {...d, category: chip} : d)}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <QuantityFields />
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ── Not found — manual fallback ── */}
        {step === 'notFound' && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => {
                scannedRef.current = false;
                setStep('scanning');
              }}>
                <Text style={styles.cancelText}>Rescan</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Not Found</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.notFoundMsg}>
                Product not found in database. Enter the details manually.
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}

              <Text style={styles.label}>Item name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dish Soap"
                placeholderTextColor={Colors.textSecondary}
                value={manualName}
                onChangeText={setManualName}
                autoFocus
                autoCapitalize="words"
              />

              <Text style={styles.label}>Category <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Kitchen, Bedroom..."
                placeholderTextColor={Colors.textSecondary}
                value={manualCategory}
                onChangeText={setManualCategory}
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
                    onPress={() => setManualCategory(chip)}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <QuantityFields />
            </ScrollView>
          </KeyboardAvoidingView>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const CORNER_SIZE = 20;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  flex: {flex: 1},
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
    width: 60,
  },
  saveText: {
    color: Colors.blue,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    width: 60,
    textAlign: 'right',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  // Camera
  cameraContainer: {flex: 1, position: 'relative'},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlayTop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)'},
  overlayMiddle: {
    flexDirection: 'row',
    height: 220,
  },
  overlaySide: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)'},
  viewfinder: {
    width: 260,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.blue,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 2,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 2,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 2,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 2,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  scanHint: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  // Forms
  form: {padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl},
  productCard: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: 4,
  },
  productBrand: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productNameInput: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
    paddingVertical: 2,
  },
  productUnit: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  barcodeLabel: {
    color: Colors.border,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    marginTop: 4,
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
  notFoundMsg: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: Border.width,
    borderColor: Colors.border,
  },
  permText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    fontWeight: Typography.weights.regular,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  btn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  btnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
});
