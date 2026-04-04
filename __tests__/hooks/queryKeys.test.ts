import {queryKeys} from '../../hooks/queries';

describe('queryKeys', () => {
  describe('inventory', () => {
    it('returns a tuple with "inventory" and the householdId', () => {
      expect(queryKeys.inventory('hh-001')).toEqual(['inventory', 'hh-001']);
    });

    it('produces different keys for different household IDs', () => {
      const key1 = queryKeys.inventory('hh-001');
      const key2 = queryKeys.inventory('hh-002');
      expect(key1).not.toEqual(key2);
    });
  });

  describe('spending', () => {
    it('returns a tuple with "spending", householdId, year, and month', () => {
      expect(queryKeys.spending('hh-001', 2024, 3)).toEqual(['spending', 'hh-001', 2024, 3]);
    });

    it('produces different keys for different months', () => {
      expect(queryKeys.spending('hh-001', 2024, 1)).not.toEqual(queryKeys.spending('hh-001', 2024, 2));
    });

    it('produces different keys for different years', () => {
      expect(queryKeys.spending('hh-001', 2023, 6)).not.toEqual(queryKeys.spending('hh-001', 2024, 6));
    });

    it('produces different keys for different households', () => {
      expect(queryKeys.spending('hh-001', 2024, 6)).not.toEqual(queryKeys.spending('hh-002', 2024, 6));
    });
  });

  describe('shopping', () => {
    it('returns a tuple with "shopping" and the householdId', () => {
      expect(queryKeys.shopping('hh-001')).toEqual(['shopping', 'hh-001']);
    });

    it('produces different keys for different households', () => {
      expect(queryKeys.shopping('hh-001')).not.toEqual(queryKeys.shopping('hh-002'));
    });
  });

  describe('stockEvents', () => {
    it('returns a tuple with "stockEvents" and the itemId', () => {
      expect(queryKeys.stockEvents('item-001')).toEqual(['stockEvents', 'item-001']);
    });

    it('produces different keys for different item IDs', () => {
      expect(queryKeys.stockEvents('item-001')).not.toEqual(queryKeys.stockEvents('item-002'));
    });
  });

  describe('key namespacing', () => {
    it('inventory and shopping keys are distinct even for the same householdId', () => {
      expect(queryKeys.inventory('hh-001')).not.toEqual(queryKeys.shopping('hh-001'));
    });

    it('inventory and stockEvents keys are distinct', () => {
      expect(queryKeys.inventory('same-id')).not.toEqual(queryKeys.stockEvents('same-id'));
    });
  });
});
