export interface MealData {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  tags: string[];
  prepTime: number;
}

export const MEAL_DATABASE: MealData[] = [
  {
    id: '1',
    name: 'Pasta Aglio e Olio',
    description: 'Simple garlic and olive oil pasta',
    ingredients: ['pasta', 'garlic', 'olive oil', 'parmesan', 'parsley'],
    tags: ['quick', 'vegetarian', 'budget'],
    prepTime: 20,
  },
  {
    id: '2',
    name: 'Chicken Stir Fry',
    description: 'Quick veggie stir fry with rice',
    ingredients: ['chicken', 'rice', 'soy sauce', 'garlic', 'mixed vegetables'],
    tags: ['quick', 'protein'],
    prepTime: 25,
  },
  {
    id: '3',
    name: 'Tomato Soup',
    description: 'Creamy homemade tomato soup',
    ingredients: ['canned tomatoes', 'onion', 'garlic', 'cream', 'basil'],
    tags: ['vegetarian', 'comfort'],
    prepTime: 30,
  },
  {
    id: '4',
    name: 'Avocado Toast',
    description: 'Classic avocado toast with toppings',
    ingredients: ['bread', 'avocado', 'lemon', 'salt', 'red pepper flakes'],
    tags: ['quick', 'vegetarian', 'breakfast'],
    prepTime: 10,
  },
  {
    id: '5',
    name: 'Omelette',
    description: 'Fluffy egg omelette with fillings',
    ingredients: ['eggs', 'butter', 'cheese', 'herbs'],
    tags: ['quick', 'protein', 'breakfast'],
    prepTime: 10,
  },
  {
    id: '6',
    name: 'Greek Salad',
    description: 'Fresh Mediterranean salad',
    ingredients: ['cucumber', 'tomatoes', 'feta', 'olives', 'red onion', 'olive oil'],
    tags: ['vegetarian', 'healthy', 'no-cook'],
    prepTime: 10,
  },
  {
    id: '7',
    name: 'Beef Tacos',
    description: 'Seasoned ground beef tacos',
    ingredients: ['ground beef', 'taco shells', 'cheddar', 'lettuce', 'tomatoes', 'sour cream'],
    tags: ['quick', 'protein'],
    prepTime: 20,
  },
  {
    id: '8',
    name: 'Banana Pancakes',
    description: 'Fluffy banana pancakes',
    ingredients: ['bananas', 'eggs', 'flour', 'milk', 'butter', 'maple syrup'],
    tags: ['vegetarian', 'breakfast', 'sweet'],
    prepTime: 20,
  },
  {
    id: '9',
    name: 'Lentil Soup',
    description: 'Hearty and warming lentil soup',
    ingredients: ['lentils', 'onion', 'carrots', 'cumin', 'canned tomatoes', 'garlic'],
    tags: ['vegetarian', 'budget', 'healthy'],
    prepTime: 40,
  },
  {
    id: '10',
    name: 'Caesar Salad',
    description: 'Classic Caesar with homemade dressing',
    ingredients: ['romaine lettuce', 'parmesan', 'croutons', 'caesar dressing', 'lemon'],
    tags: ['vegetarian', 'quick'],
    prepTime: 15,
  },
  {
    id: '11',
    name: 'Fried Rice',
    description: 'Easy weeknight fried rice',
    ingredients: ['rice', 'eggs', 'soy sauce', 'peas', 'carrots', 'sesame oil', 'garlic'],
    tags: ['budget', 'quick', 'vegetarian'],
    prepTime: 20,
  },
  {
    id: '12',
    name: 'Caprese Toast',
    description: 'Tomato, mozzarella and basil on toast',
    ingredients: ['bread', 'fresh mozzarella', 'tomatoes', 'basil', 'olive oil', 'balsamic'],
    tags: ['vegetarian', 'quick', 'no-cook'],
    prepTime: 5,
  },
];
