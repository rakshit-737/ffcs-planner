import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FlaskConical,
  GitCompare,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Table2,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  DAYS,
  DEFAULT_PREFERENCES,
  type ComponentType,
  type Course,
  type CourseType,
  type Day,
  type GeneratedSchedule,
  type Plan,
  type Preferences,
  type ScheduleBlock,
} from './types';
import {
  formatSlotMeeting,
  LAB_GRID,
  LAB_SLOTS,
  LAB_SLOT_MAP,
  getSlot,
  canonicalLabSlot,
  PERIODS,
  REFERENCE_METADATA,
  THEORY_GRID,
  THEORY_SLOTS,
  UNVERIFIED_LAB_CODES,
} from './data/slots';
import {
  assignmentSummary,
  blocksForCourse,
  calculateMetrics,
  detectConflicts,
  generateSchedules,
  invalidAssignments,
} from './engine/scheduling';
import {
  createPlan,
  downloadBlob,
  exportCoursesCsv,
  exportIcs,
  exportJson,
  exportScheduleCsv,
  defaultSnapshot,
  loadSnapshot,
  normalizeSnapshot,
  saveSnapshot,
} from './utils/persistence';
import './styles.css';

type View = 'dashboard' | 'courses' | 'planner' | 'timetable' | 'compare' | 'reference' | 'settings';

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Your week at a glance' },
  { id: 'courses', label: 'My courses', icon: BookOpen, hint: 'Build your registration list' },
  { id: 'planner', label: 'Slot planner', icon: SlidersHorizontal, hint: 'Assign and inspect slots' },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays, hint: 'See the week in motion' },
  { id: 'compare', label: 'Compare schedules', icon: GitCompare, hint: 'Rank feasible alternatives' },
  { id: 'reference', label: 'Slot reference', icon: Table2, hint: 'Verify the source mapping' },
  { id: 'settings', label: 'Settings', icon: Settings, hint: 'Plans, data, preferences' },
];

const DEMO_COURSES: Course[] = [
  {
    id: 'demo-bcse204l', code: 'BCSE204L', name: 'Design & Analysis of Algorithms', type: 'both', credits: 4, faculty: 'AB3 · 607',
    availableTheorySlots: ['A2', 'TA2'], availableLabSlots: ['L7', 'L19'], preferredSlots: ['A2', 'L7'], mandatory: true,
    notes: 'Reference course from the supplied timetable image.', theorySlot: 'A2', labSlot: 'L7',
  },
  {
    id: 'demo-bmat202l', code: 'BMAT202L', name: 'Discrete Mathematics', type: 'both', credits: 4, faculty: 'AB3 · 607',
    availableTheorySlots: ['F2', 'TF2'], availableLabSlots: ['L19', 'L27'], preferredSlots: ['F2', 'L19'], mandatory: true,
    notes: 'Reference course from the supplied timetable image.', theorySlot: 'F2', labSlot: 'L19',
  },
  {
    id: 'demo-bcse301l', code: 'BCSE301L', name: 'Database Systems', type: 'both', credits: 4, faculty: 'AB3 · 608',
    availableTheorySlots: ['D2', 'TD2'], availableLabSlots: ['L9', 'L15'], preferredSlots: ['D2', 'L9'], mandatory: true,
    notes: 'Reference course from the supplied timetable image.', theorySlot: 'D2', labSlot: 'L9',
  },
  {
    id: 'demo-bcse309l', code: 'BCSE309L', name: 'Computer Networks', type: 'both', credits: 4, faculty: 'AB3 · 609',
    availableTheorySlots: ['TB2', 'B2'], availableLabSlots: ['L15', 'L37'], preferredSlots: ['TB2', 'L15'], mandatory: true,
    notes: 'Reference course from the supplied timetable image.', theorySlot: 'TB2', labSlot: 'L15',
  },
  {
    id: 'demo-bcle215l', code: 'BCLE215L', name: 'Cloud Computing', type: 'theory', credits: 3, faculty: 'AB1 · 611',
    availableTheorySlots: ['TG2', 'G2'], availableLabSlots: [], preferredSlots: ['TG2'], mandatory: false,
    notes: 'Reference theory course from the supplied timetable image.', theorySlot: 'TG2',
  },
];

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const emptyCourse = (): Course => ({
  id: uid('course'), code: '', name: '', type: 'theory', credits: 3, faculty: '', availableTheorySlots: [], availableLabSlots: [],
  preferredSlots: [], mandatory: true, notes: '',
});

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const labelDay = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();

