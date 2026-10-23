import { describe, expect, it } from 'vitest';
import { normalizeSnapshot } from './persistence';

describe('plan persistence normalization', () => {
  it('preserves course assignments and repairs the active plan id', () => {
    const snapshot = normalizeSnapshot({
      activePlanId: 'missing-plan',
      theme: 'light',
      plans: [{
        id: 'saved-plan',
        name: 'Next semester',
        courses: [{
          id: 'saved-course',
          code: 'BCSE204L',
          name: 'Algorithms',
          type: 'theory',
          credits: 3,
          faculty: '',
          availableTheorySlots: ['A2'],
          availableLabSlots: [],
          preferredSlots: ['A2'],
          mandatory: true,
          notes: '',
          theorySlot: 'A2',
        }],
        preferences: {},
        updatedAt: '2026-10-23T00:00:00.000Z',
      }],
    });
    expect(snapshot.activePlanId).toBe('saved-plan');
    expect(snapshot.theme).toBe('light');
    expect(snapshot.plans[0].courses[0].theorySlot).toBe('A2');
    expect(snapshot.plans[0].preferences.avoidEarly).toBe(true);
  });
});
