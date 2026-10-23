/* =====================================================================
   ADAPTER — taskmanager-api responses → UI store shapes (seed-compatible).

   The view layer (pages, view engine) is untouched; everything it needs
   is materialized here: display keys, canonical status ids, formatted
   estimates, label colors, avatar colors. Underscore-prefixed fields
   (`_statusId`, …) keep the server values the sync layer writes back.
   ===================================================================== */

import { PCOLORS, PICONS } from '../core/constants';
import { fileType, fsize } from '../ui/helpers';

/* ---------- primitives ---------- */

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic UI color for any server id. */
export function colorFor(id: string): string {
  const keys = Object.keys(PCOLORS);
  return PCOLORS[keys[hash(id) % keys.length]];
}

export function iconFor(id: string): string {
  return PICONS[hash(id) % PICONS.length];
}

/** Project display key: first letters of the name, like the seed's WEB/MOB. */
export function keyFor(name: string): string {
  const words = (name || 'Project').split(/\s+/);
  let k = words
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  if (k.length < 2)
    k =
      (name || '')
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'PRJ';
  return k;
}

/* ---------- dates: RFC3339 ↔ 'YYYY-MM-DD' ↔ ms ---------- */

export function tsToMs(v: string | null | undefined): number {
  return v ? Date.parse(v) || 0 : 0;
}

export function tsToDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date string (or null) → RFC3339 at 17:00 local, as the API expects. */
export function dateToTs(v: string | null | undefined): string | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 17, 0, 0);
  return dt.toISOString();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function apiColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;
}

/* ---------- estimate: seconds ↔ UI string ---------- */

export function estimateFromSeconds(s: number | null | undefined): string | null {
  if (s == null) return null;
  if (s % 604800 === 0 && s >= 604800) return s / 604800 + 'w';
  if (s % 86400 === 0 && s >= 86400) return s / 86400 + 'd';
  if (s % 3600 === 0 && s >= 3600) return s / 3600 + 'h';
  if (s % 60 === 0 && s >= 60) return s / 60 + 'm';
  return s + 's';
}

const EST_UNITS: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };

export function estimateToSeconds(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = String(v)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(w|d|h|m|s)$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Math.max(1, Math.min(315360000, Math.round(n * EST_UNITS[m[2].toLowerCase()])));
}

/* ---------- recurrence: lowercase API ↔ capitalized UI ---------- */

const RECUR_UI: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
};

export function recurrenceFromApi(v: string | null | undefined): string | null {
  return v ? RECUR_UI[v] || null : null;
}

export function recurrenceToApi(v: string | null | undefined): string | null {
  if (!v || v === 'Does not repeat') return null;
  return Object.entries(RECUR_UI).find(([, ui]) => ui === v)?.[0] || null;
}

/* ---------- statuses: API uuids ↔ canonical UI ids ---------- */

export type StatusMap = {
  /** canonical ui id → {uuid, category} */
  byCanon: Record<string, { id: string; category: string } | null>;
  /** api uuid → canonical id */
  canon: Record<string, string>;
};

