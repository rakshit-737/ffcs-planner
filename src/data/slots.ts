import type { ComponentType, Day, Meeting, SlotDefinition } from '../types';

export const PERIODS = [
  { index: 1, label: 'P1', theory: { start: '08:00', end: '08:50' }, lab: { start: '08:00', end: '08:50' } },
  { index: 2, label: 'P2', theory: { start: '08:55', end: '09:45' }, lab: { start: '08:50', end: '09:40' } },
  { index: 3, label: 'P3', theory: { start: '09:50', end: '10:40' }, lab: { start: '09:50', end: '10:40' } },
  { index: 4, label: 'P4', theory: { start: '10:45', end: '11:35' }, lab: { start: '10:40', end: '11:30' } },
  { index: 5, label: 'P5', theory: { start: '11:40', end: '12:30' }, lab: { start: '11:40', end: '12:30' } },
  { index: 6, label: 'P6', theory: { start: '12:35', end: '13:25' }, lab: { start: '12:30', end: '13:20' } },
  { index: 7, label: 'P7', theory: { start: '14:00', end: '14:50' }, lab: { start: '14:00', end: '14:50' } },
  { index: 8, label: 'P8', theory: { start: '14:55', end: '15:45' }, lab: { start: '14:50', end: '15:40' } },
  { index: 9, label: 'P9', theory: { start: '15:50', end: '16:40' }, lab: { start: '15:50', end: '16:40' } },
  { index: 10, label: 'P10', theory: { start: '16:45', end: '17:35' }, lab: { start: '16:40', end: '17:30' } },
  { index: 11, label: 'P11', theory: { start: '17:40', end: '18:30' }, lab: { start: '17:40', end: '18:30' } },
  { index: 12, label: 'P12', theory: { start: '18:35', end: '19:25' }, lab: { start: '18:30', end: '19:20' } },
] as const;

export const THEORY_GRID: Record<Day, (string | null)[]> = {
  MON: ['A1', 'F1', 'D1', 'TB1', 'TG1', 'S11', 'A2', 'F2', 'D2', 'TB2', 'TG2', 'S3'],
  TUE: ['B1', 'G1', 'E1', 'TC1', 'TAA1', null, 'B2', 'G2', 'E2', 'TC2', 'TAA2', 'S1'],
  WED: ['C1', 'A1', 'F1', 'TD1', 'TBB1', null, 'C2', 'A2', 'F2', 'TD2', 'TBB2', 'S4'],
  THU: ['D1', 'B1', 'G1', 'TE1', 'TCC1', null, 'D2', 'B2', 'G2', 'TE2', 'TCC2', 'S2'],
  FRI: ['E1', 'C1', 'TA1', 'TF1', 'TDD1', 'S15', 'E2', 'C2', 'TA2', 'TF2', 'TDD2', null],
  SAT: ['X11', 'X12', 'Y11', 'Y12', 'S8', 'S8', 'X21', 'Z21', 'Y21', 'W21', 'W22', 'Z22'],
  SUN: ['Y11', 'Y12', 'X11', 'X12', 'S10', 'S10', 'Y21', 'Z21', 'X21', 'W21', 'W22', 'Z22'],
};

export const LAB_GRID: Record<Day, (string | null)[]> = {
  MON: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L31', 'L32', 'L33', 'L34', 'L35', 'L36'],
  TUE: ['L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L37', 'L38', 'L39', 'L40', 'L41', 'L42'],
  WED: ['L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L43', 'L44', 'L45', 'L46', 'L47', 'L48'],
  THU: ['L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L49', 'L50', 'L51', 'L52', 'L53', 'L54'],
  FRI: ['L25', 'L26', 'L27', 'L28', 'L29', 'L30', 'L55', 'L56', 'L57', 'L58', 'L59', 'L60'],
  SAT: ['L71', 'L72', 'L73', 'L74', 'L75', 'L76', 'L77', 'L78', 'L79', 'L80', 'L81', 'L82'],
  SUN: ['L83', 'L84', 'L85', 'L86', 'L87', 'L88', 'L89', 'L90', 'L91', 'L92', 'L93', 'L94'],
};

// The chart is a period-aligned grid: each valid lab session begins on an odd
// period and occupies that period plus the next one. The source metadata in
// the highlighted cells (L7/L8, L9/L10, L15/L16, L19/L20) verifies this
// pairing convention; the same period geometry is used for the unhighlighted
// lab cells without inventing a new slot namespace.
export const LAB_SESSION_STARTS = [1, 3, 5, 7, 9, 11];

export const REFERENCE_METADATA: Record<string, string> = {
  'MON-7': 'A2-BCSE204L-TH-AB3-607-ALL',
  'MON-8': 'F2-BMAT202L-TH-AB3-607-ALL',
  'MON-9': 'D2-BCSE301L-TH-AB3-608-ALL',
  'MON-10': 'TB2-BCSE309L-TH-AB3-609-ALL',
  'MON-11': 'TG2-BCLE215L-TH-AB1-611-ALL',
  'TUE-7': 'B2-BCSE309L-TH-AB3-609-ALL',
  'TUE-8': 'G2-BCLE215L-TH-AB1-611-ALL',
  'TUE-9': 'E2-BCSE355L-TH-AB3-609-ALL',
  'TUE-10': 'TC2-BSTS301P-SS-AB3-609-ALL',
  'WED-7': 'C2-BSTS301P-SS-AB3-609-ALL',
  'WED-8': 'A2-BCSE204L-TH-AB3-607-ALL',
  'WED-9': 'F2-BMAT202L-TH-AB3-607-ALL',
  'WED-10': 'TD2-BCSE301L-TH-AB3-608-ALL',
  'THU-7': 'D2-BCSE301L-TH-AB3-608-ALL',
  'THU-8': 'B2-BCSE309L-TH-AB3-609-ALL',
  'THU-9': 'G2-BCLE215L-TH-AB1-611-ALL',
  'THU-10': 'TE2-BCSE355L-TH-AB3-609-ALL',
  'FRI-7': 'E2-BCSE355L-TH-AB3-609-ALL',
  'FRI-8': 'C2-BSTS301P-SS-AB3-609-ALL',
  'FRI-9': 'TA2-BCSE204L-TH-AB3-607-ALL',
  'FRI-10': 'TF2-BMAT202L-TH-AB3-607-ALL',
};

