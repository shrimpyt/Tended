import {Item} from '../types/models';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export function fuzzyMatchInventory(receiptName: string, inventoryItems: Item[]): Item | null {
  const rn = normalize(receiptName);
  if (!rn) return null;

  // 1. Exact match
  const exact = inventoryItems.find(i => normalize(i.name) === rn);
  if (exact) return exact;

  // 2. Substring containment (receipt name contains inventory name or vice versa)
  const contains = inventoryItems.find(i => {
    const n = normalize(i.name);
    return rn.includes(n) || n.includes(rn);
  });
  if (contains) return contains;

  // 3. Shared significant word (3+ chars, not stopwords)
  const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'are', 'was', 'not']);
  const receiptWords = rn.split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w));

  const wordMatch = inventoryItems.find(i => {
    const itemWords = normalize(i.name).split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w));
    return receiptWords.some(rw => itemWords.includes(rw));
  });

  return wordMatch ?? null;
}