export function statusMapFromApi(statuses: Array<Record<string, any>>): StatusMap {
  const byCanon: Record<string, { id: string; category: string } | null> = {
    backlog: null,
    todo: null,
    progress: null,
    review: null,
    done: null,
  };

  const trim = (statuses || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  const canon: Record<string, string> = {};
  let firstTodo: any = null;
  let firstProgress: any = null;
  let doneStatus: any = null;
  let anyStatus: any = null;

  for (const s of trim) {
    const name = (s.name || '').toLowerCase();
    canon[s.id] = 'todo';
    if (!anyStatus) anyStatus = s;
    if (s.category === 'done') {
      if (!doneStatus) doneStatus = s;
      canon[s.id] = 'done';
      if (!byCanon.done) byCanon.done = { id: s.id, category: s.category };
    } else if (s.category === 'in_progress') {
      if (!firstProgress) firstProgress = s;
      canon[s.id] = 'progress';
      if (!byCanon.progress) byCanon.progress = { id: s.id, category: s.category };
      if (name.includes('review') && !byCanon.review) byCanon.review = { id: s.id, category: s.category };
    } else {
      if (!firstTodo) firstTodo = s;
      if (name.includes('backlog')) {
        canon[s.id] = 'backlog';
        if (!byCanon.backlog) byCanon.backlog = { id: s.id, category: s.category };
      } else if (!byCanon.todo) byCanon.todo = { id: s.id, category: s.category };
    }
  }

  // Canonical fallbacks when یک پروژه's board doesn't carry every slot.
  if (!byCanon.todo)
    byCanon.todo = firstTodo ? { id: firstTodo.id, category: firstTodo.category } : anyStatus ? { id: anyStatus.id, category: anyStatus.category } : null;
  if (!byCanon.progress) byCanon.progress = firstProgress ? { id: firstProgress.id, category: firstProgress.category } : byCanon.todo;
  if (!byCanon.done) byCanon.done = doneStatus ? { id: doneStatus.id, category: doneStatus.category } : byCanon.progress;

  return { byCanon, canon };
}

/** API status uuid → canonical UI status id. */
export function canonStatus(smap: StatusMap | undefined, statusId: string): string {
  return smap?.canon[statusId] || 'todo';
}

/** Canonical UI status id → API status uuid (with slot fallbacks). */
export function statusIdFromCanon(smap: StatusMap | undefined, canonId: string): string | null {
  if (!smap) return null;
  const exact = smap.byCanon[canonId];
  if (exact) return exact.id;
  const fallback = canonId === 'backlog' ? smap.byCanon.todo : canonId === 'review' ? smap.byCanon.progress : smap.byCanon.todo;
  return fallback?.id || null;
}

/* ---------- entities ---------- */

export function memberFromApi(m: Record<string, any>, _teams: Array<Record<string, any>>): Record<string, any> {
  const first = (m.firstName || '').trim();
  const last = (m.lastName || '').trim();
  const name = (first + ' ' + last).trim() || m.email || m.userId;
  const role = String(m.role || 'member');
  return {
    id: m.userId,
    name,
    email: m.email || '',
    role: role.charAt(0).toUpperCase() + role.slice(1),
    team: m.teamId || '',
    title: m.title || '',
    c: colorFor(m.userId),
    status: m.status === 'deactivated' ? 'deactivated' : 'active',
    last: null,
    tz: '',
    _stars: m,
  };
}

export function teamFromApi(t: Record<string, any>): Record<string, any> {
  return {
    id: t.id,
    name: t.name,
    icon: t.icon || 'users',
    c: apiColor(t.color, '#8A867E'),
    desc: t.description || '',
  };
}

export function labelFromApi(l: Record<string, any>): Record<string, any> {
  return { id: l.id, name: l.name, c: `color-mix(in srgb, ${apiColor(l.color, '#8662C9')} 75%, white)` };
}

export function projectFromApi(p: Record<string, any>, opts: { members?: string[]; fav?: boolean; teamId?: string | null } = {}): Record<string, any> {
  const name = p.name || 'Project';
  return {
    id: p.id,
    key: keyFor(name),
    name,
    icon: iconFor(p.id),
    color: Object.keys(PCOLORS).find(k => PCOLORS[k] === colorFor(p.id)) || 'slate',
    status: 'planning',
    team: p.teamId || '',
    lead: p.createdByUserId || '',
    due: null,
    start: null,
    fav: !!opts.fav,
    members: opts.members || [],
    desc: p.description || 'No description yet.',
    milestones: [],
    last: tsToMs(p.createdAt),
    archived: !!p.archivedAt,
    archivedAt: tsToMs(p.archivedAt),
    _stars: p,
  };
}

export function taskFromApi(
  t: Record<string, any>,
  opts: { smap?: StatusMap; fav?: boolean; subtasks?: any[]; attachments?: any[]; deps?: string[] },
): Record<string, any> {
  const title = t.title || 'Untitled';
  const status = canonStatus(opts.smap, t.statusId);
  return {
    id: t.id,
    key:
      'T-' +
      String(t.id || '')
        .slice(0, 6)
        .toUpperCase(),
    project: t.projectId,
    title,
    status,
    assignee: t.assigneeUserId || null,
    priority: t.priority || 'none',
    due: tsToDate(t.dueAt),
    start: tsToDate(t.startAt),
    labels: (t.labels || []).map((l: Record<string, any>) => l.id),
    subtasks: opts.subtasks || [],
    attachments: opts.attachments || [],
    deps: opts.deps || [],
    desc: t.description
      ? '<p>' +
        escapeHtml(t.description + '')
          .replace(/\n\n+/g, '</p><p>')
          .replace(/\n/g, '<br>') +
        '</p>'
      : '',
    estimate: estimateFromSeconds(t.estimateSeconds),
    created: tsToMs(t.createdAt),
    updated: tsToMs(t.updatedAt),
    order: t.position ?? 0,
    fav: !!opts.fav,
    recur: recurrenceFromApi(t.recurrence),
    completedAt: tsToMs(t.completedAt) || null,
    archived: !!t.archivedAt,
    archivedAt: tsToMs(t.archivedAt) || null,
    _stars: t,
    _statusId: t.statusId,
  };
}

export function subtaskFromApi(t: Record<string, any>): Record<string, any> {
  return {
    id: t.id,
    title: t.title || 'Subtask',
    done: t.completedAt != null,
    assignee: t.assigneeUserId || null,
    due: tsToDate(t.dueAt),
    note: '',
  };
}

export function attachmentFromApi(a: Record<string, any>, projectId: string): Record<string, any> {
  return {
    id: a.id,
    name: a.filename,
    type: fileType(a.filename || ''),
    size: fsize(a.sizeBytes || 0),
    by: a.uploadedByUserId,
    at: tsToMs(a.createdAt),
    raw: { projectId, taskId: a.taskId },
  };
}

export function commentFromApi(c: Record<string, any>): Record<string, any> {
  return {
    id: c.id,
    task: c.taskId,
    by: c.authorUserId,
    at: tsToMs(c.createdAt),
    text: c.body || '',
    re: {},
  };
}

/** Audit action → the UI activity feed's verb vocabulary. */
const ACTION_VERBS: Array<[string, string]> = [
  ['task.status_changed', 'moved'],
  ['task.assigned', 'assigned'],
  ['task.archived', 'archived'],
  ['task.restored', 'restored'],
  ['task.priority', 'changed priority of'],
  ['task.estimate', 'estimated'],
  ['task.recurrence', 'set repeat on'],
  ['task.label', 'updated labels on'],
  ['task.comment.created', 'commented on'],
  ['task.attachment.uploaded', 'added a file to'],
  ['task.dependency', 'linked a dependency on'],
  ['task.watcher', 'started watching'],
  ['task.created', 'created'],
  ['task.updated', 'updated'],
  ['project.member', 'updated members on'],
  ['project.created', 'created project'],
  ['project.updated', 'updated project'],
];

export function verbFromAction(action: string): string {
  for (const [k, v] of ACTION_VERBS) if ((action || '').toLowerCase().includes(k)) return v;
  const tail = (action || '').split('.').pop() || 'updated';
  return tail.replace(/_/g, ' ');
}

export function activityFromApi(e: Record<string, any>): Record<string, any> {
  const meta = typeof e.metadata === 'string' && e.metadata ? safeJson(e.metadata) : e.metadata || {};
  return {
    id: e.id,
    by: e.actorUserId,
    verb: verbFromAction(e.action),
    task: e.taskId || null,
    project: e.projectId || null,
    at: tsToMs(e.createdAt),
    extra: typeof meta === 'object' ? meta.summary || '' : '',
  };
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return { summary: '' };
  }
}

export function savedViewFromApi(v: Record<string, any>): Record<string, any> {
  return {
    id: v.id,
    project: v.projectId,
    name: v.name,
    type: v.type || 'list',
    filters: v.filters || [],
  };
}

/* ---------- member display name (for activity "extra" strings) ---------- */

export function memberName(id: string, members: any[]): string {
  return members.find(m => m.id === id)?.name || '';
}
