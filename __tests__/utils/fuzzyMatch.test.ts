import {fuzzyMatchInventory} from '../../utils/fuzzyMatch';
import {Item} from '../../types/models';

const makeItem = (name: string, id = name): Item => ({
  id,
  household_id: 'hh1',
  name,
  category: null,
  quantity: 5,
  max_quantity: 10,
  threshold: 2,
  unit: null,
  barcode: null,
  photo_url: null,
  created_by: null,
  updated_at: new Date().toISOString(),
});

describe('fuzzyMatchInventory', () => {
  describe('returns null for empty/invalid input', () => {
    it('returns null when receiptName is empty string', () => {
      expect(fuzzyMatchInventory('', [makeItem('Milk')])).toBeNull();
    });

    it('returns null when receiptName is only punctuation (normalizes to empty)', () => {
      expect(fuzzyMatchInventory('!!!---???', [makeItem('Milk')])).toBeNull();
    });

    it('returns null when inventoryItems is empty', () => {
      expect(fuzzyMatchInventory('Milk', [])).toBeNull();
    });

    it('returns null when no match is found', () => {
      const items = [makeItem('Bread'), makeItem('Eggs')];
      expect(fuzzyMatchInventory('Milk', items)).toBeNull();
    });
  });

  describe('exact match (case-insensitive)', () => {
    it('matches exact same name', () => {
      const items = [makeItem('Milk')];
      expect(fuzzyMatchInventory('Milk', items)).toBe(items[0]);
    });

    it('matches case-insensitively', () => {
      const items = [makeItem('Whole Milk')];
      expect(fuzzyMatchInventory('whole milk', items)).toBe(items[0]);
    });

    it('matches ignoring leading/trailing whitespace', () => {
      const items = [makeItem('Butter')];
      expect(fuzzyMatchInventory('  Butter  ', items)).toBe(items[0]);
    });

    it('strips punctuation from receipt name (hyphen removed, not replaced with space)', () => {
      // 'Orange-Juice' normalizes to 'orangejuice' (no space), which won't exact-match 'orange juice'
      // but 'orangejuice'.includes('orange') == false and 'orange juice'.includes('orangejuice') == false
      // word match: receipt words = ['orangejuice'], item words = ['orange','juice'] — no overlap
      const items = [makeItem('Orange Juice')];
      expect(fuzzyMatchInventory('Orange-Juice', items)).toBeNull();
    });

    it('matches ignoring punctuation in inventory name', () => {
      const items = [makeItem("Ben's Bread")];
      expect(fuzzyMatchInventory('bens bread', items)).toBe(items[0]);
    });

    it('prefers exact match over substring match', () => {
      const itemMilk = makeItem('Milk', 'exact-id');
      const itemWholeMilk = makeItem('Whole Milk', 'substring-id');
      const items = [itemWholeMilk, itemMilk];
      expect(fuzzyMatchInventory('Milk', items)).toBe(itemMilk);
    });
  });

  describe('substring containment match', () => {
    it('matches when receipt name contains inventory name', () => {
      const items = [makeItem('Milk')];
      expect(fuzzyMatchInventory('Organic Whole Milk 1L', items)).toBe(items[0]);
    });

    it('matches when inventory name contains receipt name', () => {
      const items = [makeItem('Organic Whole Milk')];
      expect(fuzzyMatchInventory('Milk', items)).toBe(items[0]);
    });

    it('returns first substring match when multiple exist', () => {
      const item1 = makeItem('Cream', 'id1');
      const item2 = makeItem('Sour Cream Cheese', 'id2');
      const items = [item1, item2];
      expect(fuzzyMatchInventory('Cream', items)).toBe(item1);
    });
  });

  describe('shared significant word match', () => {
    it('matches items sharing a significant word (3+ chars, not stopword)', () => {
      const items = [makeItem('Chicken Breast')];
      expect(fuzzyMatchInventory('Rotisserie Chicken', items)).toBe(items[0]);
    });

    it('short receipt words still match via substring when inventory name contains them', () => {
      // "Up" (length 2) is below the word-match threshold, but substring rule fires first
      const items = [makeItem('Up Brand')];
      // "up" is contained in "up brand", so substring match applies
      expect(fuzzyMatchInventory('Up', items)).toBe(items[0]);
    });

    it('stopwords are excluded from word-match but can still match via substring', () => {
      // "the" is a stopword so it won't be used in word matching,
      // but "the brand" still contains "the" as a substring, so substring match fires
      const items = [makeItem('The Brand')];
      expect(fuzzyMatchInventory('the', items)).toBe(items[0]);
    });

    it('a standalone stopword does not produce a word match when substring also fails', () => {
      // "and" (stopword) won't match "Bread Loaf" via substring or word
      const items = [makeItem('Bread Loaf')];
      expect(fuzzyMatchInventory('and', items)).toBeNull();
    });

    it('matches shared word ignoring case', () => {
      const items = [makeItem('Greek Yogurt')];
      expect(fuzzyMatchInventory('YOGURT VANILLA', items)).toBe(items[0]);
    });

    it('returns first word match in list order', () => {
      const item1 = makeItem('Apple Juice', 'id1');
      const item2 = makeItem('Apple Cider', 'id2');
      const items = [item1, item2];
      expect(fuzzyMatchInventory('Apple', items)).toBe(item1);
    });
  });

  describe('match priority: exact > substring > word', () => {
    it('returns exact match when substring and word matches also exist', () => {
      const exactItem = makeItem('Cheese', 'exact');
      const substringItem = makeItem('Cheddar Cheese Block', 'substring');
      const items = [substringItem, exactItem];
      expect(fuzzyMatchInventory('Cheese', items)).toBe(exactItem);
    });

    it('returns substring match over word match when no exact match', () => {
      // "Organic Butter" contains "Butter", but we also have "Butter Chicken"
      // which shares "butter". Substring should win since "Butter" is contained in "Organic Butter"
      const substringItem = makeItem('Organic Butter', 'sub');
      const wordItem = makeItem('Peanut Butter Jar', 'word');
      const items = [substringItem, wordItem];
      expect(fuzzyMatchInventory('Butter', items)).toBe(substringItem);
    });
  });
});