function App() {
  const [snapshot, setSnapshot] = useState(loadSnapshot);
  const [view, setView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ReturnType<typeof generateSchedules> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const activePlan = snapshot.plans.find((plan) => plan.id === snapshot.activePlanId) ?? snapshot.plans[0];
  const conflicts = useMemo(() => detectConflicts(activePlan.courses), [activePlan.courses]);
  const issues = useMemo(() => invalidAssignments(activePlan.courses), [activePlan.courses]);
  const metrics = useMemo(() => calculateMetrics(activePlan.courses, activePlan.preferences), [activePlan.courses, activePlan.preferences]);
  const planStats = useMemo(() => ({
    theory: activePlan.courses.filter((course) => course.type === 'theory' || course.type === 'both').length,
    labs: activePlan.courses.filter((course) => course.type === 'lab' || course.type === 'both').length,
  }), [activePlan.courses]);

  useEffect(() => {
    saveSnapshot(snapshot);
    document.documentElement.dataset.theme = snapshot.theme;
  }, [snapshot]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateActivePlan = (updater: (plan: Plan) => Plan) => {
    setSnapshot((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === current.activePlanId ? updater(plan) : plan),
    }));
  };

  const updateCourses = (courses: Course[]) => { setGenerated(null); updateActivePlan((plan) => ({ ...plan, courses, updatedAt: new Date().toISOString() })); };
  const updatePreferences = (preferences: Partial<Preferences>) => { setGenerated(null); updateActivePlan((plan) => ({ ...plan, preferences: { ...plan.preferences, ...preferences }, updatedAt: new Date().toISOString() })); };

  const navigate = (nextView: View) => {
    setView(nextView);
    setMobileNavOpen(false);
  };

  const showToast = (message: string) => setToast(message);

  const runGenerator = () => {
    if (!activePlan.courses.length) {
      showToast('Add at least one course before generating schedules.');
      navigate('courses');
      return;
    }
    setIsGenerating(true);
    window.setTimeout(() => {
      const result = generateSchedules(activePlan.courses, activePlan.preferences, { maxSchedules: 32, maxNodes: 30_000 });
      setGenerated(result);
      setIsGenerating(false);
      navigate('compare');
      showToast(result.schedules.length ? `Found ${result.schedules.length} clash-free route${result.schedules.length === 1 ? '' : 's'}.` : 'No clash-free route found — review the slot options.');
    }, 80);
  };

  const loadDemo = () => {
    updateCourses(DEMO_COURSES.map((course) => ({ ...course, id: uid('course') })));
    showToast('Reference courses loaded into this plan. You can edit everything.');
  };

  const duplicatePlan = () => {
    setGenerated(null);
    const copy = createPlan(`${activePlan.name} copy`, activePlan.courses.map((course) => ({ ...course, id: uid('course') })), activePlan.preferences);
    setSnapshot((current) => ({ ...current, plans: [...current.plans, copy], activePlanId: copy.id }));
    showToast('Plan duplicated.');
  };

  const addPlan = () => {
    setGenerated(null);
    const plan = createPlan(`Plan ${snapshot.plans.length + 1}`);
    setSnapshot((current) => ({ ...current, plans: [...current.plans, plan], activePlanId: plan.id }));
    showToast('New plan created.');
  };

  const renamePlan = () => {
    const nextName = window.prompt('Name this plan', activePlan.name)?.trim();
    if (!nextName) return;
    updateActivePlan((plan) => ({ ...plan, name: nextName, updatedAt: new Date().toISOString() }));
  };

  const deletePlan = () => {
    if (snapshot.plans.length === 1) {
      showToast('Keep one plan around — you can clear its courses instead.');
      return;
    }
    const nextPlans = snapshot.plans.filter((plan) => plan.id !== activePlan.id);
    setGenerated(null);
    setSnapshot((current) => ({ ...current, plans: nextPlans, activePlanId: nextPlans[0].id }));
    showToast('Plan removed.');
  };

  const applySchedule = (schedule: GeneratedSchedule) => {
    const selectedById = new Map(schedule.courses.map((course) => [course.id, course]));
    updateCourses(activePlan.courses.map((course) => selectedById.get(course.id) ?? course));
    showToast('Schedule applied to the active plan.');
    navigate('timetable');
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as typeof snapshot;
        if (!imported.plans?.length) throw new Error('No plans found');
        setGenerated(null);
        setSnapshot(normalizeSnapshot(imported));
        showToast('Plan data restored.');
      } catch {
        showToast('That file is not a valid FFCS planner export.');
      }
    };
    reader.readAsText(file);
  };

  const title = NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Dashboard';

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        view={view}
        navigate={navigate}
        plan={activePlan}
        plans={snapshot.plans}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onCollapse={() => setSidebarCollapsed((value) => !value)}
        onMobileClose={() => setMobileNavOpen(false)}
        onSelectPlan={(id) => { setGenerated(null); setSnapshot((current) => ({ ...current, activePlanId: id })); }}
        onAddPlan={addPlan}
      />
      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
            <div className="breadcrumb"><span>FFCS /</span> {title}</div>
          </div>
          <div className="topbar-actions">
            <div className="save-indicator"><span className="save-dot" /> Saved locally</div>
            <button className="icon-button" aria-label="Toggle theme" onClick={() => setSnapshot((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}>
              {snapshot.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="button button-primary button-small" onClick={runGenerator}><WandSparkles size={16} /> Generate routes</button>
          </div>
        </header>
        <div className="page-content">
          {view === 'dashboard' && <Dashboard plan={activePlan} metrics={metrics} conflicts={conflicts.length} issues={issues.length} theoryCount={planStats.theory} labCount={planStats.labs} navigate={navigate} onGenerate={runGenerator} onLoadDemo={loadDemo} />}
          {view === 'courses' && <CoursesView courses={activePlan.courses} updateCourses={updateCourses} onLoadDemo={loadDemo} showToast={showToast} />}
          {view === 'planner' && <PlannerView courses={activePlan.courses} updateCourses={updateCourses} conflicts={conflicts} issues={issues} onGenerate={runGenerator} />}
          {view === 'timetable' && <TimetableView courses={activePlan.courses} conflicts={conflicts} onSelectSlot={(courseId, component, slotCode) => { const course = activePlan.courses.find((item) => item.id === courseId); if (!course) return; const normalized = component === 'lab' ? canonicalLabSlot(slotCode) : slotCode; const current = component === 'lab' ? canonicalLabSlot(course.labSlot) : course.theorySlot; const next = component === 'theory' ? { ...course, theorySlot: current === normalized ? undefined : normalized } : { ...course, labSlot: current === normalized ? undefined : normalized }; updateCourses(activePlan.courses.map((item) => item.id === courseId ? next : item)); }} onEdit={() => navigate('planner')} onExport={() => exportIcs(activePlan.courses)} onPrint={() => window.print()} />}
          {view === 'compare' && <CompareView result={generated} onGenerate={runGenerator} onApply={applySchedule} isGenerating={isGenerating} preferences={activePlan.preferences} updatePreferences={updatePreferences} courses={activePlan.courses} />}
          {view === 'reference' && <ReferenceView />}
          {view === 'settings' && <SettingsView plan={activePlan} plans={snapshot.plans} updatePreferences={updatePreferences} onRename={renamePlan} onDuplicate={duplicatePlan} onDelete={deletePlan} onExportJson={() => exportJson(snapshot)} onImport={importJson} onExportCourses={() => exportCoursesCsv(activePlan.courses)} onExportSchedule={() => exportScheduleCsv(activePlan.courses)} onExportIcs={() => exportIcs(activePlan.courses)} onReset={() => { localStorage.removeItem('vit-ffcs-planner:v1'); setGenerated(null); setSnapshot(defaultSnapshot()); showToast('Local data reset.'); }} />}
        </div>
      </main>
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  );
}

function Sidebar({ view, navigate, plan, plans, collapsed, mobileOpen, onCollapse, onMobileClose, onSelectPlan, onAddPlan }: {
  view: View; navigate: (view: View) => void; plan: Plan; plans: Plan[]; collapsed: boolean; mobileOpen: boolean; onCollapse: () => void; onMobileClose: () => void; onSelectPlan: (id: string) => void; onAddPlan: () => void;
}) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand-lockup">
        <div className="brand-mark"><GraduationCap size={21} /></div>
        {!collapsed && <div><strong>FFCS</strong><span>VIT CHENNAI</span></div>}
        <button className="icon-button sidebar-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onCollapse}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        <button className="icon-button mobile-only sidebar-close" aria-label="Close navigation" onClick={onMobileClose}><X size={18} /></button>
      </div>
      {!collapsed && <div className="side-plan-select">
        <div className="side-label">ACTIVE PLAN</div>
        <select value={plan.id} onChange={(event) => onSelectPlan(event.target.value)} aria-label="Active plan">
          {plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="side-add-plan" onClick={onAddPlan}><Plus size={14} /> New plan</button>
      </div>}
      <nav className="main-nav" aria-label="Main navigation">
        <div className="side-label nav-label">WORKSPACE</div>
        {NAV_ITEMS.slice(0, 5).map((item) => <NavItem key={item.id} item={item} active={view === item.id} collapsed={collapsed} onClick={() => navigate(item.id)} />)}
        <div className="side-label nav-label nav-label-spaced">SYSTEM</div>
        {NAV_ITEMS.slice(5).map((item) => <NavItem key={item.id} item={item} active={view === item.id} collapsed={collapsed} onClick={() => navigate(item.id)} />)}
      </nav>
      {!collapsed && <div className="sidebar-footnote"><Sparkles size={17} /><div><strong>Built for the slot maze.</strong><span>Every block follows the reference grid.</span></div></div>}
    </aside>
  );
}

function NavItem({ item, active, collapsed, onClick }: { item: typeof NAV_ITEMS[number]; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} title={collapsed ? item.label : undefined}><Icon size={18} /><span>{!collapsed && item.label}</span>{!collapsed && active && <ChevronRight size={15} className="nav-chevron" />}</button>;
}

