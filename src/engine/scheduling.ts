import { getSlot, slotDurationMinutes } from '../data/slots';
import type {
  ComponentType,
  Conflict,
  Course,
  GeneratedSchedule,
  GeneratorResult,
  Meeting,
  Preferences,
  ScheduleBlock,
  ScheduleMetrics,
} from '../types';
import { DAYS, DEFAULT_PREFERENCES } from '../types';

const minutes = (value: string) => {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
};

const formatMinutes = (value: number) => {
  const hours = Math.floor(value / 60).toString().padStart(2, '0');
  const mins = (value % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

const overlaps = (first: Meeting, second: Meeting) =>
  first.day === second.day && minutes(first.start) < minutes(second.end) && minutes(second.start) < minutes(first.end);

export const courseComponents = (course: Course): ComponentType[] => {
  if (course.type === 'both') return ['theory', 'lab'];
  return [course.type];
};

export const blocksForCourse = (course: Course): ScheduleBlock[] => {
  return courseComponents(course).flatMap((component) => {
    const slotCode = component === 'theory' ? course.theorySlot : course.labSlot;
    const slot = getSlot(component, slotCode);
    if (!slot || !slot.verified) return [];
    return slot.meetings.map((meeting) => ({
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      component,
      slotCode: slot.slotCode,
      meeting,
      durationPeriods: slot.durationPeriods,
    }));
  });
};

const conflictMessage = (first: ScheduleBlock, second: ScheduleBlock) => {
  const firstLabel = `${first.courseCode} ${first.component}`;
  const secondLabel = `${second.courseCode} ${second.component}`;
  return `${firstLabel} (${first.slotCode}) overlaps ${secondLabel} (${second.slotCode}) on ${first.meeting.day} from ${first.meeting.start}–${first.meeting.end}.`;
};

export const detectConflicts = (courses: Course[]): Conflict[] => {
  const blocks = courses.flatMap(blocksForCourse);
  const conflicts: Conflict[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    for (let other = index + 1; other < blocks.length; other += 1) {
      const first = blocks[index];
      const second = blocks[other];
      if (!overlaps(first.meeting, second.meeting)) continue;
      const ordered = first.courseId < second.courseId ? [first, second] : [second, first];
      const id = `${ordered[0].courseId}:${ordered[0].slotCode}:${ordered[1].courseId}:${ordered[1].slotCode}:${first.meeting.day}`;
      if (conflicts.some((conflict) => conflict.id === id)) continue;
      conflicts.push({ id, first: ordered[0], second: ordered[1], message: conflictMessage(ordered[0], ordered[1]) });
    }
  }
  return conflicts;
};

export const invalidAssignments = (courses: Course[]) => {
  const issues: string[] = [];
  courses.forEach((course) => {
    courseComponents(course).forEach((component) => {
      const slotCode = component === 'theory' ? course.theorySlot : course.labSlot;
      if (!slotCode) {
        issues.push(`${course.code} is missing a ${component} slot.`);
        return;
      }
      const slot = getSlot(component, slotCode);
      if (!slot) {
        issues.push(`${course.code} uses unknown ${component} slot ${slotCode}.`);
      } else if (!slot.verified) {
        issues.push(`${course.code} uses ${slotCode}, but its ${component} mapping is unverified.`);
      }
    });
  });
  return issues;
};

const assignedComponent = (course: Course, component: ComponentType, slotCode: string): Course =>
  component === 'theory' ? { ...course, theorySlot: slotCode } : { ...course, labSlot: slotCode };

const optionsForComponent = (course: Course, component: ComponentType) => {
  const selected = component === 'theory' ? course.theorySlot : course.labSlot;
  const available = component === 'theory' ? course.availableTheorySlots : course.availableLabSlots;
  return Array.from(new Set([selected, ...available].filter(Boolean) as string[])).filter((slotCode) => {
    const slot = getSlot(component, slotCode);
    return Boolean(slot?.verified && slot.meetings.length);
  });
};

const choicesForCourse = (course: Course): Course[] => {
  const components = courseComponents(course);
  return components.reduce<Course[]>((choices, component) => {
    const options = optionsForComponent(course, component);
    if (!options.length) return [];
    if (!choices.length) return options.map((slotCode) => assignedComponent(course, component, slotCode));
    return choices.flatMap((choice) => options.map((slotCode) => assignedComponent(choice, component, slotCode)));
  }, []);
};

const preferredCount = (course: Course) => {
  const selected = [course.theorySlot, course.labSlot].filter(Boolean);
  return selected.filter((slot) => course.preferredSlots.includes(slot!)).length;
};

const defaultMetrics: ScheduleMetrics = {
  contactHours: 0,
  occupiedDays: 0,
  freeDays: DAYS.length,
  earliestStart: '—',
  latestFinish: '—',
  totalGaps: 0,
  longestGap: 0,
  lateDays: 0,
  morningClasses: 0,
  weekendClasses: 0,
  loadSpread: 0,
  freeMonday: true,
  freeFriday: true,
  preferenceMatch: 0,
  clashCount: 0,
};

export const calculateMetrics = (courses: Course[], preferences: Preferences = DEFAULT_PREFERENCES): ScheduleMetrics => {
  const blocks = courses.flatMap(blocksForCourse);
  if (!blocks.length) return defaultMetrics;
  const byDay = new Map<string, ScheduleBlock[]>();
  blocks.forEach((block) => byDay.set(block.meeting.day, [...(byDay.get(block.meeting.day) ?? []), block]));
  let contactMinutes = 0;
  let totalGaps = 0;
  let longestGap = 0;
  let morningClasses = 0;
  let lateDays = 0;
  let weekendClasses = 0;
  const dailyLoads: number[] = [];
  const allStarts: number[] = [];
  const allEnds: number[] = [];
  byDay.forEach((dayBlocks, day) => {
    const sorted = [...dayBlocks].sort((a, b) => minutes(a.meeting.start) - minutes(b.meeting.start));
    let dayMinutes = 0;
    let dayHasLate = false;
    let cursor = 0;
    sorted.forEach((block) => {
      const start = minutes(block.meeting.start);
      const end = minutes(block.meeting.end);
      contactMinutes += slotDurationMinutes(getSlot(block.component, block.slotCode)!);
      dayMinutes += end - start;
      allStarts.push(start);
      allEnds.push(end);
      if (start < 10 * 60) morningClasses += 1;
      if (start >= 17 * 60) dayHasLate = true;
      if (day === 'SAT' || day === 'SUN') weekendClasses += 1;
      if (cursor && start > cursor) {
        const gap = start - cursor;
        totalGaps += gap;
        longestGap = Math.max(longestGap, gap);
      }
      cursor = Math.max(cursor, end);
    });
    dailyLoads.push(dayMinutes);
    if (dayHasLate) lateDays += 1;
  });
  const conflicts = detectConflicts(courses);
  const earliest = Math.min(...allStarts);
  const latest = Math.max(...allEnds);
  const occupiedDays = byDay.size;
  const freeDays = DAYS.length - occupiedDays;
  const loadSpread = dailyLoads.length > 1 ? Math.max(...dailyLoads) - Math.min(...dailyLoads) : 0;
  const freeMonday = !byDay.has('MON');
  const freeFriday = !byDay.has('FRI');
  const preferenceMatch = scorePreferences(
    { occupiedDays, freeDays, totalGaps, longestGap, earliestStart: formatMinutes(earliest), latestFinish: formatMinutes(latest), lateDays, weekendClasses, loadSpread, freeMonday, freeFriday },
    preferences,
  );
  return {
    contactHours: Math.round((contactMinutes / 60) * 10) / 10,
    occupiedDays,
    freeDays,
    earliestStart: formatMinutes(earliest),
    latestFinish: formatMinutes(latest),
    totalGaps,
    longestGap,
    lateDays,
    morningClasses,
    weekendClasses,
    loadSpread,
    freeMonday,
    freeFriday,
    preferenceMatch,
    clashCount: conflicts.length,
  };
};

type PreferenceInput = Pick<ScheduleMetrics, 'occupiedDays' | 'freeDays' | 'totalGaps' | 'longestGap' | 'earliestStart' | 'latestFinish' | 'lateDays' | 'weekendClasses' | 'loadSpread' | 'freeMonday' | 'freeFriday'>;

export const scorePreferences = (metrics: PreferenceInput, preferences: Preferences = DEFAULT_PREFERENCES) => {
  let score = 100;
  const early = metrics.earliestStart !== '—' && minutes(metrics.earliestStart) < 8 * 60 + 55;
  const late = metrics.latestFinish !== '—' && minutes(metrics.latestFinish) > 17 * 60;
  score -= preferences.compactDays ? Math.min(32, metrics.totalGaps / 30 * preferences.weightGaps) : Math.min(14, metrics.totalGaps / 90);
  score -= early && preferences.avoidEarly ? 8 * preferences.weightEarly : 0;
  score -= late && preferences.avoidLate ? 8 * preferences.weightLate : 0;
  score -= metrics.weekendClasses * (preferences.avoidWeekend ? 3 * preferences.weightWeekend : 0);
  score += metrics.freeDays * (preferences.maximizeFreeDays ? 2 * preferences.weightFreeDays : 0);
  score -= preferences.balanceWorkload ? Math.min(16, metrics.loadSpread / 30) : 0;
  if (preferences.preferFreeMonday && metrics.freeMonday) score += 5;
  if (preferences.preferFreeFriday && metrics.freeFriday) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const generateSchedules = (
  courses: Course[],
  preferences: Preferences = DEFAULT_PREFERENCES,
  options: { maxSchedules?: number; maxNodes?: number } = {},
): GeneratorResult => {
  const maxSchedules = options.maxSchedules ?? 24;
  const maxNodes = options.maxNodes ?? 20_000;
  const errors: string[] = [];
  const included = courses.filter((course) => preferences.includeElectives || course.mandatory);
  const skipped = courses.filter((course) => !included.includes(course));
  if (skipped.length) errors.push(`${skipped.length} elective${skipped.length === 1 ? '' : 's'} excluded by the current generator preference.`);
  const prepared = included
    .map((course) => ({ course, choices: choicesForCourse(course) }))
    .sort((first, second) => first.choices.length - second.choices.length || Number(second.course.mandatory) - Number(first.course.mandatory));
  prepared.forEach(({ course, choices }) => {
    if (!choices.length) errors.push(`${course.code} has no verified eligible slot combination.`);
  });
  if (errors.some((error) => error.includes('no verified'))) return { schedules: [], nodesVisited: 0, truncated: false, errors };
  if (!prepared.length) return { schedules: [], nodesVisited: 0, truncated: false, errors: [...errors, 'There are no courses included in this search. Turn on Include electives or add a mandatory course.'] };
  const schedules: GeneratedSchedule[] = [];
  const seen = new Set<string>();
  let nodesVisited = 0;
  let truncated = false;

  const visit = (index: number, selected: Course[]) => {
    if (nodesVisited >= maxNodes || schedules.length >= maxSchedules) {
      truncated = true;
      return;
    }
    nodesVisited += 1;
    if (index === prepared.length) {
      const key = selected.map((course) => `${course.id}:${course.theorySlot ?? ''}:${course.labSlot ?? ''}`).sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const blocks = selected.flatMap(blocksForCourse);
      const conflicts = detectConflicts(selected);
      const metrics = calculateMetrics(selected, preferences);
      const preferenceBonus = selected.reduce((sum, course) => sum + preferredCount(course) * 2, 0);
      schedules.push({ id: `schedule-${schedules.length + 1}`, courses: selected, blocks, conflicts, metrics, score: metrics.preferenceMatch + preferenceBonus });
      return;
    }
    const preparedCourse = prepared[index];
    for (const choice of preparedCourse.choices) {
      const next = [...selected, choice];
      if (detectConflicts(next).length) continue;
      visit(index + 1, next);
      if (truncated && schedules.length >= maxSchedules) return;
    }
  };

  visit(0, []);
  schedules.sort((first, second) => second.score - first.score || first.metrics.totalGaps - second.metrics.totalGaps);
  return { schedules, nodesVisited, truncated, errors };
};

export const assignmentSummary = (course: Course) => {
  const pieces = [course.theorySlot, course.labSlot].filter(Boolean);
  return pieces.length ? pieces.join(' + ') : 'Unassigned';
};
