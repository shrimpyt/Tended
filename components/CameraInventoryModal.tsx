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
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {useCameraPermissions} from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useInventoryStore, NewItem, getUniqueCategories} from '../store/inventoryStore';
import {useAuthStore} from '../store/authStore';

type Step = 'pick' | 'analyzing' | 'review' | 'saving';

interface IdentifiedItem {
  name: string;
  category: string;
  checked: boolean;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

async function identifyItemsInPhoto(base64: string): Promise<IdentifiedItem[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'You are a home inventory assistant. Look at this image and identify every distinct household product or item you can see — include food, cleaning products, toiletries, pantry items, bottles, containers, boxes, etc.\n\n' +
                'For each item return:\n' +
                '- name: short specific product name (e.g. "Dish Soap", "Olive Oil", "Shampoo")\n' +
                '- category: a short category label (e.g. "Cleaning", "Pantry", "Bathroom", "Kitchen")\n\n' +
                'Return ONLY valid JSON — an array of objects like:\n' +
                '[{"name":"Dish Soap","category":"Cleaning"},{"name":"Sponges","category":"Cleaning"}]\n\n' +
                'If you cannot clearly identify any items, return an empty array: []',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const content: string = json.choices?.[0]?.message?.content ?? '[]';

  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((i: unknown) => typeof i === 'object' && i !== null)
    .map((i: {name?: unknown; category?: unknown}) => ({
      name: String(i.name ?? '').trim(),
      category: String(i.category ?? '').trim(),
      checked: true,
    }))
    .filter(i => i.name.length > 0);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function CameraInventoryModal({visible, onClose, onAdded}: Props) {
  const {profile} = useAuthStore();
  const {addItem, items} = useInventoryStore();
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

  const processPhoto = async (uri: string) => {
    setPhotoUri(uri);
    setStep('analyzing');
    setError(null);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const results = await identifyItemsInPhoto(base64);

      if (results.length === 0) {
        setError("Couldn't identify any items. Try a clearer photo with better lighting.");
        setStep('pick');
        return;
      }

      setIdentified(results);
      setStep('review');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Analysis failed: ${msg}`);
      setStep('pick');
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await processPhoto(result.assets[0].uri);
    }
  };

  const handleChoosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await processPhoto(result.assets[0].uri);
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
        stock_level: 100,
        threshold: 25,
        unit: null,
      };
      await addItem(profile.household_id, profile.id, newItem);
    }

    onAdded();
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
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
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
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  reviewRowUnchecked: {opacity: 0.4},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {backgroundColor: Colors.blue, borderColor: Colors.blue},
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: Typography.weights.medium,
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
    backgroundColor: Colors.surface,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
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
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    width: '100%',
    alignItems: 'center',
  },
  addBtnDisabled: {opacity: 0.4},
  addBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
