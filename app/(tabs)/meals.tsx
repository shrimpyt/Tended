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
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../../constants/theme';
import {MEAL_DATABASE, MealData} from '../../constants/meals';

export type Meal = MealData;

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

function SavedMealRow({meal, onRemove}: {meal: Meal; onRemove: () => void}) {
  return (
    <View style={styles.savedRow}>
      <View style={styles.savedRowLeft}>
        <Text style={styles.savedMealName}>{meal.name}</Text>
        <View style={styles.savedMealMeta}>
          <Text style={styles.clockIcon}>&#9201;</Text>
          <Text style={styles.savedMealMetaText}>{meal.prepTime}m</Text>
          <Text style={styles.savedMealMetaDot}> · </Text>
          <Text style={styles.savedMealMetaText} numberOfLines={1}>
            {meal.ingredients.slice(0, 3).join(', ')}
            {meal.ingredients.length > 3 ? ' ...' : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.removeText}>&#10005;</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MealsScreen() {
  const [suggestions, setSuggestions] = React.useState<Meal[]>([]);
  const [savedMeals, setSavedMeals] = React.useState<Meal[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const insets = useSafeAreaInsets();

  const loadSuggestions = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setSuggestions(pickSuggestions(DEFAULT_PANTRY));
      setIsLoading(false);
    }, 400); // Simulate network latency
  }, []);

  const saveMeal = (meal: Meal) => {
    if (!savedMeals.find(m => m.id === meal.id)) {
      setSavedMeals(prev => [...prev, meal]);
    }
  };

  const removeSavedMeal = (id: string) => {
    setSavedMeals(prev => prev.filter(m => m.id !== id));
  };

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const savedIds = new Set(savedMeals.map(m => m.id));

  type ListItem =
    | {type: 'suggestionsHeader'}
    | {type: 'suggestionsRow'}
    | {type: 'savedHeader'}
    | {type: 'savedMeal'; data: Meal}
    | {type: 'savedEmpty'};

  const listData: ListItem[] = [
    {type: 'suggestionsHeader'},
    {type: 'suggestionsRow'},
    {type: 'savedHeader'},
    ...(savedMeals.length === 0
      ? [{type: 'savedEmpty'} as ListItem]
      : savedMeals.map(m => ({type: 'savedMeal', data: m} as ListItem))),
  ];

  const renderItem = ({item}: {item: ListItem}) => {
    if (item.type === 'suggestionsHeader') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Suggested for you</Text>
          <TouchableOpacity
            onPress={loadSuggestions}
            disabled={isLoading}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={[styles.refreshText, isLoading && styles.refreshTextDisabled]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (item.type === 'suggestionsRow') {
      if (isLoading) {
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
          {suggestions.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              saved={savedIds.has(meal.id)}
              onSave={() => saveMeal(meal)}
            />
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
            onRemove={() => removeSavedMeal(item.data.id)}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
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
});
