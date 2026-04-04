import {computeDepletionResult} from '../../hooks/useDepletionRate';

// ── Types ──────────────────────────────────────────────────────────────────
interface StockEvent {
  old_quantity: number;
  new_quantity: number;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function makeEvent(
  old_quantity: number,
  new_quantity: number,
  daysAgo: number,
): StockEvent {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {old_quantity, new_quantity, updated_at: d.toISOString()};
}

describe('computeDepletionResult (useDepletionRate calculation logic)', () => {
  describe('insufficient data returns {available: false}', () => {
    it('returns unavailable when events is null', () => {
      expect(computeDepletionResult(null, 10)).toEqual({available: false});
    });

    it('returns unavailable when events is undefined', () => {
      expect(computeDepletionResult(undefined, 10)).toEqual({available: false});
    });

    it('returns unavailable when events array is empty', () => {
      expect(computeDepletionResult([], 10)).toEqual({available: false});
    });

    it('returns unavailable when there are fewer than 3 consumption events', () => {
      const events = [
        makeEvent(10, 8, 10), // consumed 2
        makeEvent(8, 5, 5),   // consumed 3
      ];
      expect(computeDepletionResult(events, 5)).toEqual({available: false});
    });

    it('returns unavailable when all events are restock events (quantity increased)', () => {
      const events = [
        makeEvent(2, 8, 10),
        makeEvent(3, 9, 7),
        makeEvent(1, 5, 3),
      ];
      expect(computeDepletionResult(events, 5)).toEqual({available: false});
    });

    it('returns unavailable when mixed events yield fewer than 3 consumption events', () => {
      const events = [
        makeEvent(10, 7, 15), // consumed
        makeEvent(7, 10, 12), // restock – ignored
        makeEvent(10, 9, 9),  // consumed
        makeEvent(9, 12, 5),  // restock – ignored
      ];
      expect(computeDepletionResult(events, 9)).toEqual({available: false});
    });
  });

  describe('daily rate calculation', () => {
    it('computes days remaining based on consumption rate over 3 events spanning 30 days', () => {
      // 3 consumption events: consumed 1 each, span = 30 days → dailyRate = 3/30 = 0.1/day
      // currentQuantity = 10 → daysRemaining = round(10 / 0.1) = 100
      const events = [
        makeEvent(5, 4, 30), // consumed 1, oldest
        makeEvent(4, 3, 15), // consumed 1, middle
        makeEvent(3, 2, 0),  // consumed 1, newest
      ];
      const result = computeDepletionResult(events, 10);
      expect(result).toEqual({available: true, daysRemaining: 100});
    });

    it('correctly sums total consumed across multiple events', () => {
      // Total consumed = 2 + 3 + 5 = 10 over 10 days → dailyRate = 1/day
      // currentQuantity = 5 → daysRemaining = 5
      const events = [
        makeEvent(10, 8, 10), // consumed 2
        makeEvent(8, 5, 5),   // consumed 3
        makeEvent(5, 0, 0),   // consumed 5
      ];
      const result = computeDepletionResult(events, 5);
      expect(result).toEqual({available: true, daysRemaining: 5});
    });

    it('ignores restock events when calculating total consumed', () => {
      // Mix of consumption and restock; only consumption should count
      // Consumption: 2 + 3 + 2 = 7 over 20 days → dailyRate = 7/20 = 0.35/day
      // currentQuantity = 7 → daysRemaining = round(7 / 0.35) = 20
      const events = [
        makeEvent(10, 8, 20), // consumed 2
        makeEvent(8, 12, 15), // restock (ignored)
        makeEvent(12, 9, 10), // consumed 3
        makeEvent(9, 14, 5),  // restock (ignored)
        makeEvent(14, 12, 0), // consumed 2
      ];
      const result = computeDepletionResult(events, 7);
      expect(result).toEqual({available: true, daysRemaining: 20});
    });

    it('uses Math.max(1, span) so a zero span still produces a result', () => {
      // All 3 events have the same timestamp → span = 0 → clamped to 1
      // totalConsumed = 3 over spanDays = 1 → dailyRate = 3
      // currentQuantity = 9 → daysRemaining = 3
      const now = new Date().toISOString();
      const events: StockEvent[] = [
        {old_quantity: 5, new_quantity: 4, updated_at: now},
        {old_quantity: 4, new_quantity: 3, updated_at: now},
        {old_quantity: 3, new_quantity: 2, updated_at: now},
      ];
      const result = computeDepletionResult(events, 9);
      expect(result).toEqual({available: true, daysRemaining: 3});
    });

    it('rounds daysRemaining to the nearest integer', () => {
      // totalConsumed = 1 + 1 + 1 = 3, span = 2 days → dailyRate = 1.5
      // currentQuantity = 2 → daysRemaining = round(2 / 1.5) = round(1.333) = 1
      const events = [
        makeEvent(5, 4, 2), // consumed 1
        makeEvent(4, 3, 1), // consumed 1
        makeEvent(3, 2, 0), // consumed 1
      ];
      const result = computeDepletionResult(events, 2);
      expect(result).toEqual({available: true, daysRemaining: 1});
    });

    it('returns daysRemaining = 0 when currentQuantity is 0', () => {
      const events = [
        makeEvent(5, 4, 10),
        makeEvent(4, 3, 5),
        makeEvent(3, 2, 0),
      ];
      const result = computeDepletionResult(events, 0);
      expect(result).toEqual({available: true, daysRemaining: 0});
    });
  });
});
