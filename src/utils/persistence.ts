import type { Course, Plan, Preferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import { getSlot } from '../data/slots';
import { blocksForCourse } from '../engine/scheduling';

const STORAGE_KEY = 'vit-ffcs-planner:v1';

export type AppSnapshot = {
  plans: Plan[];
  activePlanId: string;
  theme: 'dark' | 'light';
};

type SnapshotInput = {
  plans?: Array<Omit<Partial<Plan>, 'preferences'> & { preferences?: Partial<Preferences> }>;
  activePlanId?: string;
  theme?: 'dark' | 'light';
};

export const createPlan = (name = 'Semester plan', courses: Course[] = [], preferences: Preferences = DEFAULT_PREFERENCES): Plan => ({
  id: crypto.randomUUID(),
  name,
  courses,
  preferences: { ...preferences },
  updatedAt: new Date().toISOString(),
});

export const defaultSnapshot = (): AppSnapshot => {
  const plan = createPlan();
  return { plans: [plan], activePlanId: plan.id, theme: 'dark' };
};

export const normalizeSnapshot = (candidate: SnapshotInput): AppSnapshot => {
  const rawPlans = Array.isArray(candidate.plans) ? candidate.plans : [];
  if (!rawPlans.length) return defaultSnapshot();
  const plans = rawPlans.map((plan) => ({
    ...plan,
    id: plan.id || crypto.randomUUID(),
    name: plan.name || 'Semester plan',
    preferences: { ...DEFAULT_PREFERENCES, ...(plan.preferences ?? {}) },
    courses: Array.isArray(plan.courses) ? plan.courses : [],
    updatedAt: plan.updatedAt || new Date().toISOString(),
  }));
  const activePlanId = plans.some((plan) => plan.id === candidate.activePlanId) ? candidate.activePlanId! : plans[0].id;
  return { plans, activePlanId, theme: candidate.theme === 'light' ? 'light' : 'dark' };
};

export const loadSnapshot = (): AppSnapshot => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSnapshot();
    return normalizeSnapshot(JSON.parse(stored) as SnapshotInput);
  } catch {
    return defaultSnapshot();
  }
};

export const saveSnapshot = (snapshot: AppSnapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};

export const exportJson = (snapshot: AppSnapshot) => {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `ffcs-planner-${new Date().toISOString().slice(0, 10)}.json`);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportCoursesCsv = (courses: Course[]) => {
  const header = ['Code', 'Name', 'Type', 'Credits', 'Faculty', 'Theory slot', 'Lab slot', 'Mandatory', 'Notes'];
  const rows = courses.map((course) => [
    course.code,
    course.name,
    course.type,
    course.credits,
    course.faculty,
    course.theorySlot ?? '',
    course.labSlot ?? '',
    course.mandatory ? 'Yes' : 'No',
    course.notes,
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'ffcs-courses.csv');
};

export const exportScheduleCsv = (courses: Course[]) => {
  const rows = [['Course code', 'Course name', 'Component', 'Slot', 'Day', 'Start', 'End']];
  courses.forEach((course) => {
    blocksForCourse(course).forEach((block) => rows.push([course.code, course.name, block.component === 'theory' ? 'Theory' : 'Lab', block.slotCode, block.meeting.day, block.meeting.start, block.meeting.end]));
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'ffcs-timetable.csv');
};

const nextMonday = () => {
  const date = new Date();
  const day = date.getDay();
  const distance = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + distance);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isoLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}00`;
};

const isoUtc = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

const icsEscape = (value: string) => value.replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n');

export const exportIcs = (courses: Course[]) => {
  const monday = nextMonday();
  const dayOffsets: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  const icsDays: Record<string, string> = { MON: 'MO', TUE: 'TU', WED: 'WE', THU: 'TH', FRI: 'FR', SAT: 'SA', SUN: 'SU' };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VIT Chennai//FFCS Planner//EN', 'CALSCALE:GREGORIAN'];
  courses.forEach((course) => {
    const components = [
      { key: 'theorySlot' as const, label: 'Theory' },
      { key: 'labSlot' as const, label: 'Lab' },
    ];
    components.forEach(({ key, label }) => {
      const slotCode = course[key];
      if (!slotCode) return;
      const slot = getSlot(label.toLowerCase() as 'theory' | 'lab', slotCode);
      slot?.meetings.forEach((meeting) => {
        const start = new Date(monday);
        start.setDate(start.getDate() + dayOffsets[meeting.day]);
        const [startHour, startMinute] = meeting.start.split(':').map(Number);
        start.setHours(startHour, startMinute, 0, 0);
        const end = new Date(monday);
        end.setDate(end.getDate() + dayOffsets[meeting.day]);
        const [endHour, endMinute] = meeting.end.split(':').map(Number);
        end.setHours(endHour, endMinute, 0, 0);
        lines.push(
          'BEGIN:VEVENT',
          `UID:${course.id}-${label.toLowerCase()}-${meeting.day}@ffcs-planner`,
          `DTSTAMP:${isoUtc(new Date())}Z`,
          `DTSTART;TZID=Asia/Kolkata:${isoLocal(start)}`,
          `DTEND;TZID=Asia/Kolkata:${isoLocal(end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${icsDays[meeting.day]}`,
          `SUMMARY:${icsEscape(`${course.code} · ${label}`)}`,
          `DESCRIPTION:${icsEscape(`${course.name} · Slot ${slotCode}`)}`,
          'END:VEVENT',
        );
      });
    });
  });
  lines.push('END:VCALENDAR');
  downloadBlob(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }), 'ffcs-timetable.ics');
};
