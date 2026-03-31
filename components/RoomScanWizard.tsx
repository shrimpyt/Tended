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
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {useCameraPermissions} from 'expo-image-picker';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAddInventoryItem} from '../hooks/queries';
import {NewItem} from '../types/models';
import {useAuthStore} from '../store/authStore';
import {supabase} from '../lib/supabase';

// We just type category as string here to keep it simple since we removed Category from models
type Category = string;

type Step = 'pickRoom' | 'photo' | 'analyzing' | 'review' | 'saving';

interface RoomDefinition {
  id: string;
  label: string;
  emoji: string;
  items: RoomItem[];
}

interface RoomItem {
  name: string;
  category: Category;
  unit: string | null;
}

const ROOMS: RoomDefinition[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🍳',
    items: [
      {name: 'Dish Soap', category: 'Cleaning', unit: 'bottles'},
      {name: 'Sponges', category: 'Cleaning', unit: 'pack'},
      {name: 'Trash Bags', category: 'Cleaning', unit: 'rolls'},
      {name: 'Paper Towels', category: 'Cleaning', unit: 'rolls'},
      {name: 'Cooking Oil', category: 'Pantry', unit: 'bottles'},
      {name: 'Salt', category: 'Pantry', unit: null},
      {name: 'Pepper', category: 'Pantry', unit: null},
      {name: 'Coffee', category: 'Pantry', unit: null},
      {name: 'Tea', category: 'Pantry', unit: null},
      {name: 'Sugar', category: 'Pantry', unit: null},
      {name: 'Flour', category: 'Pantry', unit: null},
      {name: 'Pasta', category: 'Pantry', unit: null},
      {name: 'Rice', category: 'Pantry', unit: null},
      {name: 'Butter', category: 'Kitchen', unit: null},
      {name: 'Canned Tomatoes', category: 'Pantry', unit: 'cans'},
    ],
  },
  {
    id: 'bathroom',
    label: 'Bathroom',
    emoji: '🚿',
    items: [
      {name: 'Toilet Paper', category: 'Bathroom', unit: 'rolls'},
      {name: 'Shampoo', category: 'Bathroom', unit: 'bottles'},
      {name: 'Conditioner', category: 'Bathroom', unit: 'bottles'},
      {name: 'Body Wash', category: 'Bathroom', unit: 'bottles'},
      {name: 'Toothpaste', category: 'Bathroom', unit: null},
      {name: 'Hand Soap', category: 'Bathroom', unit: 'bottles'},
      {name: 'Cotton Swabs', category: 'Bathroom', unit: 'pack'},
      {name: 'Razors', category: 'Bathroom', unit: 'pack'},
      {name: 'Deodorant', category: 'Bathroom', unit: null},
      {name: 'Moisturiser', category: 'Bathroom', unit: null},
    ],
  },
  {
    id: 'laundry',
    label: 'Laundry',
    emoji: '🧺',
    items: [
      {name: 'Laundry Detergent', category: 'Cleaning', unit: null},
      {name: 'Fabric Softener', category: 'Cleaning', unit: null},
      {name: 'Dryer Sheets', category: 'Cleaning', unit: 'pack'},
      {name: 'Stain Remover', category: 'Cleaning', unit: null},
      {name: 'Bleach', category: 'Cleaning', unit: null},
      {name: 'Ironing Spray', category: 'Cleaning', unit: null},
    ],
  },
  {
    id: 'pantry',
    label: 'Pantry',
    emoji: '🥫',
    items: [
      {name: 'Olive Oil', category: 'Pantry', unit: null},
      {name: 'Soy Sauce', category: 'Pantry', unit: null},
      {name: 'Honey', category: 'Pantry', unit: null},
      {name: 'Breadcrumbs', category: 'Pantry', unit: null},
      {name: 'Cereal', category: 'Pantry', unit: null},
      {name: 'Oats', category: 'Pantry', unit: null},
      {name: 'Mixed Nuts', category: 'Pantry', unit: null},
      {name: 'Crackers', category: 'Pantry', unit: null},
      {name: 'Canned Beans', category: 'Pantry', unit: 'cans'},
      {name: 'Vegetable Broth', category: 'Pantry', unit: null},
      {name: 'Vinegar', category: 'Pantry', unit: null},
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning Cupboard',
    emoji: '🧹',
    items: [
      {name: 'All-Purpose Cleaner', category: 'Cleaning', unit: null},
      {name: 'Glass Cleaner', category: 'Cleaning', unit: null},
      {name: 'Bathroom Cleaner', category: 'Cleaning', unit: null},
      {name: 'Toilet Cleaner', category: 'Cleaning', unit: null},
      {name: 'Mop Refills', category: 'Cleaning', unit: 'pack'},
      {name: 'Rubber Gloves', category: 'Cleaning', unit: 'pairs'},
      {name: 'Cleaning Wipes', category: 'Cleaning', unit: 'pack'},
      {name: 'Air Freshener', category: 'Cleaning', unit: null},
    ],
  },
  {
    id: 'office',
    label: 'Office',
    emoji: '🖥️',
    items: [
      {name: 'Printer Paper', category: 'Kitchen', unit: 'reams'},
      {name: 'Pens', category: 'Kitchen', unit: 'pack'},
      {name: 'Sticky Notes', category: 'Kitchen', unit: 'pack'},
      {name: 'Tape', category: 'Kitchen', unit: null},
      {name: 'Staples', category: 'Kitchen', unit: 'boxes'},
      {name: 'Batteries', category: 'Kitchen', unit: 'pack'},
      {name: 'Light Bulbs', category: 'Kitchen', unit: 'pack'},
    ],
  },
];

