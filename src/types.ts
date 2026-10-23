export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type Day = (typeof DAYS)[number];

export type CourseType = 'theory' | 'lab' | 'both';
export type ComponentType = 'theory' | 'lab';

export type TimeRange = {
  start: string;
  end: string;
};

export type Meeting = TimeRange & {
  day: Day;
  periodIndex: number;
};

export type SlotDefinition = {
  slotCode: string;
  type: ComponentType;
  meetings: Meeting[];
  durationPeriods: number;
  sessionId?: string;
  occupiedPeriodIndices?: number[];
  verified: boolean;
  verificationNote?: string;
  rawCells?: string[];
};

export type Course = {
  id: string;
  code: string;
  name: string;
  type: CourseType;
  credits: number;
  faculty: string;
  availableTheorySlots: string[];
  availableLabSlots: string[];
  preferredSlots: string[];
  mandatory: boolean;
  notes: string;
  theorySlot?: string;
  labSlot?: string;
};

export type Preferences = {
  avoidEarly: boolean;
  avoidLate: boolean;
  compactDays: boolean;
  preferFreeMonday: boolean;
  preferFreeFriday: boolean;
  maximizeFreeDays: boolean;
  avoidWeekend: boolean;
  balanceWorkload: boolean;
  includeElectives: boolean;
  weightGaps: number;
  weightEarly: number;
  weightLate: number;
  weightFreeDays: number;
  weightWeekend: number;
};

export type Plan = {
  id: string;
  name: string;
  courses: Course[];
  preferences: Preferences;
  updatedAt: string;
};

export type ScheduleBlock = {
  courseId: string;
  courseCode: string;
  courseName: string;
  component: ComponentType;
  slotCode: string;
  meeting: Meeting;
  durationPeriods: number;
};

export type Conflict = {
  id: string;
  first: ScheduleBlock;
  second: ScheduleBlock;
  message: string;
};

export type ScheduleMetrics = {
  contactHours: number;
  occupiedDays: number;
  freeDays: number;
  earliestStart: string;
  latestFinish: string;
  totalGaps: number;
  longestGap: number;
  lateDays: number;
  morningClasses: number;
  weekendClasses: number;
  loadSpread: number;
  freeMonday: boolean;
  freeFriday: boolean;
  preferenceMatch: number;
  clashCount: number;
};

export type GeneratedSchedule = {
  id: string;
  courses: Course[];
  blocks: ScheduleBlock[];
  conflicts: Conflict[];
  metrics: ScheduleMetrics;
  score: number;
};

export type GeneratorResult = {
  schedules: GeneratedSchedule[];
  nodesVisited: number;
  truncated: boolean;
  errors: string[];
};

export const DEFAULT_PREFERENCES: Preferences = {
  avoidEarly: true,
  avoidLate: true,
  compactDays: true,
  preferFreeMonday: false,
  preferFreeFriday: false,
  maximizeFreeDays: true,
  avoidWeekend: true,
  balanceWorkload: true,
  includeElectives: true,
  weightGaps: 3,
  weightEarly: 2,
  weightLate: 2,
  weightFreeDays: 3,
  weightWeekend: 2,
};
