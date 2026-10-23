import { describe, expect, it } from 'vitest';
import { detectConflicts, generateSchedules, blocksForCourse } from './scheduling';
import type { Course } from '../types';

const course = (overrides: Partial<Course>): Course => ({
  id: overrides.id ?? Math.random().toString(36),
  code: overrides.code ?? 'TEST101',
  name: overrides.name ?? 'Test course',
  type: overrides.type ?? 'theory',
  credits: 3,
  faculty: '',
  availableTheorySlots: overrides.availableTheorySlots ?? [],
  availableLabSlots: overrides.availableLabSlots ?? [],
  preferredSlots: [],
  mandatory: true,
  notes: '',
  ...overrides,
});

describe('FFCS scheduling engine', () => {
  it('detects overlapping theory classes on different courses', () => {
    const first = course({ id: 'one', code: 'ONE', theorySlot: 'S3' });
    const second = course({ id: 'two', code: 'TWO', theorySlot: 'S3' });
    expect(detectConflicts([first, second])).toHaveLength(1);
  });

  it('detects the official A1/L1 positional clash', () => {
    expect(detectConflicts([
      course({ id: 'theory-a1', code: 'A1COURSE', theorySlot: 'A1' }),
      course({ id: 'lab-l1', code: 'L1COURSE', type: 'lab', labSlot: 'L1' }),
    ])).toHaveLength(1);
  });

  it('detects the official F1/L2 positional clash through the paired lab session', () => {
    expect(detectConflicts([
      course({ id: 'theory-f1', code: 'F1COURSE', theorySlot: 'F1' }),
      course({ id: 'lab-l2', code: 'L2COURSE', type: 'lab', labSlot: 'L2' }),
    ])).toHaveLength(1);
  });

  it('keeps a non-overlapping theory slot valid against the selected lab session', () => {
    expect(detectConflicts([
      course({ id: 'theory-s11', code: 'S11COURSE', theorySlot: 'S11' }),
      course({ id: 'lab-l1', code: 'L1COURSE', type: 'lab', labSlot: 'L1' }),
    ])).toHaveLength(0);
  });

  it('keeps a lab as a two-period block', () => {
    const blocks = blocksForCourse(course({ type: 'lab', labSlot: 'L7' }));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].durationPeriods).toBe(2);
    expect(blocks[0].meeting.start).toBe('08:00');
    expect(blocks[0].meeting.end).toBe('09:40');
  });

  it('detects a theory class overlapping either half of a lab', () => {
    const lab = course({ id: 'lab', code: 'LAB', type: 'lab', labSlot: 'L7' });
    const theory = course({ id: 'theory', code: 'THEORY', theorySlot: 'B1' });
    expect(detectConflicts([lab, theory])).toHaveLength(1);
  });

  it('detects overlapping lab sessions', () => {
    const first = course({ id: 'lab-a', code: 'LABA', type: 'lab', labSlot: 'L7' });
    const second = course({ id: 'lab-b', code: 'LABB', type: 'lab', labSlot: 'L8' });
    expect(detectConflicts([first, second])).toHaveLength(1);
  });

  it('does not treat lunch as a schedulable period', () => {
    const first = course({ id: 'first', code: 'FIRST', theorySlot: 'S11' });
    const second = course({ id: 'second', code: 'SECOND', theorySlot: 'A2' });
    expect(detectConflicts([first, second])).toHaveLength(0);
  });

  it('respects the theory/lab timing difference around the morning boundary', () => {
    const lab = course({ id: 'lab', code: 'LAB', type: 'lab', labSlot: 'L2' });
    const theory = course({ id: 'theory', code: 'THEORY', theorySlot: 'D1' });
    expect(detectConflicts([lab, theory])).toHaveLength(0);
  });

  it('schedules theory and lab components independently for one course', () => {
    const linked = course({ id: 'linked', type: 'both', theorySlot: 'A2', labSlot: 'L7' });
    const blocks = blocksForCourse(linked);
    expect(blocks.filter((block) => block.component === 'lab')).toHaveLength(1);
    expect(blocks.filter((block) => block.component === 'theory')).toHaveLength(2);
  });

  it('rejects unknown lab mappings instead of guessing', () => {
    const result = generateSchedules([course({ type: 'lab', labSlot: 'L61', availableLabSlots: ['L61'] })]);
    expect(result.schedules).toHaveLength(0);
    expect(result.errors.join(' ')).toMatch(/no verified/i);
  });

  it('returns only clash-free schedules', () => {
    const result = generateSchedules([
      course({ id: 'one', code: 'ONE', availableTheorySlots: ['A1', 'A2'] }),
      course({ id: 'two', code: 'TWO', availableTheorySlots: ['A1', 'B1'] }),
    ], undefined, { maxSchedules: 20 });
    expect(result.schedules.length).toBeGreaterThan(0);
    result.schedules.forEach((schedule) => expect(schedule.conflicts).toHaveLength(0));
  });

  it('explains when no feasible combination exists', () => {
    const result = generateSchedules([
      course({ id: 'one', code: 'ONE', availableTheorySlots: ['A1'] }),
      course({ id: 'two', code: 'TWO', availableTheorySlots: ['A1'] }),
    ]);
    expect(result.schedules).toHaveLength(0);
    expect(result.nodesVisited).toBeGreaterThan(0);
  });
});
