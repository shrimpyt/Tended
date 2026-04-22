import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {Colors, Typography, Spacing, Radius, Border} from '../../constants/theme';
import {useAuthStore} from '../../store/authStore';
import {useInventory, useSavedMeals, useSaveRecipe, useRemoveSavedMeal} from '../../hooks/queries';
import {useRecipes, fetchRecipeDetails} from '../../hooks/useRecipes';
import {Modal} from 'react-native';

export interface Recipe {
  id: number;
  title: string;
  image: string;
  instructions?: string;
  readyInMinutes?: number;
  servings?: number;
  ingredients?: any[];
}

function pickSuggestions(pantryItems: string[]): Meal[] {
  const lower = pantryItems.map(p => p.toLowerCase());

  const scored = MEAL_DATABASE.map((meal) => {
    const matchCount = meal.ingredients.filter(ing =>
      lower.some(p => p.includes(ing.toLowerCase()) || ing.toLowerCase().includes(p)),
    ).length;
    return {meal, matchCount};
  });

  scored.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.meal.prepTime - b.meal.prepTime;
  });

  return scored.slice(0, 6).map(s => s.meal);
}

// Default pantry staples used when generating initial suggestions
const DEFAULT_PANTRY = [
  'eggs', 'bread', 'garlic', 'olive oil', 'pasta', 'rice', 'onion',
  'tomatoes', 'butter', 'cheese', 'soy sauce',
];

// Tag colour mapping — keep within Colors palette
const TAG_COLORS: Record<string, string> = {
  quick: Colors.blue,
  vegetarian: Colors.green,
  budget: Colors.amber,
  protein: Colors.red,
  healthy: Colors.green,
  breakfast: Colors.amber,
  comfort: Colors.blue,
  sweet: Colors.amber,
  'no-cook': Colors.green,
};

function TagPill({tag}: {tag: string}) {
  const color = TAG_COLORS[tag] ?? Colors.textSecondary;
  return (
    <View style={[styles.tagPill, {borderColor: color}]}>
      <Text style={[styles.tagText, {color}]}>{tag}</Text>
    </View>
  );
}