interface DraftItem {
  id: string;
  name: string;
  category: Category;
  stock_level: number;
  unit: string | null;
  selected: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RoomScanWizard({visible, onClose}: Props) {
  const {profile} = useAuthStore();
  const {mutateAsync: addItem} = useAddInventoryItem();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>('pickRoom');
  const [selectedRoom, setSelectedRoom] = useState<RoomDefinition | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [imageBase64s, setImageBase64s] = useState<string[]>([]);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const reset = () => {
    setStep('pickRoom');
    setSelectedRoom(null);
    setImageUris([]);
    setImageBase64s([]);
    setDraftItems([]);
    setSavedCount(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleRoomSelect = (room: RoomDefinition) => {
    setSelectedRoom(room);
    setStep('photo');
  };

  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64;
      setImageUris(prev => [...prev, uri]);
      setImageBase64s(prev => [...prev, base64 || '']);
    }
  };

  const handleChoosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64;
      setImageUris(prev => [...prev, uri]);
      setImageBase64s(prev => [...prev, base64 || '']);
    }
  };

  const handleDonePhotos = () => {
    setStep('analyzing');
    analyzeImages();
  };

  const analyzeImages = async () => {
    try {
      const allDrafts: DraftItem[] = [];
      for (const base64 of imageBase64s) {
        if (!base64) continue;
        const { data, error } = await supabase.functions.invoke('analyze-image', {
          body: { action: 'room', image: base64 }
        });
        if (error) {
           console.error("Supabase Edge Function Error:", error);
           continue;
        }
        if (data && data.items) {
          const drafts = data.items.map((item: any) => ({
            id: Math.random().toString(),
            name: item.name,
            category: selectedRoom?.items.find(i => i.name === item.name)?.category || 'Pantry',
            stock_level: item.stock_level || 50,
            selected: true
          }));
          allDrafts.push(...drafts);
        }
      }
      setDraftItems(allDrafts);
      setStep('review');
    } catch (err) {
      Alert.alert('Error', 'Failed to analyze images.');
      setStep('photo');
    }
  };

  const toggleItem = (index: number) => {
    setDraftItems(prev =>
      prev.map((item, i) => i === index ? {...item, selected: !item.selected} : item),
    );
  };

  const handleAddAll = async () => {
    if (!profile?.household_id || !profile?.id) return;
    setStep('saving');

    const toAdd = draftItems.filter(i => i.selected);
    let count = 0;

    for (const item of toAdd) {
      const newItem: NewItem = {
        name: item.name,
        category: item.category,
        stock_level: 100,
        threshold: 25,
        unit: item.unit,
      };
      try {
        await addItem({
          householdId: profile.household_id,
          userId: profile.id,
          item: newItem
        });
        count++;
      } catch (err) {
        console.error(err);
      }
    }

    setSavedCount(count);
    handleClose();
  };

  const selectedCount = draftItems.filter(i => i.selected).length;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* ── Step 1: Pick a room ── */}
        {step === 'pickRoom' && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Room Scan</Text>
              <View style={{width: 60}} />
            </View>
            <Text style={styles.subtitle}>Which room are you stocking up?</Text>
            <ScrollView contentContainerStyle={styles.roomGrid}>
              {ROOMS.map(room => (
                <TouchableOpacity
                  key={room.id}
                  style={styles.roomCard}
                  activeOpacity={0.7}
                  onPress={() => handleRoomSelect(room)}>
                  <Text style={styles.roomEmoji}>{room.emoji}</Text>
                  <Text style={styles.roomLabel}>{room.label}</Text>
                  <Text style={styles.roomCount}>{room.items.length} items</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Step 2: Photo ── */}
        {step === 'photo' && selectedRoom && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setStep('pickRoom')}>
                <Text style={styles.cancelText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{selectedRoom.emoji} {selectedRoom.label}</Text>
              <View style={{width: 60}} />
            </View>

            <View style={styles.photoStep}>
              <Text style={styles.photoTitle}>
                Take a photo to help identify what you have
              </Text>
              <Text style={styles.photoSubtitle}>
                Or skip straight to the suggested item list
              </Text>

              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnLabel}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handleChoosePhoto} activeOpacity={0.8}>
                  <Text style={styles.photoBtnIcon}>🖼️</Text>
                  <Text style={styles.photoBtnLabel}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('analyzing')}>
                <Text style={styles.skipText}>Skip — just show me the list</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 3: Analyzing ── */}
        {step === 'analyzing' && (
          <View style={styles.center}>
            {imageUris.length > 0 && (
              <Image source={{uri: imageUris[0]}} style={styles.photoPreview} resizeMode="cover" />
            )}
            <ActivityIndicator size="large" color={Colors.blue} style={{marginTop: Spacing.xl}} />
            <Text style={styles.analyzingTitle}>Suggesting items…</Text>
            <Text style={styles.analyzingSubtitle}>
              Building your {selectedRoom?.label.toLowerCase()} checklist
            </Text>
          </View>
        )}

        {/* ── Step 4: Review ── */}
        {step === 'review' && selectedRoom && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setStep('photo')}>
                <Text style={styles.cancelText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Select Items</Text>
              <View style={{width: 60}} />
            </View>

            <Text style={styles.reviewSubtitle}>
              Tap to deselect anything you don't need
            </Text>

            <ScrollView contentContainerStyle={styles.reviewList}>
              {draftItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.reviewRow, !item.selected && styles.reviewRowUnchecked]}
                  activeOpacity={0.7}
                  onPress={() => toggleItem(idx)}>
                  <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                    {item.selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.reviewItemInfo}>
                    <Text style={[styles.reviewItemName, !item.selected && styles.reviewItemNameUnchecked]}>
                      {item.name}
                    </Text>
                    <Text style={styles.reviewItemMeta}>
                      {item.category}{item.unit ? ` · ${item.unit}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.reviewFooter}>
              <Text style={styles.reviewFooterCount}>
                {selectedCount} of {draftItems.length} selected
              </Text>
              <TouchableOpacity
                style={[styles.addAllBtn, selectedCount === 0 && styles.addAllBtnDisabled]}
                onPress={handleAddAll}
                disabled={selectedCount === 0}
                activeOpacity={0.8}>
                <Text style={styles.addAllBtnText}>
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
            <Text style={styles.analyzingTitle}>Adding items…</Text>
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
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  // Room grid
  roomGrid: {
    padding: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  roomCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'flex-start',
    gap: 4,
  },
  roomEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  roomLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  roomCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  // Photo step
  photoStep: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photoTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  photoSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  photoBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  photoBtnIcon: {fontSize: 32},
  photoBtnLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  skipBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  skipText: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  // Analyzing
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: Radius.md,
    opacity: 0.6,
  },
  analyzingTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  analyzingSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
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
    paddingBottom: 120,
    gap: Spacing.xs,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  reviewRowUnchecked: {
    opacity: 0.45,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  checkboxChecked: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: Typography.weights.medium,
  },
  reviewItemInfo: {flex: 1, gap: 2},
  reviewItemName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  reviewItemNameUnchecked: {
    color: Colors.textSecondary,
  },
  reviewItemMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  // Footer
  reviewFooter: {
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
    gap: Spacing.sm,
    alignItems: 'center',
  },
  reviewFooterCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  addAllBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    width: '100%',
    alignItems: 'center',
  },
  addAllBtnDisabled: {
    opacity: 0.4,
  },
  addAllBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