function PageIntro({ title, description, eyebrow, actions }: { title: string; description: string; eyebrow?: string; actions?: React.ReactNode }) {
  return <div className="page-intro"><div>{eyebrow && <div className="intro-eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="intro-actions">{actions}</div>}</div>;
}

function MetricStrip({ metrics, theoryCount, labCount, courseCount }: { metrics: ReturnType<typeof calculateMetrics>; theoryCount: number; labCount: number; courseCount: number }) {
  return <div className="metric-strip">
    <Metric label="Courses" value={courseCount} detail={`${theoryCount} theory · ${labCount} lab`} />
    <Metric label="Contact hours" value={`${metrics.contactHours}h`} detail="weekly footprint" />
    <Metric label="Free days" value={metrics.freeDays} detail={metrics.occupiedDays ? `${metrics.occupiedDays} days in motion` : 'Start by adding courses'} />
    <Metric label="Window" value={metrics.earliestStart === '—' ? '—' : `${metrics.earliestStart}–${metrics.latestFinish}`} detail="first to last class" />
    <Metric label="Conflicts" value={metrics.clashCount} detail={metrics.clashCount ? 'needs attention' : 'plan is clear'} tone={metrics.clashCount ? 'danger' : 'positive'} />
  </div>;
}

function Metric({ label, value, detail, tone = 'default' }: { label: string; value: string | number; detail: string; tone?: 'default' | 'danger' | 'positive' }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Dashboard({ plan, metrics, conflicts, issues, theoryCount, labCount, navigate, onGenerate, onLoadDemo }: { plan: Plan; metrics: ReturnType<typeof calculateMetrics>; conflicts: number; issues: number; theoryCount: number; labCount: number; navigate: (view: View) => void; onGenerate: () => void; onLoadDemo: () => void }) {
  return <div className="dashboard-view">
    <PageIntro eyebrow="SEMESTER CONTROL ROOM" title="Design a week that earns back your time." description="Build your registration list, trace every slot through the VIT grid, then compare the routes that leave the most room to breathe." actions={<><button className="button button-secondary" onClick={onLoadDemo}><Sparkles size={16} /> Load reference plan</button><button className="button button-primary" onClick={onGenerate}><WandSparkles size={16} /> Generate routes</button></>} />
    <MetricStrip metrics={metrics} theoryCount={theoryCount} labCount={labCount} courseCount={plan.courses.length} />
    <div className="dashboard-grid">
      <section className="route-panel panel panel-large"><div className="panel-heading"><div><h2>Live weekly route</h2><p>{plan.courses.length ? 'The current plan, rendered against the actual period grid.' : 'Your timetable will take shape here.'}</p></div><button className="text-button" onClick={() => navigate('timetable')}>Open timetable <ArrowUpRight size={15} /></button></div><MiniWeek courses={plan.courses} /></section>
      <section className="signal-panel panel"><div className="panel-heading"><div><h2>Plan signals</h2><p>Small checks before you commit.</p></div><CircleHelp size={18} className="muted-icon" /></div><SignalRow label="Clash scan" value={conflicts ? `${conflicts} found` : plan.courses.length ? 'Clear' : 'Waiting'} tone={conflicts ? 'danger' : plan.courses.length ? 'positive' : 'neutral'} icon={conflicts ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} /><SignalRow label="Mapping confidence" value={issues ? `${issues} review` : 'Reference verified'} tone={issues ? 'warning' : 'positive'} icon={issues ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} /><SignalRow label="Route score" value={plan.courses.length ? `${metrics.preferenceMatch}/100` : '—'} tone="violet" icon={<Sparkles size={16} />} /><div className="signal-footnote"><span className="legend-pip violet" /> Score is heuristic. Preferences remain visible in comparison.</div></section>
      <section className="next-panel panel"><div className="next-number">{plan.courses.length ? '02' : '01'}</div><div><div className="side-label">NEXT MOVE</div><h2>{plan.courses.length ? 'Explore a better route' : 'Start with your courses'}</h2><p>{plan.courses.length ? 'Generate several clash-free combinations and compare the trade-offs before applying one.' : 'Add your intended subjects and the slots you are considering. The planner will take it from there.'}</p><button className="button button-quiet" onClick={() => navigate(plan.courses.length ? 'planner' : 'courses')}>{plan.courses.length ? 'Open slot planner' : 'Add first course'} <ChevronRight size={16} /></button></div></section>
    </div>
  </div>;
}

function SignalRow({ label, value, tone, icon }: { label: string; value: string; tone: 'danger' | 'positive' | 'warning' | 'neutral' | 'violet'; icon: React.ReactNode }) {
  return <div className="signal-row"><div className={`signal-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div><ChevronRight size={15} className="muted-icon" /></div>;
}

function MiniWeek({ courses }: { courses: Course[] }) {
  const blocks = courses.flatMap(blocksForCourse);
  return <div className="mini-week"><div className="mini-week-days"><span />{DAYS.map((day) => <span key={day}>{day.slice(0, 1)}</span>)}</div><div className="mini-week-body"><div className="mini-time-column">{['08', '10', '12', '14', '16', '18'].map((time) => <span key={time}>{time}:00</span>)}</div><div className="mini-canvas">{DAYS.map((day) => <div className="mini-day" key={day}>{blocks.filter((block) => block.meeting.day === day).map((block) => { const top = Math.max(2, ((timeToMinutes(block.meeting.start) - 480) / 690) * 228); const height = Math.max(8, ((timeToMinutes(block.meeting.end) - timeToMinutes(block.meeting.start)) / 690) * 228); return <div key={`${block.courseId}-${block.component}-${block.slotCode}-${day}`} className={`mini-block ${block.component}`} style={{ top: `${top}px`, height: `${height}px` }} title={`${block.courseCode} · ${block.slotCode}`} />; })}</div>)}</div></div>{!blocks.length && <div className="mini-empty"><CalendarRange size={20} /><span>No classes plotted yet</span></div>}</div>;
}

function CoursesView({ courses, updateCourses, onLoadDemo, showToast }: { courses: Course[]; updateCourses: (courses: Course[]) => void; onLoadDemo: () => void; showToast: (message: string) => void }) {
  const [editing, setEditing] = useState<Course | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [search, setSearch] = useState('');
  const filtered = courses.filter((course) => `${course.code} ${course.name}`.toLowerCase().includes(search.toLowerCase()));

  const saveCourse = (course: Course) => {
    const exists = courses.some((item) => item.id === course.id);
    updateCourses(exists ? courses.map((item) => item.id === course.id ? course : item) : [...courses, course]);
    setEditing(null);
    showToast(exists ? `${course.code || 'Course'} updated.` : `${course.code || 'Course'} added.`);
  };

  const deleteCourse = (id: string) => {
    const course = courses.find((item) => item.id === id);
    updateCourses(courses.filter((item) => item.id !== id));
    showToast(`${course?.code || 'Course'} removed.`);
  };

  const duplicateCourse = (course: Course) => {
    const copy = { ...course, id: uid('course'), code: `${course.code}-COPY`, name: `${course.name} copy` };
    updateCourses([...courses, copy]);
    setEditing(copy);
    showToast('Course duplicated.');
  };

  const importPasted = () => {
    const rows = pasteValue.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const imported = rows.map((row) => {
      const [code = '', name = '', type = 'theory', credits = '3', theory = '', lab = ''] = row.split(/\t|,/).map((value) => value.trim());
      const safeType: CourseType = type.toLowerCase().includes('lab') && type.toLowerCase().includes('theory') ? 'both' : type.toLowerCase().includes('lab') ? 'lab' : 'theory';
      return { ...emptyCourse(), id: uid('course'), code, name, type: safeType, credits: Number(credits) || 3, availableTheorySlots: theory ? theory.split('|').map((slot) => slot.trim()).filter(Boolean) : [], availableLabSlots: lab ? lab.split('|').map((slot) => slot.trim()).filter(Boolean) : [] };
    }).filter((course) => course.code);
    if (!imported.length) {
      showToast('Paste rows with at least a course code.');
      return;
    }
    updateCourses([...courses, ...imported]);
    setPasteValue('');
    setShowPaste(false);
    showToast(`${imported.length} course${imported.length === 1 ? '' : 's'} imported.`);
  };

  return <div className="courses-view">
    <PageIntro eyebrow="REGISTRATION LIST" title="Make the semester legible." description="Keep the course list honest first. Slot assignments can change without rebuilding the course record." actions={<><button className="button button-secondary" onClick={() => setShowPaste((value) => !value)}><Upload size={16} /> Paste list</button><button className="button button-primary" onClick={() => setEditing(emptyCourse())}><Plus size={16} /> Add course</button></>} />
    {showPaste && <section className="paste-panel panel"><div><h2>Paste a course list</h2><p>One row per course: <code>code, name, type, credits, theory slots, lab slots</code>. Separate multiple slots with <code>|</code>.</p></div><textarea value={pasteValue} onChange={(event) => setPasteValue(event.target.value)} placeholder={'BCSE204L, Algorithms, both, 4, A2|TA2, L7|L19\nBMAT202L, Discrete Mathematics, theory, 3, F2|TF2, '} rows={4} /><div className="inline-actions"><button className="button button-primary button-small" onClick={importPasted}>Import rows</button><button className="text-button" onClick={() => setShowPaste(false)}>Cancel</button></div></section>}
    <div className="course-toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" /></div><span>{courses.length} course{courses.length === 1 ? '' : 's'} in this plan</span></div>
    {!courses.length ? <EmptyState icon={<BookOpen size={22} />} title="Your course list is empty" description="Start with the subjects you intend to register for, or load the legible reference courses from the screenshot." action={<><button className="button button-primary" onClick={() => setEditing(emptyCourse())}><Plus size={16} /> Add first course</button><button className="button button-quiet" onClick={onLoadDemo}><Sparkles size={16} /> Load reference plan</button></>} /> : <div className="course-list">{filtered.map((course) => <CourseCard key={course.id} course={course} onEdit={() => setEditing(course)} onDuplicate={() => duplicateCourse(course)} onDelete={() => deleteCourse(course.id)} />)}</div>}
    {courses.length > 0 && !filtered.length && <EmptyState icon={<Search size={22} />} title="No matching courses" description="Try a course code or a broader name." />}
    {editing && <CourseEditor course={editing} onSave={saveCourse} onCancel={() => setEditing(null)} />}
  </div>;
}

function CourseCard({ course, onEdit, onDuplicate, onDelete }: { course: Course; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  const typeLabel = course.type === 'both' ? 'Theory + lab' : course.type === 'theory' ? 'Theory' : 'Laboratory';
  return <article className="course-row"><div className="course-avatar">{course.code.slice(0, 2) || '—'}</div><div className="course-main"><div className="course-title-line"><strong>{course.code || 'Untitled course'}</strong><span className="course-type">{typeLabel}</span>{course.mandatory ? <span className="tiny-tag">Core</span> : <span className="tiny-tag elective">Elective</span>}</div><h3>{course.name || 'Add a course name'}</h3><div className="course-meta"><span>{course.credits} credits</span>{course.faculty && <span>{course.faculty}</span>}<span>{assignmentSummary(course)}</span></div></div><div className="course-slot-summary"><span className={course.theorySlot ? 'assigned' : ''}>T {course.theorySlot || '—'}</span>{(course.type === 'lab' || course.type === 'both') && <span className={course.labSlot ? 'assigned lab' : ''}>L {course.labSlot || '—'}</span>}</div><div className="row-actions"><button className="icon-button" aria-label={`Edit ${course.code}`} onClick={onEdit}><Pencil size={16} /></button><button className="icon-button" aria-label={`More actions for ${course.code}`} onClick={() => setMenu((value) => !value)}><MoreHorizontal size={17} /></button>{menu && <div className="action-menu"><button onClick={onDuplicate}><Copy size={15} /> Duplicate</button><button className="danger-text" onClick={onDelete}><Trash2 size={15} /> Delete</button></div>}</div></article>;
}

function CourseEditor({ course: initialCourse, onSave, onCancel }: { course: Course; onSave: (course: Course) => void; onCancel: () => void }) {
  const [course, setCourse] = useState(initialCourse);
  const update = <K extends keyof Course>(key: K, value: Course[K]) => setCourse((current) => ({ ...current, [key]: value }));
  const slotList = (value: string) => value.split(',').map((slot) => slot.trim().toUpperCase()).filter(Boolean);
  const hasTheory = course.type === 'theory' || course.type === 'both';
  const hasLab = course.type === 'lab' || course.type === 'both';
  return <div className="editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="course-editor" role="dialog" aria-modal="true" aria-labelledby="course-editor-title"><div className="editor-heading"><div><div className="side-label">COURSE RECORD</div><h2 id="course-editor-title">{initialCourse.code ? 'Edit course' : 'Add a course'}</h2></div><button className="icon-button" onClick={onCancel} aria-label="Close editor"><X size={18} /></button></div><div className="form-grid"><label>Course code<input autoFocus value={course.code} onChange={(event) => update('code', event.target.value.toUpperCase())} placeholder="BCSE204L" /></label><label>Course name<input value={course.name} onChange={(event) => update('name', event.target.value)} placeholder="Design & Analysis of Algorithms" /></label><label>Course type<select value={course.type} onChange={(event) => update('type', event.target.value as CourseType)}><option value="theory">Theory</option><option value="lab">Laboratory</option><option value="both">Theory + lab</option></select></label><label>Credits<input type="number" min="1" max="10" value={course.credits} onChange={(event) => update('credits', Number(event.target.value) || 0)} /></label><label>Faculty / room<input value={course.faculty} onChange={(event) => update('faculty', event.target.value)} placeholder="Optional" /></label><label className="checkbox-label"><input type="checkbox" checked={course.mandatory} onChange={(event) => update('mandatory', event.target.checked)} /><span>Core / mandatory course</span></label></div><div className="form-section"><div className="form-section-heading"><div><h3>Eligible slots</h3><p>Keep the options you want the generator to explore. Comma-separated values are fine.</p></div><CircleHelp size={17} className="muted-icon" /></div><div className="form-grid">{hasTheory && <label>Theory options<input value={course.availableTheorySlots.join(', ')} onChange={(event) => update('availableTheorySlots', slotList(event.target.value))} placeholder="A2, TA2" /><small>Example: A2 · Mon 14:00, Wed 14:55</small></label>}{hasLab && <label>Lab options<input value={course.availableLabSlots.join(', ')} onChange={(event) => update('availableLabSlots', slotList(event.target.value))} placeholder="L7, L19" /><small>Each lab choice occupies two periods.</small></label>}{hasTheory && <SlotSelect label="Selected theory slot" value={course.theorySlot} options={course.availableTheorySlots} onChange={(value) => update('theorySlot', value || undefined)} type="theory" />}{hasLab && <SlotSelect label="Selected lab slot" value={course.labSlot} options={course.availableLabSlots} onChange={(value) => update('labSlot', value || undefined)} type="lab" />}</div></div><div className="form-section"><div className="form-grid"><label>Preferred slots<input value={course.preferredSlots.join(', ')} onChange={(event) => update('preferredSlots', slotList(event.target.value))} placeholder="A2, L7" /><small>Used as a gentle ranking preference, never a hard constraint.</small></label><label>Notes<textarea value={course.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Registration notes, faculty, or section reminders" rows={3} /></label></div></div><div className="editor-actions"><button className="button button-quiet" onClick={onCancel}>Cancel</button><button className="button button-primary" onClick={() => onSave(course)} disabled={!course.code.trim()}><Save size={16} /> Save course</button></div></section></div>;
}

function SlotSelect({ label, value, options, onChange, type }: { label: string; value?: string; options: string[]; onChange: (value: string) => void; type: ComponentType }) {
  const source = type === 'theory' ? THEORY_SLOTS : LAB_SLOTS;
  return <label>{label}<select value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">Unassigned</option>{options.map((code) => { const slot = source.find((item) => item.slotCode === code); return <option key={code} value={code}>{code} · {slot ? formatSlotMeeting(slot) : 'Unknown slot'}</option>; })}</select><small>{value ? (source.find((slot) => slot.slotCode === value)?.verified ? 'Verified against the reference grid.' : 'Needs manual verification.') : 'Choose after confirming the available options.'}</small></label>;
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p>{action && <div className="inline-actions">{action}</div>}</div>;
}

function PlannerView({ courses, updateCourses, conflicts, issues, onGenerate }: { courses: Course[]; updateCourses: (courses: Course[]) => void; conflicts: ReturnType<typeof detectConflicts>; issues: string[]; onGenerate: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = courses.filter((course) => `${course.code} ${course.name}`.toLowerCase().includes(search.toLowerCase()));
  const assign = (course: Course, component: ComponentType, slotCode: string) => {
    const next = component === 'theory' ? { ...course, theorySlot: slotCode } : { ...course, labSlot: slotCode };
    updateCourses(courses.map((item) => item.id === course.id ? next : item));
  };
  return <div className="planner-view">
    <PageIntro eyebrow="SLOT PLANNER" title="Trace every choice before it reaches your week." description="Selected slots are live. The moment a choice crosses another block, the planner tells you exactly where the overlap happens." actions={<><div className="search-field compact-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a course" /></div><button className="button button-primary" onClick={onGenerate}><WandSparkles size={16} /> Find feasible routes</button></>} />
    {conflicts.length > 0 && <div className="alert-banner danger"><AlertTriangle size={18} /><div><strong>{conflicts.length} clash{conflicts.length === 1 ? '' : 'es'} in the current assignment</strong><span>{conflicts.slice(0, 2).map((conflict) => conflict.message).join(' ')}</span></div></div>}
    {issues.length > 0 && <div className="alert-banner warning"><CircleHelp size={18} /><div><strong>{issues.length} mapping check{issues.length === 1 ? '' : 's'} needed</strong><span>{issues.slice(0, 2).join(' ')}</span></div></div>}
    {!courses.length ? <EmptyState icon={<SlidersHorizontal size={22} />} title="There is nothing to place yet" description="Add courses first, then return here to explore their eligible theory and lab choices." /> : <div className="planner-list">{filtered.map((course) => <PlannerCourse key={course.id} course={course} allCourses={courses} onAssign={assign} />)}</div>}
  </div>;
}

function PlannerCourse({ course, allCourses, onAssign }: { course: Course; allCourses: Course[]; onAssign: (course: Course, component: ComponentType, slotCode: string) => void }) {
  const hasTheory = course.type === 'theory' || course.type === 'both';
  const hasLab = course.type === 'lab' || course.type === 'both';
  return <article className="planner-course panel"><div className="planner-course-head"><div className="course-avatar small">{course.code.slice(0, 2) || '—'}</div><div><div className="course-title-line"><strong>{course.code || 'Untitled course'}</strong>{course.mandatory && <span className="tiny-tag">Core</span>}</div><h3>{course.name || 'Name this course'}</h3></div><div className="planner-current">{assignmentSummary(course)}</div></div><div className="slot-lanes">{hasTheory && <SlotLane label="Theory" component="theory" selected={course.theorySlot} options={course.availableTheorySlots} allCourses={allCourses} course={course} onAssign={onAssign} />}{hasLab && <SlotLane label="Laboratory · 2 periods" component="lab" selected={course.labSlot} options={course.availableLabSlots} allCourses={allCourses} course={course} onAssign={onAssign} />}</div></article>;
}

function SlotLane({ label, component, selected, options, allCourses, course, onAssign }: { label: string; component: ComponentType; selected?: string; options: string[]; allCourses: Course[]; course: Course; onAssign: (course: Course, component: ComponentType, slotCode: string) => void }) {
  const source = component === 'theory' ? THEORY_SLOTS : LAB_SLOTS;
  const choices = Array.from(new Set([selected, ...options].filter(Boolean) as string[]));
  return <div className="slot-lane"><div className="lane-label"><span className={`component-dot ${component}`} />{label}<small>{choices.length} option{choices.length === 1 ? '' : 's'}</small></div><div className="slot-options">{choices.length ? choices.map((code) => { const slot = source.find((item) => item.slotCode === code); const next = component === 'theory' ? { ...course, theorySlot: code } : { ...course, labSlot: code }; const choiceConflicts = detectConflicts(allCourses.map((item) => item.id === course.id ? next : item)).filter((conflict) => conflict.first.courseId === course.id || conflict.second.courseId === course.id); const invalid = !slot?.verified || !slot.meetings.length; return <button key={code} className={`slot-option ${selected === code ? 'selected' : ''} ${choiceConflicts.length ? 'conflict' : ''} ${invalid ? 'unverified' : ''}`} onClick={() => !invalid && onAssign(course, component, code)} title={choiceConflicts.map((conflict) => conflict.message).join('\n') || slot?.verificationNote || ''}><div><strong>{code}</strong>{selected === code && <CheckCircle2 size={14} />}</div><span>{slot ? formatSlotMeeting(slot) : 'Unknown mapping'}</span>{choiceConflicts.length ? <em><AlertTriangle size={12} /> {choiceConflicts.length} clash</em> : invalid ? <em><CircleHelp size={12} /> Verify mapping</em> : <em className="slot-good">Available</em>}</button>; }) : <div className="lane-empty">No eligible {component} slots listed. Add them from My courses.</div>}</div></div>;
}

function TimetableView({ courses, conflicts, onSelectSlot, onEdit, onExport, onPrint }: { courses: Course[]; conflicts: ReturnType<typeof detectConflicts>; onSelectSlot: (courseId: string, component: ComponentType, slotCode: string) => void; onEdit: () => void; onExport: () => void; onPrint: () => void }) {
  const [mode, setMode] = useState<'week' | 'compact' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<Day>('MON');
  return <div className="timetable-view"><PageIntro eyebrow="WEEKLY TIMETABLE" title="See the week as a real route." description="Click a theory or lab cell below to assign it to the selected course. Labs are rendered as one logical two-period session, while both source cells remain visible." actions={<><button className="button button-secondary" onClick={onExport}><Download size={16} /> Export .ics</button><button className="button button-secondary" onClick={onPrint}><FileDown size={16} /> Print / PDF</button><button className="button button-primary" onClick={onEdit}><Pencil size={16} /> Edit slots</button></>} /><InteractiveSlotChart courses={courses} conflicts={conflicts} onSelectSlot={onSelectSlot} /> <div className="view-toolbar"><div className="segmented-control"><button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Week</button><button className={mode === 'compact' ? 'active' : ''} onClick={() => setMode('compact')}>Compact</button><button className={mode === 'day' ? 'active' : ''} onClick={() => setMode('day')}>Day</button></div>{mode === 'day' && <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as Day)}>{DAYS.map((day) => <option key={day} value={day}>{labelDay(day)}</option>)}</select>}<div className="legend"><span><i className="legend-pip theory" /> Theory</span><span><i className="legend-pip lab" /> Lab · 2 periods</span><span><i className="legend-pip conflict" /> Clash</span></div></div>{conflicts.length > 0 && <div className="alert-banner danger compact-alert"><AlertTriangle size={17} /><span>{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} currently visible in the grid.</span></div>}<TimetableGrid courses={courses} conflicts={conflicts} mode={mode} selectedDay={selectedDay} /></div>;
}

function InteractiveSlotChart({ courses, conflicts, onSelectSlot }: { courses: Course[]; conflicts: ReturnType<typeof detectConflicts>; onSelectSlot: (courseId: string, component: ComponentType, slotCode: string) => void }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const course = courses.find((item) => item.id === courseId);
  const assigned = course ? blocksForCourse(course).length : 0;
  const isEligible = (component: ComponentType, code: string) => {
    if (!course) return false;
    const list = component === 'theory' ? course.availableTheorySlots : course.availableLabSlots;
    return list.includes(code) || (component === 'theory' ? course.theorySlot === code : course.labSlot === code);
  };
  const isSelected = (component: ComponentType, code: string) => component === 'theory' ? course?.theorySlot === code : canonicalLabSlot(course?.labSlot) === canonicalLabSlot(code);
  const isConflicting = (component: ComponentType, code: string) => {
    if (!course) return false;
    const next = component === 'theory' ? { ...course, theorySlot: code } : { ...course, labSlot: canonicalLabSlot(code) };
    return detectConflicts(courses.map((item) => item.id === course.id ? next : item)).some((conflict) => conflict.first.courseId === course.id || conflict.second.courseId === course.id);
  };
  const chartPeriods = [...PERIODS.slice(0, 6).map((period) => period.index), 'Lunch', ...PERIODS.slice(6).map((period) => period.index)];
  const renderCells = (day: Day, component: ComponentType) => {
    const grid = component === 'theory' ? THEORY_GRID[day] : LAB_GRID[day];
    const cells = (codes: (string | null)[], offset: number) => codes.map((code, index) => <SlotCell key={`${day}-${component}-${index + offset}`} day={day} code={code} component={component} periodIndex={index + offset + 1} course={course!} eligible={Boolean(code && isEligible(component, code))} selected={Boolean(code && isSelected(component, code))} conflict={Boolean(code && isConflicting(component, code))} onSelect={onSelectSlot} />);
    return <>{cells(grid.slice(0, 6), 0)}<div className="slot-cell unavailable" title="Lunch is not schedulable">Lunch</div>{cells(grid.slice(6), 6)}</>;
  };
  return <section className="interactive-chart panel"><div className="panel-heading"><div><h2>Click-to-select slot chart</h2><p>Theory and lab cells share the official horizontal period positions. Choose a course, then click an eligible slot.</p></div><div className="chart-status"><span className="save-dot" /> {assigned ? `${assigned} blocks assigned` : 'Ready to assign'}</div></div><div className="chart-controls"><label>Assign slots to<select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choose a course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><div className="chart-conflict-count"><AlertTriangle size={15} /> {conflicts.length} active conflict{conflicts.length === 1 ? '' : 's'}</div></div>{!course ? <div className="chart-empty"><CircleHelp size={18} /> Add a course with eligible slots, then choose it here.</div> : <div className="slot-chart-scroll"><div className="slot-chart" style={{ gridTemplateColumns: '78px 72px repeat(13, minmax(76px, 1fr))' }}><div className="chart-corner" /><div className="chart-corner">ROW</div>{chartPeriods.map((period) => <div key={String(period)} className={`chart-period ${period === 'Lunch' ? 'lunch' : ''}`}>{period === 'Lunch' ? 'Lunch' : `P${period}`}</div>)}{DAYS.map((day) => <div className="chart-day-group" key={day}><div className="chart-day-label">{labelDay(day)}</div><div className="chart-row-label theory-label">THEORY</div>{renderCells(day, 'theory')}<div className="chart-row-label lab-label">LAB</div>{renderCells(day, 'lab')}</div>)}</div></div>}</section>;
}

function SlotCell({ day, code, component, periodIndex, course, eligible, selected, conflict, onSelect }: { day: Day; code: string | null; component: ComponentType; periodIndex: number; course: Course; eligible: boolean; selected: boolean; conflict: boolean; onSelect: (courseId: string, component: ComponentType, slotCode: string) => void }) {
  const slot = code ? getSlot(component, code) : undefined;
  const title = slot ? `${labelDay(day)} · ${code} · ${slot.meetings[0]?.start}–${slot.meetings[0]?.end}${component === 'lab' ? ' · two periods' : ''}${conflict ? ' · conflicts with another selection' : ''}` : 'Lunch or unavailable period';
  if (!code) return <div className="slot-cell unavailable" title={title}>—</div>;
  return <button type="button" className={`slot-cell ${component} ${eligible ? 'eligible' : 'locked'} ${selected ? 'selected' : ''} ${conflict ? 'conflict' : ''}`} disabled={!eligible || !slot?.verified} aria-pressed={selected} aria-label={`${code}, ${component}, ${labelDay(day)}, period ${periodIndex}${selected ? ', selected' : ''}${conflict ? ', conflict' : ''}`} title={title} onClick={() => onSelect(course.id, component, code)}>{code}{component === 'lab' && selected && <span className="lab-session-marker">2P</span>}</button>;
}

function TimetableGrid({ courses, conflicts, mode, selectedDay }: { courses: Course[]; conflicts: ReturnType<typeof detectConflicts>; mode: 'week' | 'compact' | 'day'; selectedDay: Day }) {
  const days = mode === 'day' ? [selectedDay] : DAYS;
  const blocks = courses.flatMap(blocksForCourse);
  const hasConflict = (block: ScheduleBlock) => conflicts.some((conflict) => (conflict.first.courseId === block.courseId && conflict.first.slotCode === block.slotCode && conflict.first.meeting.day === block.meeting.day) || (conflict.second.courseId === block.courseId && conflict.second.slotCode === block.slotCode && conflict.second.meeting.day === block.meeting.day));
  const rows = [...PERIODS.slice(0, 6), { index: 0, label: 'Lunch', theory: { start: 'Lunch', end: 'Lunch' }, lab: { start: 'Lunch', end: 'Lunch' } }, ...PERIODS.slice(6)];
  return <div className={`timetable-grid-wrap ${mode === 'compact' ? 'compact-grid' : ''}`}><div className="timetable-grid" style={{ gridTemplateColumns: `78px repeat(${days.length}, minmax(${mode === 'compact' ? 112 : 148}px, 1fr))` }}><div className="grid-corner">PERIOD</div>{days.map((day) => <div key={day} className="day-header"><span>{labelDay(day)}</span><small>{blocks.filter((block) => block.meeting.day === day).length} blocks</small></div>)}<div className="time-rail">{rows.map((row) => <div key={row.label} className={`time-cell ${row.label === 'Lunch' ? 'lunch-cell' : ''}`}><strong>{row.label}</strong><span>{row.label === 'Lunch' ? 'break' : `${row.theory.start}–${row.theory.end}`}</span></div>)}</div>{days.map((day) => <div className="day-column" key={day}>{rows.map((row) => <div key={row.label} className={`grid-slot ${row.label === 'Lunch' ? 'lunch-slot' : ''}`} />)}{blocks.filter((block) => block.meeting.day === day).map((block) => { const row = block.meeting.periodIndex + (block.meeting.periodIndex > 6 ? 1 : 0); return <div key={`${block.courseId}-${block.component}-${block.slotCode}-${day}`} className={`schedule-block ${block.component} ${hasConflict(block) ? 'has-conflict' : ''}`} style={{ gridRow: `${row} / span ${block.durationPeriods}` }} title={`${block.courseCode} · ${block.slotCode} · ${block.meeting.start}–${block.meeting.end}`}><strong>{block.courseCode}</strong><span>{block.courseName}</span><small>{block.slotCode} · {block.meeting.start}</small></div>; })}</div>)}</div>{!blocks.length && <div className="grid-empty"><CalendarDays size={22} /><strong>No classes in the grid yet</strong><span>Assign slots from the planner to see your week.</span></div>}</div>;
}

function CompareView({ result, onGenerate, onApply, isGenerating, preferences, updatePreferences, courses }: { result: ReturnType<typeof generateSchedules> | null; onGenerate: () => void; onApply: (schedule: GeneratedSchedule) => void; isGenerating: boolean; preferences: Preferences; updatePreferences: (preferences: Partial<Preferences>) => void; courses: Course[] }) {
  const [sort, setSort] = useState<'score' | 'gaps' | 'freeDays' | 'latest' | 'earliest'>('score');
  const schedules = useMemo(() => {
    const items = [...(result?.schedules ?? [])];
    if (sort === 'gaps') return items.sort((a, b) => a.metrics.totalGaps - b.metrics.totalGaps);
    if (sort === 'freeDays') return items.sort((a, b) => b.metrics.freeDays - a.metrics.freeDays);
    if (sort === 'latest') return items.sort((a, b) => timeToMinutes(b.metrics.earliestStart === '—' ? '00:00' : b.metrics.earliestStart) - timeToMinutes(a.metrics.earliestStart === '—' ? '00:00' : a.metrics.earliestStart));
    if (sort === 'earliest') return items.sort((a, b) => timeToMinutes(a.metrics.latestFinish === '—' ? '23:59' : a.metrics.latestFinish) - timeToMinutes(b.metrics.latestFinish === '—' ? '23:59' : b.metrics.latestFinish));
    return items.sort((a, b) => b.score - a.score);
  }, [result, sort]);
  return <div className="compare-view"><PageIntro eyebrow="ROUTE COMPARISON" title="Choose the shape of your week." description="The generator explores eligible slots with bounded backtracking. These are heuristic routes, not a claim of global optimality." actions={<button className="button button-primary" onClick={onGenerate} disabled={isGenerating}><WandSparkles size={16} /> {isGenerating ? 'Searching…' : 'Generate schedules'}</button>} />
    <div className="compare-layout"><div className="compare-main">{!result ? <EmptyState icon={<GitCompare size={22} />} title="No routes generated yet" description={courses.length ? 'Let the search run through the current course options, then compare the clash-free combinations.' : 'Add courses before asking the generator to search.'} action={<button className="button button-primary" onClick={onGenerate}><WandSparkles size={16} /> Start route search</button>} /> : <><div className="compare-toolbar"><div><strong>{result.schedules.length}</strong> feasible route{result.schedules.length === 1 ? '' : 's'}<span className="toolbar-meta"> · {result.nodesVisited.toLocaleString()} nodes checked{result.truncated ? ' · search limit reached' : ''}</span></div><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort schedules"><option value="score">Best overall</option><option value="gaps">Fewest gaps</option><option value="freeDays">Most free days</option><option value="latest">Latest start</option><option value="earliest">Earliest finish</option></select></div>{result.errors.length > 0 && <div className="alert-banner warning compact-alert"><CircleHelp size={17} /><span>{result.errors.join(' ')}</span></div>}{!result.schedules.length ? <EmptyState icon={<AlertTriangle size={22} />} title="No feasible route found" description="Try widening at least one course's eligible slot list, or exclude electives from the generator preferences." /> : <div className="schedule-list">{schedules.map((schedule, index) => <ScheduleCard key={schedule.id} schedule={schedule} rank={index + 1} onApply={() => onApply(schedule)} />)}</div>}</>}</div><PreferencesPanel preferences={preferences} updatePreferences={updatePreferences} /></div>
  </div>;
}

function ScheduleCard({ schedule, rank, onApply }: { schedule: GeneratedSchedule; rank: number; onApply: () => void }) {
  const metrics = schedule.metrics;
  return <article className={`schedule-card ${rank === 1 ? 'recommended' : ''}`}><div className="schedule-rank">{rank === 1 ? <Sparkles size={16} /> : `0${Math.min(rank, 9)}`}<span>{rank === 1 ? 'Recommended' : 'Route'}</span></div><div className="schedule-card-main"><div className="schedule-card-title"><div><h2>{rank === 1 ? 'The balanced route' : `Alternative route ${rank}`}</h2><p>{schedule.courses.length} courses · {metrics.occupiedDays} active days · {metrics.clashCount ? `${metrics.clashCount} clashes` : 'clash-free'}</p></div><div className="score-badge"><strong>{Math.round(schedule.score)}</strong><span>score</span></div></div><div className="schedule-metrics"><span><Clock3 size={15} /><strong>{metrics.earliestStart}</strong><small>starts</small></span><span><Clock3 size={15} /><strong>{metrics.latestFinish}</strong><small>finishes</small></span><span><CalendarDays size={15} /><strong>{metrics.freeDays}</strong><small>free days</small></span><span><SlidersHorizontal size={15} /><strong>{Math.round(metrics.totalGaps / 60 * 10) / 10}h</strong><small>gaps</small></span><span><FlaskConical size={15} /><strong>{metrics.weekendClasses}</strong><small>weekend</small></span></div><div className="route-chips">{schedule.courses.slice(0, 6).map((course) => <span key={course.id}>{course.code} <b>{assignmentSummary(course)}</b></span>)}{schedule.courses.length > 6 && <span>+{schedule.courses.length - 6} more</span>}</div></div><button className="button button-secondary apply-button" onClick={onApply}>Apply route <ArrowUpRight size={15} /></button></article>;
}

function PreferencesPanel({ preferences, updatePreferences }: { preferences: Preferences; updatePreferences: (preferences: Partial<Preferences>) => void }) {
  const toggle = (key: keyof Preferences) => updatePreferences({ [key]: !preferences[key] } as Partial<Preferences>);
  return <aside className="preferences-panel panel"><div className="panel-heading"><div><h2>Route preferences</h2><p>Adjust the heuristic, then regenerate.</p></div><SlidersHorizontal size={18} className="muted-icon" /></div><div className="preference-group"><div className="side-label">AVOID</div><ToggleRow label="08:00 starts" checked={preferences.avoidEarly} onChange={() => toggle('avoidEarly')} /><ToggleRow label="Classes after 17:00" checked={preferences.avoidLate} onChange={() => toggle('avoidLate')} /><ToggleRow label="Weekend classes" checked={preferences.avoidWeekend} onChange={() => toggle('avoidWeekend')} /></div><div className="preference-group"><div className="side-label">SHAPE</div><ToggleRow label="Compact days" checked={preferences.compactDays} onChange={() => toggle('compactDays')} /><ToggleRow label="Maximize free days" checked={preferences.maximizeFreeDays} onChange={() => toggle('maximizeFreeDays')} /><ToggleRow label="Balance workload" checked={preferences.balanceWorkload} onChange={() => toggle('balanceWorkload')} /></div><div className="preference-group"><div className="side-label">ANCHORS</div><ToggleRow label="Prefer free Monday" checked={preferences.preferFreeMonday} onChange={() => toggle('preferFreeMonday')} /><ToggleRow label="Prefer free Friday" checked={preferences.preferFreeFriday} onChange={() => toggle('preferFreeFriday')} /></div><div className="preference-group"><div className="side-label">COURSE SET</div><ToggleRow label="Include electives" checked={preferences.includeElectives} onChange={() => toggle('includeElectives')} /></div><div className="score-explainer"><Sparkles size={16} /><div><strong>How score works</strong><p>Fewer gaps, later starts, more free days, and fewer weekend blocks raise the score. Slot preferences add a small bonus.</p></div></div></aside>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <label className="toggle-row"><span>{label}</span><button type="button" aria-pressed={checked} className={`toggle ${checked ? 'on' : ''}`} onClick={onChange}><i /></button></label>;
}

function ReferenceView() {
  return <div className="reference-view"><PageIntro eyebrow="SOURCE OF TRUTH" title="Slot reference, without the guesswork." description="The initial dataset follows the supplied VIT Chennai timetable image. Theory and laboratory namespaces stay separate, including their slight timing differences." actions={<div className="source-pill"><span className="save-dot" /> Screenshot mapping loaded</div>} /><section className="panel timing-panel"><div className="panel-heading"><div><h2>Period timing</h2><p>These are the intervals used by the conflict engine.</p></div><Clock3 size={18} className="muted-icon" /></div><div className="table-scroll"><table><thead><tr><th>Period</th><th>Theory</th><th>Laboratory</th><th>Boundary</th></tr></thead><tbody>{PERIODS.slice(0, 6).map((period) => <tr key={period.index}><td>P{period.index}</td><td>{period.theory.start}–{period.theory.end}</td><td>{period.lab.start}–{period.lab.end}</td><td>Before lunch</td></tr>)}<tr className="lunch-row"><td>—</td><td>Lunch</td><td>Lunch</td><td>Non-schedulable</td></tr>{PERIODS.slice(6).map((period) => <tr key={period.index}><td>P{period.index}</td><td>{period.theory.start}–{period.theory.end}</td><td>{period.lab.start}–{period.lab.end}</td><td>After lunch</td></tr>)}</tbody></table></div></section><section className="panel mapping-panel"><div className="panel-heading"><div><h2>Monday–Sunday mapping</h2><p>The source image has two visible rows per day. A lab slot is a starting period and occupies the following period as one session.</p></div><Table2 size={18} className="muted-icon" /></div><div className="table-scroll"><table className="mapping-table"><thead><tr><th>Day</th><th>Row</th>{PERIODS.map((period) => <th key={period.index}>P{period.index}</th>)}</tr></thead><tbody>{DAYS.flatMap((day) => [<tr key={`${day}-theory`}><td rowSpan={2} className="day-cell">{labelDay(day)}</td><td className="row-label theory-label">Theory</td>{THEORY_GRID[day].map((slot, index) => <td key={`${day}-t-${index}`} className={REFERENCE_METADATA[`${day}-${index + 1}`] ? 'metadata-cell' : ''}>{slot ?? '—'}</td>)}</tr>, <tr key={`${day}-lab`}><td className="row-label lab-label">Lab</td>{LAB_GRID[day].map((slot, index) => <td key={`${day}-l-${index}`} className={UNVERIFIED_LAB_CODES.includes(slot ?? '') ? 'unverified-cell' : ''}>{slot ?? '—'}</td>)}</tr>])}</tbody></table></div><div className="reference-note"><CircleHelp size={16} /><span><strong>Manual verification queue:</strong> L61–L70 are not visible in the supplied image and are intentionally not generated as usable choices.</span></div></section><section className="reference-meta"><div><div className="legend-pip theory" /><strong>Theory metadata</strong><span>Course/room strings are preserved where legible in the source.</span></div><div><div className="legend-pip lab" /><strong>Lab metadata</strong><span>Repeated adjacent cells support the two-period session interpretation.</span></div><div><div className="legend-pip warning" /><strong>Unverified</strong><span>Unknown mappings stay visible and rejectable.</span></div></section></div>;
}

function SettingsView({ plan, plans, updatePreferences, onRename, onDuplicate, onDelete, onExportJson, onImport, onExportCourses, onExportSchedule, onExportIcs, onReset }: { plan: Plan; plans: Plan[]; updatePreferences: (preferences: Partial<Preferences>) => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void; onExportJson: () => void; onImport: (file: File) => void; onExportCourses: () => void; onExportSchedule: () => void; onExportIcs: () => void; onReset: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return <div className="settings-view"><PageIntro eyebrow="WORKSPACE SETTINGS" title="Keep the plan portable." description="Everything stays in this browser unless you export it. Use named plans to explore without losing the current semester shape." actions={<button className="button button-primary" onClick={onExportJson}><FileJson size={16} /> Export plan JSON</button>} /><div className="settings-grid"><section className="panel settings-section"><div className="panel-heading"><div><h2>{plan.name}</h2><p>{plans.length} saved plan{plans.length === 1 ? '' : 's'} · updated {new Date(plan.updatedAt).toLocaleDateString()}</p></div><Save size={18} className="muted-icon" /></div><div className="settings-actions"><button className="button button-secondary" onClick={onRename}><Pencil size={15} /> Rename</button><button className="button button-secondary" onClick={onDuplicate}><Copy size={15} /> Duplicate</button><button className="button button-quiet danger-text" onClick={onDelete}><Trash2 size={15} /> Delete plan</button></div></section><section className="panel settings-section"><div className="panel-heading"><div><h2>Generator defaults</h2><p>These preferences shape the next search, not the conflict rules.</p></div><WandSparkles size={18} className="muted-icon" /></div><div className="settings-toggle-grid"><ToggleRow label="Avoid early classes" checked={plan.preferences.avoidEarly} onChange={() => updatePreferences({ avoidEarly: !plan.preferences.avoidEarly })} /><ToggleRow label="Avoid late classes" checked={plan.preferences.avoidLate} onChange={() => updatePreferences({ avoidLate: !plan.preferences.avoidLate })} /><ToggleRow label="Maximize free days" checked={plan.preferences.maximizeFreeDays} onChange={() => updatePreferences({ maximizeFreeDays: !plan.preferences.maximizeFreeDays })} /><ToggleRow label="Avoid weekends" checked={plan.preferences.avoidWeekend} onChange={() => updatePreferences({ avoidWeekend: !plan.preferences.avoidWeekend })} /></div></section><section className="panel settings-section"><div className="panel-heading"><div><h2>Take it elsewhere</h2><p>Use a format that fits the next step.</p></div><Download size={18} className="muted-icon" /></div><div className="export-grid"><button onClick={onExportCourses}><FileSpreadsheet size={17} /><span><strong>Courses CSV</strong><small>Course list and assignments</small></span><ChevronRight size={15} /></button><button onClick={onExportSchedule}><FileDown size={17} /><span><strong>Timetable CSV</strong><small>Slot assignment overview</small></span><ChevronRight size={15} /></button><button onClick={onExportIcs}><CalendarRange size={17} /><span><strong>Calendar .ics</strong><small>Recurring weekly events</small></span><ChevronRight size={15} /></button></div></section><section className="panel settings-section"><div className="panel-heading"><div><h2>Restore & reset</h2><p>Import a JSON snapshot exported from this planner.</p></div><RotateCcw size={18} className="muted-icon" /></div><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.currentTarget.value = ''; }} /><div className="settings-actions"><button className="button button-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</button><button className="button button-quiet danger-text" onClick={onReset}><RotateCcw size={15} /> Reset local data</button></div></section></div></div>;
}

export default App;