function MealCard({meal, onSave, saved}: {meal: Meal; onSave: () => void; saved: boolean}) {
  const shortIngredients = meal.ingredients.slice(0, 4);
  const remaining = meal.ingredients.length - shortIngredients.length;

  return (
    <View style={styles.mealCard}>
      {/* Name + prep time */}
      <View style={styles.mealCardHeader}>
        <Text style={styles.mealName} numberOfLines={2}>{meal.name}</Text>
        <View style={styles.prepTimeRow}>
          <Text style={styles.clockIcon}>&#9201;</Text>
          <Text style={styles.prepTimeText}>{meal.prepTime}m</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.mealDescription} numberOfLines={2}>
        {meal.description}
      </Text>

      {/* Ingredients */}
      <Text style={styles.ingredientsText} numberOfLines={1}>
        {shortIngredients.join(', ')}{remaining > 0 ? ` +${remaining} more` : ''}
      </Text>

      {/* Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsScroll}
        contentContainerStyle={styles.tagsScrollContent}>
        {meal.tags.map(tag => (
          <TagPill key={tag} tag={tag} />
        ))}
      </ScrollView>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnSaved]}
        onPress={onSave}
        disabled={saved}
        activeOpacity={0.8}>
        <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
          {saved ? 'Saved' : 'Save'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SavedMealRow({meal, onRemove, onPress}: {meal: any; onRemove: () => void; onPress: () => void}) {
  const recipe = meal.recipe;
  return (
    <TouchableOpacity style={styles.savedRow} onPress={onPress}>
      <View style={styles.savedRowLeft}>
        <Text style={styles.savedMealName}>{recipe.title}</Text>
        <View style={styles.savedMealMeta}>
          {recipe.ready_in_minutes && (
            <>
              <Text style={styles.clockIcon}>&#9201;</Text>
              <Text style={styles.savedMealMetaText}>{recipe.ready_in_minutes}m</Text>
              <Text style={styles.savedMealMetaDot}> · </Text>
            </>
          )}
          <Text style={styles.savedMealMetaText} numberOfLines={1}>
            {recipe.ingredients?.slice(0, 3).map((i: any) => i.name || i.original).join(', ')}
            {recipe.ingredients?.length > 3 ? ' ...' : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.removeText}>&#10005;</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function RecipeDetailModal({
  recipe,
  visible,
  onClose,
  onSave,
  isSaved,
}: {
  recipe: any;
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (!recipe) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={2}>{recipe.title || recipe.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll}>
          {recipe.image && (
            <View style={styles.modalImagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>[Recipe Image: {recipe.title}]</Text>
            </View>
          )}

          <View style={styles.modalMetaRow}>
            {recipe.ready_in_minutes && (
              <View style={styles.modalMetaItem}>
                <Text style={styles.modalMetaLabel}>Ready in</Text>
                <Text style={styles.modalMetaValue}>{recipe.ready_in_minutes}m</Text>
              </View>
            )}
            {recipe.servings && (
              <View style={styles.modalMetaItem}>
                <Text style={styles.modalMetaLabel}>Servings</Text>
                <Text style={styles.modalMetaValue}>{recipe.servings}</Text>
              </View>
            )}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Ingredients</Text>
            {(recipe.ingredients || recipe.extendedIngredients || []).map((ing: any, idx: number) => (
              <Text key={idx} style={styles.modalIngredientItem}>
                • {ing.original || ing.name}
              </Text>
            ))}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Instructions</Text>
            <Text style={styles.modalInstructionsText}>
              {recipe.instructions?.replace(/<[^>]*>?/gm, '') || 'No instructions available.'}
            </Text>
          </View>
        </ScrollView>

        {onSave && !isSaved && (
          <View style={[styles.modalFooter, {paddingBottom: Math.max(insets.bottom, Spacing.md)}]}>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={onSave}>
              <Text style={styles.modalSaveBtnText}>Save to My Library</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const householdId = profile?.household_id || '';

  // 1. Fetch Real Inventory
  const { data: inventory = [] } = useInventory(householdId);
  const ingredientNames = inventory.map(item => item.name);

  // 2. Fetch Discovery Recipes (Spoonacular)
  const { 
    data: discoveryRecipes = [], 
    isLoading: isLoadingDiscovery, 
    refetch: refetchDiscovery 
  } = useRecipes(ingredientNames);

  // 3. Fetch Saved Meals (Supabase)
  const { data: savedMeals = [] } = useSavedMeals(householdId);
  const savedSpoonacularIds = new Set(savedMeals.map(m => m.recipe.spoonacular_id));

  // 4. Persistence Mutations
  const saveRecipeMutation = useSaveRecipe();
  const removeSavedMealMutation = useRemoveSavedMeal();

  // 5. UI State
  const [selectedRecipe, setSelectedRecipe] = React.useState<any>(null);
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  const handleSave = async (recipe: any) => {
    try {
      await saveRecipeMutation.mutateAsync({
        householdId,
        recipe,
        fetchDetails: fetchRecipeDetails
      });
      setIsModalVisible(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleRemove = (recipeId: string) => {
    removeSavedMealMutation.mutate({ householdId, recipeId });
  };

  const openRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
    setIsModalVisible(true);
  };

  const listData: any[] = [
    {type: 'suggestionsHeader'},
    {type: 'suggestionsRow'},
    {type: 'savedHeader'},
    ...(savedMeals.length === 0
      ? [{type: 'savedEmpty'}]
      : savedMeals.map(m => ({type: 'savedMeal', data: m}))),
  ];

  const renderItem = ({item}: {item: any}) => {
    if (item.type === 'suggestionsHeader') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Suggested for you</Text>
          <TouchableOpacity
            onPress={() => refetchDiscovery()}
            disabled={isLoadingDiscovery}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={[styles.refreshText, isLoadingDiscovery && styles.refreshTextDisabled]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (item.type === 'suggestionsRow') {
      if (isLoadingDiscovery) {
        return (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.blue} />
          </View>
        );
      }
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScrollContent}>
          {discoveryRecipes.map(recipe => (
            <TouchableOpacity key={recipe.id} onPress={() => openRecipe(recipe)}>
              <View style={styles.mealCard}>
                <Text style={styles.mealName} numberOfLines={2}>{recipe.title}</Text>
                <Text style={styles.ingredientsText} numberOfLines={1}>
                  Matches: {recipe.usedIngredientCount} items
                </Text>
                <TouchableOpacity
                  style={[styles.saveBtn, savedSpoonacularIds.has(recipe.id) && styles.saveBtnSaved]}
                  onPress={() => handleSave(recipe)}
                  disabled={savedSpoonacularIds.has(recipe.id) || saveRecipeMutation.isPending}>
                  <Text style={[styles.saveBtnText, savedSpoonacularIds.has(recipe.id) && styles.saveBtnTextSaved]}>
                    {savedSpoonacularIds.has(recipe.id) ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (item.type === 'savedHeader') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Saved meals</Text>
          <Text style={styles.sectionCount}>
            {savedMeals.length} {savedMeals.length === 1 ? 'meal' : 'meals'}
          </Text>
        </View>
      );
    }

    if (item.type === 'savedEmpty') {
      return (
        <Text style={styles.emptyText}>
          No saved meals yet. Tap Save on a suggestion to keep it.
        </Text>
      );
    }

    if (item.type === 'savedMeal') {
      return (
        <View style={styles.savedCard}>
          <SavedMealRow
            meal={item.data}
            onRemove={() => handleRemove(item.data.recipe.id)}
            onPress={() => openRecipe(item.data.recipe)}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meals</Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === 'savedMeal') return item.data.id;
          return `${item.type}-${index}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, {paddingBottom: insets.bottom + 90}]}
      />

      <RecipeDetailModal
        visible={isModalVisible}
        recipe={selectedRecipe}
        onClose={() => setIsModalVisible(false)}
        onSave={() => handleSave(selectedRecipe)}
        isSaved={selectedRecipe && (savedSpoonacularIds.has(selectedRecipe.id) || savedSpoonacularIds.has(selectedRecipe.spoonacular_id))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.medium,
  },

  // List
  listContent: {
    paddingBottom: 40,
    gap: Spacing.md,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  sectionCount: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  refreshText: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  refreshTextDisabled: {
    color: Colors.textSecondary,
  },

  // Suggestions horizontal scroll
  suggestionsScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  loadingRow: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Meal card
  mealCard: {
    width: 220,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  mealName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    lineHeight: 20,
  },
  prepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  clockIcon: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  prepTimeText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  mealDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    lineHeight: 16,
  },
  ingredientsText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  tagsScroll: {
    flexGrow: 0,
  },
  tagsScrollContent: {
    gap: Spacing.xs,
  },
  tagPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: Border.width,
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  saveBtn: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.blue,
    marginTop: Spacing.xs,
  },
  saveBtnSaved: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
  },
  saveBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  saveBtnTextSaved: {
    color: Colors.textSecondary,
  },

  // Saved meals
  savedCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  savedRowLeft: {
    flex: 1,
    gap: 2,
  },
  savedMealName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  savedMealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedMealMetaText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    flexShrink: 1,
  },
  savedMealMetaDot: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
  },
  removeText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },

  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    lineHeight: 18,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginRight: Spacing.md,
  },
  modalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
  },
  modalCloseText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  modalScroll: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  modalImagePlaceholder: {
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontStyle: 'italic',
  },
  modalMetaRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  modalMetaItem: {
    gap: 4,
  },
  modalMetaLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalMetaValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  modalSection: {
    gap: Spacing.md,
  },
  modalSectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  modalIngredientItem: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
  },
  modalInstructionsText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 24,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  modalSaveBtn: {
    backgroundColor: Colors.blue,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
