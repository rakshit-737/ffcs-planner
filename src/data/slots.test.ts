import { describe, expect, it } from 'vitest';
import { getSlot, LAB_SLOT_MAP, LAB_SESSION_STARTS, THEORY_SLOT_MAP } from './slots';

describe('reference slot chart', () => {
  it('keeps repeated theory meetings on their actual days', () => {
    expect(THEORY_SLOT_MAP.get('A1')?.meetings.map((meeting) => `${meeting.day}-${meeting.periodIndex}`)).toEqual(['MON-1', 'WED-2']);
  });

  it('maps L1 and L2 to one complete Monday lab session', () => {
    const first = LAB_SLOT_MAP.get('L1');
    const second = LAB_SLOT_MAP.get('L2');
    expect(first?.sessionId).toBe(second?.sessionId);
    expect(first?.occupiedPeriodIndices).toEqual([1, 2]);
    expect(second?.meetings[0]).toEqual(first?.meetings[0]);
  });

  it('does not create a cross-lunch or unobserved lab pair', () => {
    expect(LAB_SESSION_STARTS).not.toContain(6);
    expect(getSlot('lab', 'L61')).toBeUndefined();
  });

  it('keeps the distinct lab timing for the second period', () => {
    expect(getSlot('lab', 'L1')?.meetings[0]).toMatchObject({ start: '08:00', end: '09:40' });
    expect(getSlot('theory', 'A1')?.meetings[0]).toMatchObject({ start: '08:00', end: '08:50' });
  });
});
