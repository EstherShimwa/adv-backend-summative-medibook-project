const { validateSlot } = require('../src/utils/slotRules');

// "Now" is fixed so the tests never depend on the real clock.
const NOW = new Date(2026, 11, 1, 12, 0, 0); // 1 Dec 2026, 12:00

describe('validateSlot (future, 09:00-17:00, 30-minute boundary)', () => {
  test('accepts the first slot of the day, 09:00', () => {
    const result = validateSlot('2026-12-02 09:00', NOW);
    expect(result.ok).toBe(true);
    expect(result.sqlDateTime).toBe('2026-12-02 09:00:00');
    expect(result.sqlDate).toBe('2026-12-02');
  });

  test('accepts the last slot of the day, 16:30, and the ISO "T" format', () => {
    expect(validateSlot('2026-12-02T16:30', NOW).ok).toBe(true);
  });

  test('rejects 17:00 exactly: that appointment would end at 17:30', () => {
    expect(validateSlot('2026-12-02 17:00', NOW)).toMatchObject({ ok: false, status: 422 });
  });

  test('rejects 08:30, before opening', () => {
    expect(validateSlot('2026-12-02 08:30', NOW)).toMatchObject({ ok: false, status: 422 });
  });

  test('rejects 09:15, which is not on a 30-minute boundary', () => {
    const result = validateSlot('2026-12-02 09:15', NOW);
    expect(result).toMatchObject({ ok: false, status: 422 });
    expect(result.message).toMatch(/30-minute/);
  });

  test('rejects a time with seconds that are not zero', () => {
    expect(validateSlot('2026-12-02 09:00:30', NOW)).toMatchObject({ ok: false, status: 422 });
  });

  test('rejects a slot in the past, and "now" itself', () => {
    expect(validateSlot('2026-11-30 10:00', NOW)).toMatchObject({ ok: false, status: 422 });
    expect(validateSlot('2026-12-01 12:00', NOW)).toMatchObject({ ok: false, status: 422 });
  });

  test.each([['not-a-date'], ['2026-02-30 10:00'], ['2026-12-02'], ['2026-12-02 25:00'], [12345]])(
    'rejects malformed input %p with 400',
    (input) => {
      expect(validateSlot(input, NOW)).toMatchObject({ ok: false, status: 400 });
    }
  );

  test('rejects a missing value with 400', () => {
    expect(validateSlot(undefined, NOW)).toMatchObject({ ok: false, status: 400 });
  });
});
