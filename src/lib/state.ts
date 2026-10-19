import { createReactiveState } from './reactive-state';
import { browser } from '#lib/environment';
import { TODAY, diffD, iso, parse, uid } from '../core/utils';
import { PCOLORS, TEAMS_SEED } from '../core/constants';
import { seed } from '../data/seed';
import { getIdentity } from './api';

export const STORE_KEY = 'gr8r.v2';
export const DEFAULT_PREFS = {
  theme: 'system',
  accent: 'indigo',
  side: 'comfortable',
  density: 'comfortable',
  weekStart: 6,
  dateFmt: 'MMM d',
  lang: 'fa-IR',
  tz: 'Asia/Tehran',
  motion: 'system',
  home: 'home',
  openTasks: 'drawer',
  name: 'مهدی رضایی',
  title: 'مدیر محصول',
};

export function load() {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      if (j && j.data && j.data.tasks) return j;
    }
  } catch {
    /* storage blocked or corrupt: start from seed data */
  }
  return null;
}

const saved = browser ? load() : null;

/** Skeleton the API hydrate() fills in; seed-shaped so every lookup is safe. */
function skeletonData() {
  const d = seed();
  d.projects = [];
  d.tasks = [];
  d.members = [];
  d.comments = [];
  d.activity = [];
  d.files = [];
  d.savedViews = [];
  d.projOrder = [];
  d.me = '';
  return d;
}

export interface Prefs extends Record<string, any> {
  theme: string;
  accent: string;
  side: string;
  density: string;
  weekStart: number;
  dateFmt: string;
  lang: string;
  tz: string;
  motion: string;
  home: string;
  openTasks: string;
  name: string;
  title: string;
}

export interface ViewState {
  filters: Array<Record<string, any>>;
  sort: { f: string; dir: number };
  group: string;
  q: string;
  hidden: string[];
  colW: Record<string, any>;
  showDone: boolean;
  [key: string]: any;
}

export interface HistoryEntry {
  route: string;
  params: Record<string, string>;
}

/* Ephemeral + persisted UI state. Known fields are typed; overlays and
   plugins attach extras (af, uploads, mention, …) via the index signature. */
export interface UIState {
  fx: Record<string, any>;
  auth: string | null;
  authStep: string;
  onb: number;
  onbData: Record<string, any>;
  route: string;
  params: Record<string, string>;
  history: HistoryEntry[];
  collapsed: boolean;
  mnav: boolean;
  expanded: Record<string, boolean>;
  drawer: string | null;
  drawerFull: boolean;
  drawerTab: string;
  modals: Array<Record<string, any>>;
  pop: Record<string, any> | null;
  palette: Record<string, any> | null;
  loading: boolean;
  offline: boolean;
  /** Hydration failure: the layout shows a blocking takeover, no data. */
  bootFailed: boolean;
  sel: Set<string>;
  composer: Record<string, any> | null;
  editCell: Record<string, any> | null;
  openTasks: Record<string, boolean>;
  collapsedGroups: Record<string, boolean>;
  calDate: string;
  calMode: string;
  tlZoom: string;
  tlGroup: string;
  fileView: string;
  projView: string;
  homeTab: string;
  inboxCat: string;
  inboxUnread: boolean;
  inboxSel: string | null;
  notifFilter: string;
  settings: string;
  searchQ: string;
  searchCat: string;
  myView: string;
  membersTab: string;
  collapsedCols: Record<string, boolean>;
  errors: Record<string, any>;
  drafts: Record<string, any>;
  /** Detail of the hydration failure shown on the boot-failed takeover. */
  bootError: string;
  [key: string]: any;
}

export interface AppState {
  // Workspace domain data (seed-shaped; loose by design, see README).
  data: any;
  prefs: Prefs;
  views: Record<string, ViewState>;
  ui: UIState;
}

