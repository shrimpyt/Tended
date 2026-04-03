import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {useCameraPermissions} from 'expo-image-picker';
import {Colors, Typography, Spacing, Radius, Border, Shadows} from '../constants/theme';
import {useInventory, useAddInventoryItem} from '../hooks/queries';
import {NewItem} from '../types/models';
import {useAuthStore} from '../store/authStore';
import {supabase} from '../lib/supabase';

function getUniqueCategories(items: any[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category && item.category.trim()) {
      seen.add(item.category.trim());
    }
  }
  return Array.from(seen).sort();
}

type Step = 'pick' | 'analyzing' | 'review' | 'saving';

interface IdentifiedItem {
  name: string;
  category: string;
  quantity: number;
  max_quantity: number;
  threshold: number;
  unit: string | null;
  checked: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CameraInventoryModal({visible, onClose}: Props) {
  const {profile} = useAuthStore();
  const householdId = profile?.household_id ?? '';

  const {data: items = []} = useInventory(householdId);
  const {mutateAsync: addItem} = useAddInventoryItem();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>('pick');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [identified, setIdentified] = useState<IdentifiedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const categorySuggestions =
    getUniqueCategories(items).length > 0
      ? getUniqueCategories(items)
      : ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

  const reset = () => {
    setStep('pick');
    setPhotoUri(null);
    setIdentified([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processImage = async (uri: string, base64?: string | null) => {
    setPhotoUri(uri);
    setStep('analyzing');
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { action: 'inventory', image: base64 }
      });

      if (error) {
        console.error("Supabase Edge Function Error:", error);
        throw new Error(error.message ?? 'Edge function failed');
      }

      if (data && data.items) {
        const drafts = data.items.map((item: any) => ({
          name: item.name,
          category: item.category,
          // AI returns stock_level 10-100; map to 0-1 quantity fraction
          quantity: Math.round(((item.stock_level || 50) / 100) * 10) / 10,
          max_quantity: 1,
          threshold: 0.25,
          unit: item.unit || null,
          checked: true,
        }));
        setIdentified(drafts);
      } else {
        setIdentified([]);
      }
      setStep('review');
    } catch (err) {
      setError('Failed to analyze image.');
      setStep('pick');
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
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

  const handleChoosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      processImage(result.assets[0].uri, result.assets[0].base64);
    }
  };

  const toggleItem = (index: number) => {
    setIdentified(prev =>
      prev.map((item, i) => (i === index ? {...item, checked: !item.checked} : item)),
    );
  };

  const updateItem = (index: number, field: 'name' | 'category', value: string) => {
    setIdentified(prev =>
      prev.map((item, i) => (i === index ? {...item, [field]: value} : item)),
    );
  };

  const handleAddAll = async () => {
    if (!profile?.household_id || !profile?.id) return;
    setStep('saving');

    const toAdd = identified.filter(i => i.checked && i.name.trim());
    for (const item of toAdd) {
      const newItem: NewItem = {
        name: item.name.trim(),
        category: item.category.trim() || null,
        quantity: item.quantity,
        max_quantity: item.max_quantity,
        threshold: item.threshold,
        unit: item.unit,
      };
      try {
        await addItem({
          householdId: profile.household_id,
          userId: profile.id,
          item: newItem,
        });
      } catch (e) {
        console.error(e);
      }
    }

    handleClose();
  };

  const selectedCount = identified.filter(i => i.checked).length;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* ── Pick photo ── */}
        {step === 'pick' && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Items</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.pickBody}>
              <Text style={styles.pickTitle}>Point your camera at a shelf,{'\n'}cupboard, or any surface</Text>
              <Text style={styles.pickSubtitle}>
                AI will identify everything it can see and add it to your inventory
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.pickButtons}>
                <TouchableOpacity style={styles.pickBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <Text style={styles.pickBtnIcon}>📷</Text>
                  <Text style={styles.pickBtnLabel}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickBtn} onPress={handleChoosePhoto} activeOpacity={0.8}>
                  <Text style={styles.pickBtnIcon}>🖼️</Text>
                  <Text style={styles.pickBtnLabel}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.pickTip}>
                💡 Works best with good lighting and items in clear view
              </Text>
            </View>
          </>
        )}

        {/* ── Analyzing ── */}
        {step === 'analyzing' && (
          <View style={styles.center}>
            {photoUri && (
              <Image source={{uri: photoUri}} style={styles.photoThumb} resizeMode="cover" />
            )}
            <ActivityIndicator size="large" color={Colors.blue} style={styles.spinner} />
            <Text style={styles.analyzingTitle}>Identifying items…</Text>
            <Text style={styles.analyzingSubtitle}>AI is scanning your photo</Text>
          </View>
        )}

        {/* ── Review ── */}
        {step === 'review' && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setStep('pick')}>
                <Text style={styles.cancelText}>Retake</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {identified.length} item{identified.length !== 1 ? 's' : ''} found
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.reviewSubtitle}>
              Tap to deselect, or edit names and categories
            </Text>

            <ScrollView contentContainerStyle={styles.reviewList} keyboardShouldPersistTaps="handled">
              {identified.map((item, idx) => (
                <View key={idx} style={[styles.reviewRow, !item.checked && styles.reviewRowUnchecked]}>
                  <TouchableOpacity
                    style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                    onPress={() => toggleItem(idx)}
                    activeOpacity={0.7}>
                    {item.checked && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.reviewFields}>
                    <TextInput
                      style={[styles.reviewNameInput, !item.checked && styles.reviewInputUnchecked]}
                      value={item.name}
                      onChangeText={v => updateItem(idx, 'name', v)}
                      placeholderTextColor={Colors.textSecondary}
                      autoCapitalize="words"
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryChips}>
                      {categorySuggestions.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            item.category === cat && styles.categoryChipActive,
                          ]}
                          onPress={() => updateItem(idx, 'category', cat)}>
                          <Text
                            style={[
                              styles.categoryChipText,
                              item.category === cat && styles.categoryChipTextActive,
                            ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.footerCount}>
                {selectedCount} of {identified.length} selected
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, selectedCount === 0 && styles.addBtnDisabled]}
                onPress={handleAddAll}
                disabled={selectedCount === 0}
                activeOpacity={0.8}>
                <Text style={styles.addBtnText}>
                  Add {selectedCount} item{selectedCount !== 1 ? 's' : ''} →
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Saving ── */}
        {step === 'saving' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text style={styles.analyzingTitle}>Adding to inventory…</Text>
          </View>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
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
  headerSpacer: {width: 60},
  // Pick step
  pickBody: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  pickTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    lineHeight: 28,
  },
  pickSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  pickButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  pickBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  pickBtnIcon: {fontSize: 32},
  pickBtnLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  pickTip: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  errorBox: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.red,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    width: '100%',
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  // Analyzing
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  photoThumb: {
    width: 140,
    height: 140,
    borderRadius: Radius.md,
    opacity: 0.7,
  },
  spinner: {marginTop: Spacing.md},
  analyzingTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  analyzingSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  // Review
  reviewSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  reviewList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 130,
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  reviewRowUnchecked: {opacity: 0.5},
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {backgroundColor: Colors.blue, borderColor: Colors.blue},
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: Typography.weights.bold,
  },
  reviewFields: {flex: 1, gap: Spacing.sm},
  reviewNameInput: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    paddingVertical: 0,
  },
  reviewInputUnchecked: {color: Colors.textSecondary},
  categoryChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: Border.width,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  categoryChipActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  categoryChipText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  categoryChipTextActive: {color: Colors.textPrimary},
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.9)', // slightly transparent for blur effect
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  addBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.full,
    width: '100%',
    alignItems: 'center',
    ...Shadows.glow,
  },
  addBtnDisabled: {opacity: 0.4},
  addBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
});