export const LAB_METADATA: Record<string, string> = {
  'TUE-1': 'L7-BCSE204P-LO-AB1-208-ALL',
  'TUE-2': 'L8-BCSE204P-LO-AB1-208-ALL',
  'TUE-3': 'L9-BCSE301P-LO-AB3-602-ALL',
  'TUE-4': 'L10-BCSE301P-LO-AB3-602-ALL',
  'WED-3': 'L15-BCSE309P-LO-AB3-612-ALL',
  'WED-4': 'L16-BCSE309P-LO-AB3-612-ALL',
  'THU-1': 'L19-BMAT202P-LO-AB1-613-ALL',
  'THU-2': 'L20-BMAT202P-LO-AB1-613-ALL',
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const cellRawText = (day: Day, periodIndex: number, type: ComponentType, slotCode: string) => {
  const metadata = type === 'theory' ? REFERENCE_METADATA[`${day}-${periodIndex}`] : LAB_METADATA[`${day}-${periodIndex}`];
  return metadata ?? slotCode;
};

const makeTheorySlots = (): SlotDefinition[] => {
  const byCode = new Map<string, Meeting[]>();
  const rawByCode = new Map<string, string[]>();
  (Object.keys(THEORY_GRID) as Day[]).forEach((day) => {
    THEORY_GRID[day].forEach((slotCode, index) => {
      if (!slotCode) return;
      const timing = PERIODS[index].theory;
      const meeting: Meeting = { day, periodIndex: index + 1, ...timing };
      byCode.set(slotCode, [...(byCode.get(slotCode) ?? []), meeting]);
      rawByCode.set(slotCode, [...(rawByCode.get(slotCode) ?? []), cellRawText(day, index + 1, 'theory', slotCode)]);
    });
  });
  return Array.from(byCode.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([slotCode, meetings]) => ({ slotCode, type: 'theory', meetings, durationPeriods: 1, verified: true, rawCells: rawByCode.get(slotCode) }));
};

const makeLabSlots = (): SlotDefinition[] => {
  const byCode = new Map<string, { day: Day; index: number; raw: string }>();
  (Object.keys(LAB_GRID) as Day[]).forEach((day) => {
    LAB_GRID[day].forEach((slotCode, index) => {
      if (!slotCode) return;
      byCode.set(slotCode, { day, index, raw: cellRawText(day, index + 1, 'lab', slotCode) });
    });
  });
  return Array.from(byCode.entries())
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([slotCode, value]) => {
      const startIndex = value.index - (value.index % 2);
      const nextIndex = startIndex + 1;
      const canPair = LAB_SESSION_STARTS.includes(startIndex + 1) && nextIndex < PERIODS.length;
      const first = PERIODS[startIndex].lab;
      const second = canPair ? PERIODS[nextIndex].lab : undefined;
      const meeting = canPair
        ? ({ day: value.day, periodIndex: startIndex + 1, start: first.start, end: second!.end } satisfies Meeting)
        : undefined;
      return {
        slotCode,
        type: 'lab' as const,
        meetings: meeting ? [meeting] : [],
        durationPeriods: 2,
        sessionId: meeting ? `${value.day}-L${startIndex + 1}` : undefined,
        occupiedPeriodIndices: meeting ? [startIndex + 1, nextIndex + 1] : [],
        verified: Boolean(meeting),
        verificationNote: meeting ? undefined : 'This start period cannot form a two-period session without crossing lunch or the end of the day.',
        rawCells: [value.raw],
      };
    });
};

export const THEORY_SLOTS = makeTheorySlots();
export const LAB_SLOTS = makeLabSlots();
export const THEORY_SLOT_MAP = new Map(THEORY_SLOTS.map((slot) => [slot.slotCode, slot]));
export const LAB_SLOT_MAP = new Map(LAB_SLOTS.map((slot) => [slot.slotCode, slot]));

export const UNVERIFIED_LAB_CODES = ['L61', 'L62', 'L63', 'L64', 'L65', 'L66', 'L67', 'L68', 'L69', 'L70'];

export const getSlot = (type: ComponentType, slotCode?: string) => {
  if (!slotCode) return undefined;
  return (type === 'theory' ? THEORY_SLOT_MAP : LAB_SLOT_MAP).get(slotCode);
};

export const canonicalLabSlot = (slotCode?: string) => {
  const slot = slotCode ? LAB_SLOT_MAP.get(slotCode) : undefined;
  if (!slot?.sessionId) return slotCode;
  return LAB_SLOTS.find((candidate) => candidate.sessionId === slot.sessionId && candidate.meetings[0]?.periodIndex === slot.meetings[0]?.periodIndex)?.slotCode ?? slotCode;
};

export const formatSlotMeeting = (slot: SlotDefinition) => {
  if (!slot.meetings.length) return 'Unverified mapping';
  return slot.meetings.map((meeting) => `${meeting.day} · ${meeting.start}–${meeting.end}`).join(' / ');
};

export const slotDurationMinutes = (slot: SlotDefinition) => {
  if (!slot.meetings[0]) return 0;
  return timeToMinutes(slot.meetings[0].end) - timeToMinutes(slot.meetings[0].start);
};