function initialState() {
  // Live mode: an API identity is configured → start from a skeleton and
  // hydrate from the API (layout onMount). Demo mode (no identity): the
  // localStorage snapshot or seed data runs as before.
  const live = browser && !!getIdentity().userId;
  const data = saved?.data && !live ? saved.data : live ? skeletonData() : seed();
  // Lazy seeders (`teamsList`, palette recents) used to create these during
  // render; create them up front so templates never mutate state.
  if (!data.teams) data.teams = TEAMS_SEED.map(t => ({ ...t }));
  if (!data.recentSearches) data.recentSearches = [];
  if (!data.savedViews) data.savedViews = [];
  return {
    data,
    prefs: Object.assign(
      {},
      DEFAULT_PREFS,
      saved?.prefs || {},
      { lang: 'fa-IR', localeVersion: 1 },
      saved?.prefs?.localeVersion ? {} : { weekStart: 6, tz: 'Asia/Tehran', dateFmt: 'MMM d' },
    ),
    views: saved?.views || {},
    ui: {
      fx: {},
      auth: null,
      authStep: 'login',
      onb: 0,
      onbData: { use: 'product', team: 'kanban', size: '2-10', ws: '', proj: 'راه‌اندازی وب‌سایت', tmpl: 'web', invites: '' },
      route: 'home',
      params: {},
      history: [],
      collapsed: !!saved?.collapsed,
      mnav: false,
      expanded: { p1: true },
      drawer: null,
      drawerFull: false,
      drawerTab: 'comments',
      modals: [],
      pop: null,
      palette: null,
      // In live mode the layout shows the skeleton until hydrate settles.
      loading: live,
      offline: false,
      bootFailed: false,
      bootError: '',
      demo: browser && !live,
      sel: new Set<string>(),
      composer: null,
      editCell: null,
      openTasks: {},
      collapsedGroups: {},
      calDate: iso(TODAY),
      calMode: 'month',
      tlZoom: 'week',
      tlGroup: 'status',
      fileView: 'grid',
      projView: 'grid',
      homeTab: 'upcoming',
      inboxCat: 'all',
      inboxUnread: false,
      inboxSel: null,
      notifFilter: 'all',
      settings: 'appearance',
      searchQ: '',
      searchCat: 'all',
      myView: 'list',
      membersTab: 'members',
      collapsedCols: {},
      errors: {},
      drafts: {},
    },
  };
}

/** TanStack Store subscription with a deep-mutation adapter for existing actions. */
const workspace = createReactiveState<AppState>(initialState());
export const S = workspace.state;
export const workspaceStore = workspace.store;
export const notifyWorkspace = workspace.notify;

export let _saveT;
export function save() {
  if (!browser) return;
  clearTimeout(_saveT);
  _saveT = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ data: S.data, prefs: S.prefs, views: S.views, collapsed: S.ui.collapsed }));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, 150);
}

/** Reset workspace to demo seed (used by settings danger zone + design states). */
export function resetWorkspace() {
  S.data = seed();
  S.views = {};
  save();
}

/* ---------- lookups ---------- */
export const D = () => S.data;
export const me = () => D().members.find(m => m.id === D().me);
export const mem = id => D().members.find(m => m.id === id);
export const proj = id => D().projects.find(p => p.id === id);
export const task = id => D().tasks.find(t => t.id === id);
export const pColor = p => PCOLORS[p?.color] || PCOLORS.slate;
export const visibleProjects = () =>
  D()
    .projOrder.map(proj)
    .filter(Boolean)
    .filter(p => !p.archived);
export const canSee = p => !p.private || p.members.includes(D().me);
export const tasksOf = pid => D().tasks.filter(t => t.project === pid && !t.archived);
export const allTasks = () => D().tasks.filter(t => !t.archived && canSee(proj(t.project)));
export const isOver = t => t.due && t.status !== 'done' && diffD(parse(t.due), TODAY) < 0;
export const commentsOf = tid => D().comments.filter(c => c.task === tid);
export function progressOf(pid) {
  const ts = tasksOf(pid);
  if (!ts.length) return 0;
  return Math.round((ts.filter(t => t.status === 'done').length / ts.length) * 100);
}
export function taskProg(t) {
  if (t.status === 'done') return 100;
  if (t.subtasks.length) return Math.round((t.subtasks.filter(s => s.done).length / t.subtasks.length) * 100);
  return { backlog: 0, todo: 5, progress: 45, review: 80 }[t.status] || 0;
}

/* ---------- activity + notification helpers ---------- */
export function logAct(verb, t, extra = '') {
  D().activity.unshift({ id: uid('a'), by: D().me, verb, task: t?.id || null, project: t?.project || null, at: Date.now(), extra });
  if (t) t.updated = Date.now();
}

/* ---------- teams (workspace data, seeded on first use) ---------- */
export const NO_TEAM = { id: '', name: 'بدون تیم', icon: 'users', c: '#8A867E', desc: '' };
export function teamsList() {
  const d = D();
  if (!d.teams) d.teams = TEAMS_SEED.map(t => ({ ...t }));
  return d.teams;
}
export function team(id) {
  return teamsList().find(t => t.id === id) || null;
}
export const TM = new Proxy({}, { get: (_, k) => team(k) || NO_TEAM });
