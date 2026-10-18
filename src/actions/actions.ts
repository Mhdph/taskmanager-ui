import { displayLabel } from '../core/locale';
import { shiftCalendarMonth } from '../core/utils';
/* =====================================================================
   ACTIONS · INPUT HANDLERS · DRAG & DROP · KEYBOARD · INIT
   ===================================================================== */
import { $, $$, TODAY, addD, closestEl, dOff, esc, fmtDate, iso, parse, uid } from '../core/utils';
import { PR, PSTAT, ST } from '../core/constants';
import { seed } from '../data/seed';
import { D, DEFAULT_PREFS, S, allTasks, canSee, commentsOf, logAct, me, mem, proj, save, task, tasksOf, visibleProjects } from '../core/store';
import { fileType, fsize } from '../ui/helpers';
import { effectiveDark } from '../core/theme';
import { mutate, toast } from '../ui/toast';
import { autosize, focusKey, fxSet, go, render } from '../shell/render';
import { viewOf } from '../shell/view-engine';
import { TEMPLATES, closeModal, openModal } from '../overlays/modals';
import { closePop, openPop, tgt } from '../overlays/popovers';
import { PAL_FLAT } from '../overlays/palette';
import { strengthMeter } from '../pages/settings';
/* Server sync: optimistic local mutations forward to taskmanager-api here. */
import { fillTaskDetail, hydrateWorkspace, rebuildFiles } from '#lib/hydrate';
import * as sync from '#lib/sync';
import type { ActionTable } from '#lib/types';
/* SSR_GUARD: TanStack Start may import this module during builds; DOM listeners attach in browsers only. */
const SSR_GUARD = typeof document !== 'undefined';

export const A: ActionTable = {},
  IN: ActionTable = {},
  KEY: ActionTable = {},
  DBL: ActionTable = {},
  BLUR: ActionTable = {};

/* ---------- task mutations ---------- */
export function nextKey(p) {
  p.seq = (p.seq || 200) + 1;
  return p.key + '-' + p.seq;
}
export function createTask(f) {
  const p = proj(f.project) || visibleProjects().find(canSee);
  const maxO = Math.max(0, ...D().tasks.map(t => t.order));
  const t = Object.assign(
    {
      project: p.id,
      title: 'بدون عنوان',
      status: 'todo',
      assignee: null,
      priority: 'none',
      due: null,
      start: null,
      labels: [],
      subtasks: [],
      attachments: [],
      deps: [],
      desc: '',
      estimate: null,
      created: Date.now(),
      updated: Date.now(),
      order: maxO + 1,
      fav: false,
      recur: null,
    },
    f,
    { project: p.id },
  );
  t.id = f.id || uid('t');
  t.key = f.key || nextKey(p);
  D().tasks.push(t);
  fxSet({ added: t.id });
  logAct('created', t);
  // Optimistic create → taskmanager-api (project, status uuid, dates…).
  sync.createTask(t);
  return t;
}
export const RECUR_DAYS = { Daily: 1, Weekly: 7, 'Every 2 weeks': 14, Monthly: 30 };
export function applyPatch(t, patch) {
  const msgs: any[] = [];
  for (const k of Object.keys(patch)) {
    const old = t[k],
      nv = patch[k];
    if (JSON.stringify(old) === JSON.stringify(nv)) continue;
    t[k] = nv;
    if (k === 'status') {
      if (nv === 'done') {
        t.completedAt = Date.now();
        t.prevStatus = old;
        logAct('completed', t);
        fxSet({ done: t.id });
      } else logAct('moved', t, `from ${ST[old].name} to ${ST[nv].name}`);
      if (nv === 'done' && t.recur && t.due) {
        const nd = iso(addD(parse(t.due), RECUR_DAYS[t.recur] || 7));
        const n = createTask({
          ...JSON.parse(JSON.stringify(t)),
          id: undefined,
          key: undefined,
          status: 'todo',
          due: nd,
          start: nd,
          subtasks: t.subtasks.map(s => ({ ...s, done: false })),
          completedAt: null,
          attachments: [],
        });
        delete n.prevStatus;
        msgs.push(`بعدی “${t.title}» زمان‌بندی شد برای ${fmtDate(nd)}`);
      }
    } else if (k === 'assignee') logAct('assigned', t, nv ? `to ${mem(nv)?.name}` : '(بدون مسئول)');
    else if (k === 'priority') logAct('changed priority of', t, `to ${PR[nv].name}`);
    else if (k === 'due') logAct('changed due date of', t, nv ? `to ${fmtDate(nv)}` : '(cleared)');
    else if (k === 'start') logAct('changed start date of', t, nv ? `to ${fmtDate(nv)}` : '(cleared)');
    else if (k === 'project') {
      const p = proj(nv);
      t.key = nextKey(p);
      logAct('moved', t, `to ${p.name}`);
    } else if (k === 'labels') logAct('updated labels on', t);
    else if (k === 'title') logAct('renamed', t, `به «${nv}”`);
    else if (k === 'recur') logAct('set repeat on', t, nv ? nv.toLowerCase() : 'off');
    else if (k === 'estimate') logAct('estimated', t, nv || 'none');
    else if (k === 'deps') logAct('updated dependencies of', t);
    t.updated = Date.now();
  }
  return msgs;
}
export function updateTask(id, patch) {
  if (id === '__form') {
    Object.assign(S.ui.form, patch);
    render();
    return;
  }
  const t = task(id);
  if (!t) return;
  let msgs: any[] = [];
  if (
    mutate(() => {
      msgs = applyPatch(t, patch);
    })
  ) {
    msgs.forEach(m => toast(m, { kind: 'info' }));
    // Forward the UI patch to the API (status→uuid, dates→RFC3339 …).
    sync.updateTask(t, patch);
    if ('labels' in patch) sync.setLabels(t, patch.labels);
  }
}
export function confirmDlg(o) {
  S.ui.confirmText = '';
  openModal({ type: 'confirm', ...o });
}
export function snapshot() {
  return JSON.stringify(S.data);
}
export function restore(snap) {
  S.data = JSON.parse(snap);
  save();
  render();
}
export async function copy(text, msg = 'پیوند کپی شد') {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast('امکان کپی اینجا وجود ندارد؛ ' + text, { kind: 'info', ms: 6000 });
  }
}
export function loadingBtn(id, ms, fn) {
  const b = document.getElementById(id);
  if (b) {
    b.classList.add('is-loading');
    b.setAttribute('aria-busy', 'true');
  }
  setTimeout(fn, ms);
}
export function curProjectId() {
  if (S.ui.route === 'project') return S.ui.params.id;
  return null;
}
export function projectFromKey(key) {
  if (!key) return null;
  if (key.startsWith('p:')) return key.slice(2);
  if (key.startsWith('sv:')) return D().savedViews.find(v => v.id === key.slice(3))?.project;
  return null;
}

/* ---------- navigation ---------- */
A.go = el => {
  const r = el.dataset.r;
  const p: Record<string, any> = {};
  if (el.dataset.id) p.id = el.dataset.id;
  if (el.dataset.tab) p.tab = el.dataset.tab;
  else if (r === 'project') p.tab = S.prefs.defaultTab || 'board';
  if (el.dataset.sec) p.sec = el.dataset.sec;
  S.ui.palette = null;
  const tabOnly = r === 'project' && S.ui.route === 'project' && S.ui.params.id === p.id;
  go(r, p, { tab: tabOnly });
};
A.back = () => {
  const h = S.ui.history.pop();
  if (h) go(h.route, h.params, { back: true });
  else go('home');
};
A.reload = () => render();
A.openProject = el => go('project', { id: el.dataset.id, tab: S.prefs.defaultTab || 'board' });
A.set = el => {
  const k = el.dataset.k;
  let v = el.dataset.v;
  if (/Tab$|Cat$|Mode$|View$/.test(k)) fxSet({ tabs: true });
  if (k === 'inboxSel' && !v) v = null;
  S.ui[k] = v;
  if (k === 'membersTab' || k === 'searchCat') S.ui.pop = null;
  render();
};
A.toggleSide = () => {
  S.ui.collapsed = !S.ui.collapsed;
  save();
  render();
};
A.openMnav = () => {
  S.ui.mnav = true;
  render();
};
A.closeMnav = () => {
  S.ui.mnav = false;
  render();
};
A.toggleExpand = el => {
  S.ui.expanded[el.dataset.id] = !S.ui.expanded[el.dataset.id];
  render();
};
A.goTasks = el => {
  const f = el.dataset.f;
  const v = viewOf('tasks');
  v.mode = 'list';
  v.filters =
    f === 'open'
      ? [{ f: 'status', op: 'not', v: ['done'] }]
      : f === 'done'
        ? [
            { f: 'status', op: 'is', v: ['done'] },
            { f: 'updated', op: 'is', v: ['7'] },
          ]
        : f === 'overdue'
          ? [{ f: 'due', op: 'is', v: ['overdue'] }]
          : [];
  go('tasks');
};
A.goFilteredList = el => {
  const v = viewOf('p:' + el.dataset.id);
  v.filters = [{ f: 'status', op: 'is', v: [el.dataset.st] }];
  v.group = 'status';
  go('project', { id: el.dataset.id, tab: 'list' }, { tab: true });
};

/* ---------- theme ---------- */
A.setTheme = el => {
  S.prefs.theme = el.dataset.v;
  save();
  render();
};
A.toggleDark = () => {
  S.prefs.theme = effectiveDark() ? 'light' : 'dark';
  save();
  S.ui.palette = null;
  render();
  toast(effectiveDark() ? 'حالت تیره فعال است' : 'حالت روشن فعال شد', { kind: 'info', ms: 1800 });
};
A.setPref = el => {
  S.prefs[el.dataset.k] = el.dataset.v;
  save();
  render();
};

/* ---------- popovers ---------- */
A.pop = el => {
  const d = el.dataset;
  const p = S.ui.pop;
  if (p && p.type === d.pop && p.id === d.id && p.key === d.key && p.i == (d.i != null ? +d.i : undefined) && p.field === d.field) {
    closePop();
    return;
  }
  openPop(el);
};
A.ctxBtn = el => {
  const r = el.getBoundingClientRect();
  const d = el.dataset;
  const p = S.ui.pop;
  if (p && p.type === 'ctx' && p.id === d.id && p.ctx === d.ctx) {
    closePop();
    return;
  }
  S.ui.pop = { type: 'ctx', ctx: d.ctx, id: d.id, key: d.key, vid: d.vid, x: r.left, y: r.bottom + 4, top: r.top, w: r.width };
  render();
};
A.popPick = el => {
  const p = S.ui.pop;
  if (!p) return;
  let v = el.dataset.v;
  if (p.type === 'subassignee' || (p.type === 'date' && p.field === 'subdue')) {
    const t = task(p.id);
    const sb = t?.subtasks[p.i];
    if (!sb) return;
    const k = p.type === 'subassignee' ? 'assignee' : 'due';
    v = v || null;
    S.ui.pop = null;
    mutate(() => {
      sb[k] = v;
      logAct(
        k === 'assignee' ? 'زیرکاری واگذار کرد در' : 'مهلت زیرکاری تعیین کرد در',
        t,
        k === 'assignee' ? (v ? `to ${mem(v).name}` : '(بدون مسئول)') : v ? fmtDate(v) : '(cleared)',
      );
    });
    sync.updateSubtask(t, sb, { [k]: v });
    return;
  }
  if (p.type === 'pstatus') {
    const pr = proj(p.id);
    mutate(() => {
      pr.status = v;
      D().activity.unshift({
        id: uid('a'),
        by: D().me,
        verb: 'changed status of project',
        task: null,
        project: pr.id,
        at: Date.now(),
        extra: 'to ' + PSTAT[v].name,
      });
    });
    S.ui.pop = null;
    render();
    toast(`${pr.name} با وضعیت ${PSTAT[v].name} علامت‌گذاری شد`);
    return;
  }
  if (p.type === 'role') {
    const m = mem(p.id);
    mutate(() => {
      m.role = v;
    });
    sync.setMemberRole(p.id, v);
    S.ui.pop = null;
    render();
    toast(`نقش ${m.name} به ${displayLabel(v)} تغییر کرد`);
    return;
  }
  const field = { status: 'status', priority: 'priority', assignee: 'assignee', project: 'project', recur: 'recur', estimate: 'estimate', date: p.field }[
    p.type
  ];
  if (!field) return;
  if (field === 'assignee' && !v) v = null;
  if (field === 'recur' && v === 'Does not repeat') v = null;
  if ((field === 'estimate' || field === 'due' || field === 'start') && !v) v = null;
  S.ui.pop = null;
  const patch: Record<string, any> = { [field]: v };
  if (field === 'due' && v && p.id !== '__form') {
    const t = task(p.id);
    if (t.start && t.start > v) patch.start = v;
  }
  updateTask(p.id, patch);
};
A.popToggleLabel = el => {
  const p = S.ui.pop;
  if (!p) return;
  const t = tgt(p);
  const v = el.dataset.v;
  const labels = t.labels.includes(v) ? t.labels.filter(x => x !== v) : [...t.labels, v];
  updateTask(p.id, { labels });
};
A.popToggleDep = el => {
  const p = S.ui.pop;
  if (!p) return;
  const t = task(p.id);
  const v = el.dataset.v;
  const adding = !t.deps.includes(v);
  updateTask(p.id, { deps: t.deps.includes(v) ? t.deps.filter(x => x !== v) : [...t.deps, v] });
  if (adding) sync.addDependency(p.id, v);
  else sync.removeDependency(p.id, v);
};
A.popMonth = el => {
  const p = S.ui.pop;
  if (!p) return;
  const m = parse(p.m);
  if (!m) return;
  p.m = iso(shiftCalendarMonth(m, Number(el.dataset.d)));
  render();
};
IN.popQ = el => {
  if (!S.ui.pop) return;
  if (S.ui.pop) {
    S.ui.pop.q = el.value;
    render();
  }
};
export const ctxTo = type => () => {
  S.ui.pop = { ...S.ui.pop, type, q: '' };
  if (type === 'date') S.ui.pop.m = iso(TODAY);
  render();
};
A.ctxStatus = ctxTo('status');
A.ctxAssign = ctxTo('assignee');
A.ctxPrio = ctxTo('priority');
A.ctxMove = ctxTo('project');
A.ctxRole = ctxTo('role');

/* ---------- tasks ---------- */
A.openTask = el => {
  const id = el.dataset.id;
  if (!task(id)) return;
  if (!canSee(proj(task(id).project))) {
    toast('به این کار دسترسی ندارید', { kind: 'err' });
    return;
  }
  if (!S.ui.drawer || !document.activeElement?.closest?.('.drawer')) S.ui.drawerOpener = el.isConnected ? focusKey(el) : S.ui.drawerOpener;
  S.ui.drawer = id;
  S.ui.drawerFull = S.prefs.openTasks === 'full' || (S.ui.drawerFull && S.ui.drawer === id);
  S.ui.pop = null;
  S.ui.palette = null;
  S.ui.modals = [];
  S.ui.mention = null;
  S.ui.subOpen = null;
  S.ui.drawerTab = S.ui.drawerTab || 'comments';
  render();
  const dr = $('.drawer');
  if (dr && !dr.contains(document.activeElement)) dr.focus({ preventScroll: true });
  // Lazy-fill comments/attachments/dependencies for the drawer.
  const t2 = task(id);
  if (t2 && !t2._detail)
    fillTaskDetail(t2).then(() => {
      if (S.ui.drawer === id) render();
    });
};
A.closeDrawer = () => {
  S.ui.drawer = null;
  S.ui.drawerFull = false;
  S.ui.subOpen = null;
  render();
};
A.skipToContent = () => {
  const c = $('#main-content');
  c?.focus();
};
A.projUp = el => A._projMove(el, -1);
A.projDown = el => A._projMove(el, 1);
A._projMove = (el, d) => {
  const vis = visibleProjects().map(p => p.id);
  const i = vis.indexOf(el.dataset.id);
  const j = i + d;
  if (j < 0 || j >= vis.length) return;
  const o = D().projOrder;
  const a = o.indexOf(vis[i]),
    b = o.indexOf(vis[j]);
  [o[a], o[b]] = [o[b], o[a]];
  S.ui.pop = null;
  save();
  render();
  toast(`منتقل شد ${proj(el.dataset.id).name} ${d < 0 ? 'به بالا' : 'به پایین'}`, { ms: 1600 });
};
A.toggleDrawerFull = () => {
  S.ui.drawerFull = !S.ui.drawerFull;
  render();
};
A.toggleDone = el => {
  const t = task(el.dataset.id);
  if (!t) return;
  const wasDone = t.status === 'done';
  S.ui.pop = null;
  updateTask(t.id, { status: wasDone ? (t.prevStatus && t.prevStatus !== 'done' ? t.prevStatus : 'todo') : 'done' });
  if (!wasDone && !S.ui.offline) toast(`تکمیل‌شده “${t.title}”`, { action: 'بازگردانی', onAction: () => updateTask(t.id, { status: t.prevStatus || 'todo' }) });
};
A.toggleFavTask = el => {
  const t = task(el.dataset.id);
  mutate(() => {
    t.fav = !t.fav;
  });
  S.ui.pop = null;
  sync.favorite('task', t.id, t.fav);
  toast(t.fav ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', { ms: 1800 });
  render();
};
A.toggleFavProj = el => {
  const p = proj(el.dataset.id);
  mutate(() => {
    p.fav = !p.fav;
  });
  S.ui.pop = null;
  sync.favorite('project', p.id, p.fav);
  render();
  toast(p.fav ? `اضافه شد ${p.name} به علاقه‌مندی‌ها` : 'از علاقه‌مندی‌ها حذف شد', { ms: 1800 });
};
A.copyLink = el => {
  S.ui.pop = null;
  render();
  const d = el.dataset;
  const path =
    d.id && task(d.id)
      ? `task/${task(d.id).key}`
      : d.pid
        ? `project/${proj(d.pid).key.toLowerCase()}`
        : d.fid
          ? `file/${d.fid}`
          : d.id && proj(d.id)
            ? `project/${proj(d.id).key.toLowerCase()}`
            : '';
  copy(`https://gr8rstudio.com/${D().ws.url}/${path}`);
};
A.copyText = el => copy(el.dataset.text, 'در حافظه کپی شد');
A.copyEmail = el => {
  S.ui.pop = null;
  render();
  copy(mem(el.dataset.id).email, 'ایمیل کپی شد');
};
A.dupTask = el => {
  const t = task(el.dataset.id);
  S.ui.pop = null;
  let n;
  mutate(() => {
    n = createTask({ ...JSON.parse(JSON.stringify(t)), id: uid('t'), key: undefined, title: t.title + ' (copy)', created: Date.now(), fav: false });
    n.key = nextKey(proj(n.project));
  });
  toast('نسخه مشابه کار ساخته شد', { action: 'باز', onAction: () => A.openTask({ dataset: { id: n.id } }) });
};
A.archiveTask = el => {
  const t = task(el.dataset.id);
  const snap = snapshot();
  S.ui.pop = null;
  if (S.ui.drawer === t.id) S.ui.drawer = null;
  mutate(() => {
    t.archived = true;
    t.archivedAt = Date.now();
    logAct('archived', t);
  });
  toast(`بایگانی شد “${t.title}”`, { action: 'بازگردانی', onAction: () => restore(snap) });
};
export function deleteTasks(ids) {
  const set = new Set(ids);
  // Capture refs before removal — the API needs them for its side.
  const removed = D().tasks.filter(t => set.has(t.id));
  D().tasks = D().tasks.filter(t => !set.has(t.id));
  D().tasks.forEach(t => (t.deps = t.deps.filter(d => !set.has(d))));
  D().comments = D().comments.filter(c => !set.has(c.task));
  if (set.has(S.ui.drawer)) S.ui.drawer = null;
  ids.forEach(i => S.ui.sel.delete(i));
  // Server deletes are soft (archive); permanent purge doesn't exist.
  removed.forEach(t => sync.setArchived(t, true));
}
A.delTask = el => {
  const t = task(el.dataset.id);
  S.ui.pop = null;
  if (!t) return;
  const run = () => {
    const snap = snapshot();
    if (mutate(() => deleteTasks([t.id]))) toast(`حذف شد “${t.title}”`, { action: 'بازگردانی', onAction: () => restore(snap) });
  };
  if (S.prefs.confirmDel === false && !el.dataset.demo) return run();
  confirmDlg({
    title: 'کار حذف شود؟',
    body: `<b>${esc(t.title)}</b>${t.subtasks.length ? `, its ${t.subtasks.length} زیرکارها،` : ''} and ${commentsOf(t.id).length} comment${commentsOf(t.id).length === 1 ? '' : 's'} برای همیشه حذف خواهد شد.`,
    ok: 'حذف کار',
    danger: true,
    run,
  });
};
A.editTask = el => {
  const t = task(el.dataset.id);
  if (!t) return;
  S.ui.form = {
    title: t.title,
    desc: (t.desc || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    project: t.project,
    status: t.status,
    assignee: t.assignee,
    priority: t.priority,
    due: t.due,
    start: t.start,
    labels: [...t.labels],
    subtasks: t.subtasks.map(s => ({ ...s })),
    files: [],
    recur: t.recur,
    more: false,
  };
  S.ui.errors = {};
  openModal({ type: 'task', edit: t.id });
};
A.newTask = el => {
  const d = el?.dataset || {};
  const pid =
    d.project ||
    curProjectId() ||
    projectFromKey(S.ui.composer?.ctx) ||
    (S.ui.drawer && task(S.ui.drawer)?.project) ||
    visibleProjects().find(p => canSee(p) && p.status !== 'complete')?.id;
  S.ui.form = {
    title: '',
    desc: '',
    project: canSee(proj(pid)) ? pid : visibleProjects().find(canSee)?.id || pid,
    status: 'todo',
    assignee: d.assignee || D().me,
    priority: 'medium',
    due: d.due || null,
    start: null,
    labels: [],
    subtasks: [],
    files: [],
    recur: null,
    more: S.ui.form?.more || false,
  };
  S.ui.errors = {};
  openModal({ type: 'task' });
};
IN.form = el => {
  S.ui.form[el.dataset.f] = el.value;
  if (el.dataset.f === 'title' && S.ui.errors.title && el.value.trim()) {
    S.ui.errors.title = null;
    render();
  }
};
IN.formMore = el => {
  S.ui.form.more = el.checked;
};
IN.formFiles = el => {
  [...el.files].forEach(f => S.ui.form.files.push({ name: f.name, size: fsize(f.size), type: fileType(f.name) }));
  render();
};
KEY.formAddSub = el => {
  const v = el.value.trim();
  if (!v) return;
  S.ui.form.subtasks.push({ id: uid('s'), title: v, done: false });
  render();
  setTimeout(() => $('#f-sub')?.focus(), 0);
};
A.formRmSub = el => {
  S.ui.form.subtasks.splice(+el.dataset.i, 1);
  render();
};
A.formRmFile = el => {
  S.ui.form.files.splice(+el.dataset.i, 1);
  render();
};
A.submitTask = () => {
  const m = S.ui.modals[S.ui.modals.length - 1];
  const f = S.ui.form;
  const title = ($('#f-title')?.value ?? f.title).trim();
  f.title = title;
  f.desc = $('#f-desc')?.value ?? f.desc;
  if (!title) {
    S.ui.errors.title = 'برای کار نامی انتخاب کنید';
    render();
    $('#f-title')?.focus();
    return;
  }
  S.ui.errors = {};
  const files = f.files.map(x => ({ id: uid('a'), name: x.name, type: x.type, size: x.size, by: D().me, at: Date.now() }));
  const base = {
    title,
    project: f.project,
    status: f.status,
    assignee: f.assignee,
    priority: f.priority,
    due: f.due,
    start: f.start && f.due && f.start > f.due ? f.due : f.start,
    labels: f.labels,
    recur: f.recur,
    subtasks: f.subtasks,
  };
  if (m.edit) {
    const t = task(m.edit);
    const prevSubs = t.subtasks.slice();
    if (
      !mutate(() => {
        applyPatch(t, base);
        if (
          f.desc !==
          (t.desc || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        )
          t.desc = f.desc ? `<p>${esc(f.desc)}</p>` : '';
        t.attachments.push(...files);
      })
    )
      return;
    // Server funnel: base fields, then labels and subtask diffs.
    if (t.desc) sync.updateTask(t, { ...base, desc: t.desc });
    else sync.updateTask(t, base);
    if ('labels' in base) sync.setLabels(t, base.labels);
    diffSubtasks(t, prevSubs, t.subtasks);
    S.ui.modals.pop();
    render();
    toast('تغییرات ذخیره شد');
    return;
  }
  let t;
  if (
    !mutate(() => {
      t = createTask({ ...base, desc: f.desc ? `<p>${esc(f.desc)}</p>` : '', attachments: files });
      files.forEach(x => D().files.unshift({ ...x, project: t.project, task: t.id }));
    })
  )
    return;
  if (f.more) {
    Object.assign(f, { title: '', desc: '', subtasks: [], files: [] });
    render();
    setTimeout(() => $('#f-title')?.focus(), 0);
    toast(`ایجاد شد ${t.key}`, { ms: 2000 });
    return;
  }
  S.ui.modals.pop();
  fxSet({ added: t.id });
  render();
  toast(`ایجاد شد ${t.key} در ${proj(t.project).name}`, { action: 'باز', onAction: () => A.openTask({ dataset: { id: t.id } }) });
};

/* inline composer */
A.startComposer = el => {
  S.ui.composer = { ctx: el.dataset.ctx, group: el.dataset.group, gb: JSON.parse(el.dataset.gb || '{}') };
  S.ui.pop = null;
  render();
  setTimeout(() => $('#composer-in')?.focus(), 0);
};
A.cancelComposer = () => {
  S.ui.composer = null;
  render();
};
KEY.commitComposer = () => A.commitComposer();
A.commitComposer = () => {
  const c = S.ui.composer;
  const el = $('#composer-in');
  const v = el?.value.trim();
  if (!c) return;
  if (!v) {
    A.cancelComposer();
    return;
  }
  const f = { title: v, ...c.gb };
  f.project = f.project || projectFromKey(c.ctx) || curProjectId() || visibleProjects()[0]?.id;
  if (c.ctx === 'mytasks') f.assignee = D().me;
  mutate(() => createTask(f));
  setTimeout(() => $('#composer-in')?.focus(), 0);
};
KEY.commitTitle = el => DBL._commitTitle(el);
DBL.editTitle = el => {
  const row = closestEl(el, '[data-task-row]');
  if (!row) return;
  S.ui.drawer = null;
  S.ui.editCell = { id: row.dataset.taskRow, f: 'title' };
  render();
  const i = $('#edit-title');
  if (i) {
    i.focus();
    i.select();
  }
};
DBL._commitTitle = el => {
  const c = S.ui.editCell;
  if (!c) return;
  S.ui.editCell = null;
  const v = el.value.trim();
  if (v && v !== task(c.id).title) updateTask(c.id, { title: v });
  else render();
};
DBL.editCell = el => {
  S.ui.drawer = null;
  S.ui.editCell = { id: el.dataset.id || closestEl(el, '[data-id]')?.dataset.id, f: el.dataset.f };
  render();
  const i = $('#edit-cell');
  if (i) {
    i.focus();
    i.select();
  }
};
A.editCell = el => DBL.editCell(el);
KEY.commitCell = el => {
  const c = S.ui.editCell;
  if (!c) return;
  S.ui.editCell = null;
  const v = el.value.trim();
  if (c.f === 'title' && !v) {
    render();
    return;
  }
  updateTask(c.id, { [c.f]: v || null });
};
BLUR.commitCell = el => KEY.commitCell(el);
BLUR.commitTitle = el => DBL._commitTitle(el);
BLUR.commitDrawerTitle = el => {
  const t = task(el.dataset.id);
  const v = el.value.trim();
  if (t && v && v !== t.title) updateTask(t.id, { title: v });
};
KEY.blur = el => el.blur();

/* subtasks */
/** Sync helper: diff a task's subtasks against the pre-edit snapshot. */
function diffSubtasks(t, prevRefs, nextRefs) {
  const was = new Set(prevRefs);
  const now = new Set(nextRefs);
  for (const s of prevRefs) {
    if (now.has(s)) {
      const on = nextRefs.find(x => x.id === s.id);
      if (on) sync.updateSubtask(t, s, { title: s.title, done: s.done, assignee: s.assignee, due: s.due });
      continue;
    }
    if (sync.lookUuid(s.id)) sync.removeSubtask(t, s);
  }
  for (const s of nextRefs) {
    if (was.has(s)) continue;
    sync.addSubtask(t, s);
  }
}

A.toggleSub = el => {
  const t = task(el.dataset.id);
  const s = t.subtasks.find(x => x.id === el.dataset.sid);
  if (!s.done) fxSet({ done: s.id });
  mutate(() => {
    s.done = !s.done;
    logAct(s.done ? 'زیرکاری تکمیل کرد در' : 'زیرکاری بازگشایی کرد در', t, `“${s.title}”`);
  });
  sync.updateSubtask(t, s, { done: s.done });
};
A.rmSub = el => {
  const t = task(el.dataset.id);
  const s = t.subtasks.find(x => x.id === el.dataset.sid);
  mutate(() => {
    t.subtasks = t.subtasks.filter(x => x.id !== el.dataset.sid);
  });
  if (s) sync.removeSubtask(t, s);
};
KEY.addSub = el => {
  const t = task(el.dataset.id);
  const v = el.value.trim();
  if (!v) return;
  const nid = uid('s');
  fxSet({ added: nid });
  const sub = { id: nid, title: v, done: false };
  mutate(() => {
    t.subtasks.push(sub);
    logAct('added subtask to', t, `“${v}”`);
  });
  sync.addSubtask(t, sub);
  setTimeout(() => $('#d-sub')?.focus(), 0);
};
A.expandRow = el => {
  S.ui.openTasks[el.dataset.id] = !S.ui.openTasks[el.dataset.id];
  render();
};

/* attachments */
A.rmAttach = el => {
  const t = task(el.dataset.id);
  const f = t.attachments.find(a => a.id === el.dataset.aid);
  mutate(() => {
    t.attachments = t.attachments.filter(a => a.id !== el.dataset.aid);
    logAct('removed a file from', t);
  });
  rebuildFiles();
  if (f?.raw) sync.deleteAttachment(t, f.id);
  toast(`حذف شد ${f.name}`);
};
A.filePreview = el => {
  const t = task(el.dataset.tid);
  const f = t.attachments.find(a => a.id === el.dataset.aid);
  openModal({ type: 'filePreview', file: f, tid: t.id });
};
A.previewFile = el => {
  const f = D().files.find(x => x.id === el.dataset.id);
  S.ui.pop = null;
  if (f) openModal({ type: 'filePreview', file: f, tid: f.task });
};
export function handleFiles(files, ctx) {
  if (!files || !files.length) return;
  if (S.ui.offline) {
    toast('بارگذاری ناموفق بود؛ اتصال شما قطع است.', { kind: 'err', action: 'تلاش دوباره', onAction: () => {} });
    return;
  }
  S.ui.uploads = S.ui.uploads || [];
  [...files].forEach(file => {
    const up = { id: uid('u'), name: file.name, size: fsize(file.size), project: ctx.project, task: ctx.task, pct: 0 };
    S.ui.uploads.push(up);
    sync
      .upload(ctx.project, ctx.task, file, (pct: number) => {
        up.pct = pct;
        const bar = document.getElementById('upbar-' + up.id),
          pc = document.getElementById('upct-' + up.id);
        if (bar) bar.style.setProperty('--p', String(up.pct / 100));
        if (pc) pc.textContent = up.pct + '%';
      })
      .then((res: Record<string, any>) => {
        S.ui.uploads = S.ui.uploads.filter(x => x !== up);
        const rec = {
          id: res.id,
          name: up.name,
          type: fileType(up.name),
          size: up.size,
          by: D().me,
          at: Date.now(),
          raw: { projectId: ctx.project, taskId: ctx.task },
        };
        D().files.unshift({ ...rec, project: up.project, task: up.task || null });
        if (up.task) {
          const t = task(up.task);
          t.attachments.push(rec);
          t._detail = true;
          logAct('added a file to', t, up.name);
        }
        save();
        render();
        toast(`بارگذاری شد ${up.name}`);
      })
      .catch(() => {
        S.ui.uploads = S.ui.uploads.filter(x => x !== up);
        toast(`بارگذاری ناموفق بود؛ ${up.name}`, { kind: 'err' });
        render();
      });
  });
  render();
}
IN.uploadFiles = el => {
  handleFiles(el.files, { project: el.dataset.project, task: el.dataset.task });
  el.value = '';
};

/* comments */
IN.draft = el => {
  const id = el.dataset.id;
  S.ui.drafts[id] = el.value;
  const before = el.value.slice(0, el.selectionStart);
  const m = before.match(/(?:^|\s)@([A-Za-z]*)$/);
  const prev = JSON.stringify(S.ui.mention);
  S.ui.mention = m ? { tid: id, q: m[1] } : null;
  if (prev !== JSON.stringify(S.ui.mention)) render();
  if (el.dataset.autosize != null) autosize(el);
};
A.pickMention = el => {
  const id = el.dataset.id;
  const d = S.ui.drafts[id] || '';
  S.ui.drafts[id] = d.replace(/@([A-Za-z]*)$/, '@' + el.dataset.name + ' ');
  S.ui.mention = null;
  render();
  const ta = $('#d-cmt');
  if (ta) {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }
};
A.insertAt = el => {
  const id = el.dataset.id;
  const d = S.ui.drafts[id] || '';
  S.ui.drafts[id] = d + (d && !d.endsWith(' ') ? ' @' : '@');
  S.ui.mention = { tid: id, q: '' };
  render();
  const ta = $('#d-cmt');
  if (ta) {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }
};
KEY.postComment = el => A.postComment(el);
A.postComment = el => {
  const id = el.dataset.id;
  const txt = (S.ui.drafts[id] || '').trim();
  if (!txt) {
    $('#d-cmt, #inbox-reply')?.focus();
    return;
  }
  const t = task(id);
  if (
    mutate(() => {
      D().comments.push({ id: uid('c'), task: id, by: D().me, at: Date.now(), text: txt, re: {} });
      logAct('commented on', t);
      S.ui.drafts[id] = '';
      S.ui.mention = null;
      S.ui.drawerTab = 'comments';
    })
  ) {
    sync.addComment(id, txt);
    if (S.ui.route === 'inbox') toast('پاسخ ارسال شد');
  }
};
A.delComment = el => {
  const c = D().comments.find(x => x.id === el.dataset.id);
  const snap = snapshot();
  mutate(() => {
    D().comments = D().comments.filter(x => x !== c);
  });
  if (c) sync.deleteComment(c.task, c._serverId || c.id);
  toast('دیدگاه حذف شد', { action: 'بازگردانی', onAction: () => restore(snap) });
};
A.react = el => {
  const c = D().comments.find(x => x.id === el.dataset.id);
  const e = el.dataset.e;
  S.ui.pop = null;
  mutate(() => {
    c.re = c.re || {};
    const l = c.re[e] || [];
    c.re[e] = l.includes(D().me) ? l.filter(x => x !== D().me) : [...l, D().me];
  });
};

/* rich text description */
SSR_GUARD &&
  document.addEventListener('mousedown', e => {
    const b = closestEl(e.target, '[data-cmd]');
    if (!b) return;
    e.preventDefault();
    const [cmd, arg] = (b.dataset.cmd || '').split(':');
    if (cmd === 'createLink') {
      const s = String(getSelection());
      if (/^https?:\/\//.test(s)) document.execCommand('createLink', false, s);
      else toast('برای ساخت پیوند، نشانی‌ای با شروع https:// انتخاب کنید', { kind: 'info' });
    } else document.execCommand(cmd, false, arg ? `<${arg}>` : undefined);
    const ed = $('#d-desc');
    if (ed) {
      const t = task(ed.dataset.rte);
      t.desc = ed.innerHTML;
      save();
    }
  });
SSR_GUARD &&
  document.addEventListener('input', e => {
    const ed = closestEl(e.target, '[data-rte]');
    if (!ed) return;
    const t = task(ed.dataset.rte);
    if (t) {
      t.desc = ed.innerHTML;
      t.updated = Date.now();
      save();
    }
  });

/* selection & bulk */
A.selRow = el => {
  const id = el.dataset.id;
  if (S.ui.sel.has(id)) S.ui.sel.delete(id);
  else S.ui.sel.add(id);
  render();
};
A.selAll = el => {
  const ids = $$('[data-task-row]', closestEl(el, '.tlist') || document)
    .map(r => r.dataset.taskRow)
    .filter((id): id is string => !!id);
  const all = ids.every(i => S.ui.sel.has(i));
  ids.forEach(i => (all ? S.ui.sel.delete(i) : S.ui.sel.add(i)));
  render();
};
A.clearSel = () => {
  S.ui.sel.clear();
  render();
};
A.bulkSet = el => {
  const f = el.dataset.f;
  const v = el.dataset.v || null;
  const ids = [...S.ui.sel];
  S.ui.pop = null;
  if (mutate(() => ids.forEach(id => applyPatch(task(id), { [f]: v })))) {
    toast(`به‌روز شد ${ids.length} کار`);
    // Server-side: the API has a native bulk op for status/priority/assignee;
    // everything else goes through the per-task patch.
    if (['status', 'priority', 'assignee'].includes(f)) sync.bulk(ids, { [f]: v });
    else ids.forEach(id => sync.updateTask(task(id), { [f]: v }));
  }
};
A.bulkDelete = () => {
  const ids = [...S.ui.sel];
  confirmDlg({
    title: `حذف ${ids.length} کار?`,
    body: 'کارهای انتخاب‌شده، زیرکارها و دیدگاه‌های آن‌ها برای همیشه حذف می‌شوند.',
    ok: `حذف ${ids.length} کار`,
    danger: true,
    run: () => {
      const snap = snapshot();
      if (mutate(() => deleteTasks(ids))) toast(`حذف شد ${ids.length} کار`, { action: 'بازگردانی', onAction: () => restore(snap) });
    },
  });
};

/* views: sort, group, filters, columns */
A.sortBy = el => {
  const v = viewOf(el.dataset.key);
  const f = el.dataset.f;
  if (S.ui.justResized) return;
  v.sort = v.sort.f === f ? { f, dir: -v.sort.dir } : { f, dir: 1 };
  save();
  render();
};
A.setSort = el => {
  const v = viewOf(el.dataset.key);
  v.sort = { f: el.dataset.v, dir: v.sort.dir || 1 };
  S.ui.pop = null;
  save();
  render();
};
A.setSortDir = el => {
  viewOf(el.dataset.key).sort.dir = +el.dataset.v;
  save();
  render();
};
A.setGroup = el => {
  viewOf(el.dataset.key).group = el.dataset.v;
  S.ui.pop = null;
  save();
  render();
};
A.toggleGroup = el => {
  const gk = el.dataset.gk;
  S.ui.collapsedGroups[gk] = el.getAttribute('aria-expanded') === 'true';
  render();
};
A.setViewMode = el => {
  viewOf(el.dataset.key).mode = el.dataset.v;
  save();
  render();
};
A.toggleCol2 = el => {
  const v = viewOf(el.dataset.key);
  const c = el.dataset.v;
  v.hidden = v.hidden.includes(c) ? v.hidden.filter(x => x !== c) : [...v.hidden, c];
  save();
  render();
};
A.resetCols = el => {
  viewOf(el.dataset.key).colW = {};
  S.ui.pop = null;
  save();
  render();
};
IN.viewQ = el => {
  viewOf(el.dataset.key).q = el.value;
  render();
};
A.addFilter = el => {
  const v = viewOf(el.dataset.key);
  v.filters.push({ f: el.dataset.f, op: 'is', v: [] });
  if (S.ui.pop?.type === 'filter') S.ui.pop.edit = v.filters.length - 1;
  else {
    const r = el.getBoundingClientRect();
    S.ui.pop = { type: 'filter', key: el.dataset.key, x: r.left, y: r.bottom + 4, edit: v.filters.length - 1 };
  }
  save();
  render();
};
A.fEdit = el => {
  const p = S.ui.pop;
  if (!p) return;
  p.edit = p.edit === +el.dataset.i ? null : +el.dataset.i;
  render();
};
A.fToggleVal = el => {
  const f = viewOf(el.dataset.key).filters[+el.dataset.i];
  const x = el.dataset.v;
  f.v = f.v.includes(x) ? f.v.filter(y => y !== x) : [...f.v, x];
  save();
  render();
};
A.rmFilter = el => {
  const v = viewOf(el.dataset.key);
  v.filters.splice(+el.dataset.i, 1);
  if (S.ui.pop && S.ui.pop.type === 'fvals') S.ui.pop = null;
  if (S.ui.pop?.type === 'filter') S.ui.pop.edit = null;
  save();
  render();
};
A.clearFilters = el => {
  const v = viewOf(el.dataset.key);
  v.filters = [];
  v.q = '';
  S.ui.pop = null;
  save();
  render();
};
IN.fField = el => {
  if (!S.ui.pop) return;
  const f = viewOf(el.dataset.key).filters[+el.dataset.i];
  f.f = el.value;
  f.v = [];
  S.ui.pop.edit = +el.dataset.i;
  save();
  render();
};
IN.fOp = el => {
  viewOf(el.dataset.key).filters[+el.dataset.i].op = el.value;
  save();
  render();
};
A.saveView = el => {
  const k = 'p:' + el.dataset.id;
  openModal({ type: 'saveView', pid: el.dataset.id, nf: viewOf(k).filters.length });
};
A.saveViewSubmit = async () => {
  const m = S.ui.modals[S.ui.modals.length - 1];
  const name = $('#sv-name').value.trim() || 'نمای بدون عنوان';
  const type = $('#sv-type').value;
  const filters = JSON.parse(JSON.stringify(viewOf('p:' + m.pid).filters));
  const sv = { id: uid('v'), project: m.pid, name, type, filters };
  D().savedViews.push(sv);
  // Create on the server and use its id for deep links ('v:{id}').
  const id = await sync.createView(m.pid, { name, type, filters });
  if (id && id !== sv.id) {
    sv.id = id;
    S.ui.params.tab = 'v:' + id;
  }
  save();
  S.ui.modals.pop();
  go('project', { id: m.pid, tab: 'v:' + sv.id }, { tab: true });
  toast(`نمای ذخیره‌شده “${name}”`);
};
A.renameView = el => {
  const v = D().savedViews.find(x => x.id === el.dataset.id);
  S.ui.pop = null;
  openModal({
    type: 'prompt',
    title: 'تغییر نام نما',
    label: 'نام نما',
    value: v.name,
    run: val => {
      if (val) {
        v.name = val;
        save();
        sync.renameView(v.project, v.id, val);
      }
    },
  });
};
A.delView = el => {
  const v = D().savedViews.find(x => x.id === el.dataset.id);
  S.ui.pop = null;
  D().savedViews = D().savedViews.filter(x => x !== v);
  save();
  sync.deleteView(v.project, v.id);
  if (S.ui.params.tab === 'v:' + v.id) go('project', { id: v.project, tab: 'list' }, { tab: true });
  else render();
  toast(`نما حذف شد: «${v.name}”`);
};

/* board column menu */
A.toggleCol = el => {
  delete S.ui.collapsedCols[el.dataset.ck];
  render();
};
A.colCollapse = el => {
  if (!S.ui.pop) return;
  S.ui.collapsedCols[S.ui.pop.key + ':' + el.dataset.id] = true;
  S.ui.pop = null;
  render();
};
A.colAdd = el => {
  if (!S.ui.pop) return;
  const key = S.ui.pop.key;
  const pid = projectFromKey(key);
  S.ui.pop = null;
  A.startComposer({ dataset: { ctx: key, group: el.dataset.id, gb: JSON.stringify({ status: el.dataset.id, ...(pid ? { project: pid } : {}) }) } });
};
export function colTasks(key, st) {
  const pid = projectFromKey(key);
  return (pid ? tasksOf(pid) : allTasks()).filter(t => t.status === st);
}
A.colDoneAll = el => {
  if (!S.ui.pop) return;
  const ts = colTasks(S.ui.pop.key, el.dataset.id);
  S.ui.pop = null;
  if (!ts.length) {
    render();
    return;
  }
  const snap = snapshot();
  if (mutate(() => ts.forEach(t => applyPatch(t, { status: 'done' })))) {
    toast(`علامت‌گذاری شد ${ts.length} کار به‌عنوان انجام‌شده`, { action: 'بازگردانی', onAction: () => restore(snap) });
    sync.bulk(
      ts.map(t => t.id),
      { status: 'done' },
    );
  }
};
A.colArchive = () => {
  if (!S.ui.pop) return;
  const ts = colTasks(S.ui.pop.key, 'done');
  S.ui.pop = null;
  const snap = snapshot();
  if (
    mutate(() =>
      ts.forEach(t => {
        t.archived = true;
        t.archivedAt = Date.now();
      }),
    )
  ) {
    toast(`بایگانی شد ${ts.length} کار تکمیل‌شده`, { action: 'بازگردانی', onAction: () => restore(snap) });
    sync.bulk(
      ts.map(t => t.id),
      { archive: true },
    );
  }
};
A.colSortPrio = el => {
  if (!S.ui.pop) return;
  const ts = colTasks(S.ui.pop.key, el.dataset.id).sort((a, b) => PR[b.priority].w - PR[a.priority].w);
  const base = Math.min(...ts.map(t => t.order));
  S.ui.pop = null;
  mutate(() => ts.forEach((t, i) => (t.order = base + i * 0.001)));
  // Persist the new ordering (positions within the status column).
  if (ts.length && proj(ts[0].project))
    sync.reorder(
      ts[0].project,
      ts[0].status,
      ts.map(t => t.id),
    );
};

/* calendar & timeline */
A.calNav = el => {
  const d = +el.dataset.d;
  const cur = parse(S.ui.calDate) || TODAY;
  S.ui.calDate = d === 0 ? iso(TODAY) : S.ui.calMode === 'month' ? iso(shiftCalendarMonth(cur, d)) : iso(addD(cur, d * 7));
  render();
};
A.tlToday = () => {
  const r = $('#tl-right');
  if (r) r.scrollTo({ left: Math.max(0, +$('.tl').dataset.tlToday - 160), behavior: 'smooth' });
};
IN.tlGroup = el => {
  S.ui.tlGroup = el.value;
  render();
};

/* projects */
IN.projQ = el => {
  S.ui.projQ = el.value;
  render();
};
IN.projStatus = el => {
  S.ui.projStatus = el.value;
  render();
};
IN.projSort = el => {
  S.ui.projSort = el.value;
  render();
};
A.clearProjFilters = () => {
  S.ui.projQ = '';
  S.ui.projStatus = 'all';
  render();
};
A.newProject = () => {
  S.ui.pform = { name: '', desc: '', icon: 'folder', color: 'indigo', team: me().team, lead: D().me, due: dOff(30), tmpl: 'blank' };
  S.ui.errors = {};
  S.ui.pop = null;
  openModal({ type: 'project' });
};
A.editProject = el => {
  const p = proj(el.dataset.id);
  S.ui.pop = null;
  S.ui.pform = { name: p.name, desc: p.desc, icon: p.icon, color: p.color, team: p.team, lead: p.lead, due: p.due, tmpl: 'blank' };
  S.ui.errors = {};
  openModal({ type: 'project', edit: p.id });
};
IN.pform = el => {
  S.ui.pform[el.dataset.f] = el.value;
  if (el.dataset.f === 'name' && S.ui.errors.pname && el.value.trim()) {
    S.ui.errors.pname = null;
    render();
  }
};
A.pformSet = el => {
  S.ui.pform[el.dataset.f] = el.dataset.v;
  if (el.dataset.f === 'tmpl') {
    const t = TEMPLATES.find(x => x.id === el.dataset.v);
    if (t && S.ui.pform.icon === 'folder') S.ui.pform.icon = t.icon === 'file' ? 'folder' : t.icon;
  }
  render();
};
export function makeKey(name) {
  let k = name
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  if (k.length < 2)
    k =
      name
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'PRJ';
  while (D().projects.some(p => p.key === k)) k += 'X';
  return k;
}
export async function createProject(f, tmplId) {
  const p = {
    id: uid('p'),
    key: makeKey(f.name),
    name: f.name,
    icon: f.icon,
    color: f.color,
    status: 'planning',
    team: f.team,
    lead: f.lead,
    due: f.due || dOff(30),
    start: dOff(0),
    fav: false,
    members: [...new Set([D().me, f.lead])],
    desc: f.desc || 'هنوز توضیحی ثبت نشده است.',
    milestones: [],
    last: 0,
  };
  mutate(() => {
    D().projects.push(p);
    D().projOrder.unshift(p.id);
    D().activity.unshift({ id: uid('a'), by: D().me, verb: 'created project', task: null, project: p.id, at: Date.now(), extra: '' });
  });
  // Create on the server first: the swap in sync.createProject updates
  // p.id in place, so کار اولیه reference the real project id.
  if (sync.lookUuid(f.team) || !f.team) await sync.createProject(p);
  else await sync.createProject({ ...p, team: null });
  const tm = TEMPLATES.find(t => t.id === tmplId);
  (tm?.tasks || []).forEach((title, i) =>
    createTask({
      project: p.id,
      title,
      status: i === 0 ? 'todo' : 'backlog',
      assignee: i === 0 ? D().me : null,
      priority: i === 0 ? 'high' : 'medium',
      due: dOff(5 + i * 5),
      start: dOff(i * 5),
    }),
  );
  return p;
}
A.submitProject = async () => {
  const m = S.ui.modals[S.ui.modals.length - 1];
  const f = S.ui.pform;
  f.name = ($('#p-name')?.value || '').trim();
  f.desc = $('#p-desc')?.value || '';
  if (!f.name) {
    S.ui.errors.pname = 'برای پروژه نامی انتخاب کنید';
    render();
    $('#p-name')?.focus();
    return;
  }
  if (m.edit) {
    const p = proj(m.edit);
    if (
      mutate(() =>
        Object.assign(p, {
          name: f.name,
          desc: f.desc,
          icon: f.icon,
          color: f.color,
          team: f.team,
          lead: f.lead,
          due: f.due,
          members: [...new Set([...p.members, f.lead])],
        }),
      )
    ) {
      // Server knows name/description/team; visuals stay client-only.
      sync.updateProject(p, { name: f.name, desc: f.desc, team: f.team });
      S.ui.modals.pop();
      render();
      toast('پروژه به‌روز شد');
    }
    return;
  }
  let p;
  try {
    p = await createProject(f, f.tmpl);
  } catch {
    return;
  }
  S.ui.modals.pop();
  go('project', { id: p.id, tab: f.tmpl === 'blank' ? 'overview' : S.prefs.defaultTab || 'board' });
  toast(`ایجاد شد ${p.name}${tasksOf(p.id).length ? ` با ${tasksOf(p.id).length} کارهای اولیه` : ''}`);
};
A.dupProject = async el => {
  const p = proj(el.dataset.id);
  S.ui.pop = null;
  let n;
  try {
    n = await createProject({ ...p, name: p.name + ' copy' }, 'blank');
  } catch {
    return;
  }
  tasksOf(p.id).forEach(t => createTask({ ...JSON.parse(JSON.stringify(t)), id: uid('t'), key: undefined, project: n.id, status: 'todo' }));
  toast(`نسخه مشابه ساخته شد ${p.name}`, { action: 'باز', onAction: () => go('project', { id: n.id }) });
};
A.archiveProject = el => {
  const p = proj(el.dataset.id);
  S.ui.pop = null;
  confirmDlg({
    title: `بایگانی ${p.name}?`,
    body: 'پروژه از نوار کناری و فهرست پروژه‌ها پنهان می‌شود. کارها، فایل‌ها و دیدگاه‌ها محفوظ می‌مانند و می‌توانید آن را از تنظیمات پروژه‌ها بازیابی کنید.',
    ok: 'بایگانی پروژه',
    icon: 'archive',
    run: () => {
      const snap = snapshot();
      if (
        mutate(() => {
          p.archived = true;
          p.archivedAt = Date.now();
        })
      ) {
        if (S.ui.route === 'project' && S.ui.params.id === p.id) go('projects');
        sync.archiveProject(p, true);
        toast(`بایگانی شد ${p.name}`, { action: 'بازگردانی', onAction: () => restore(snap) });
      }
    },
  });
};
A.restoreProject = el => {
  const p = proj(el.dataset.id);
  mutate(() => {
    p.archived = false;
    p.archivedAt = null;
  });
  sync.archiveProject(p, false);
  toast(`بازیابی شد ${p.name}`);
};
A.delProject = el => {
  const p = proj(el.dataset.id);
  S.ui.pop = null;
  const n = tasksOf(p.id).length;
  confirmDlg({
    title: `حذف ${p.name}?`,
    body: `این عملیات پروژه و موارد زیر را برای همیشه حذف می‌کند: <b>${n} task${n === 1 ? '' : 's'}</b>، فایل‌ها و دیدگاه‌های آن برای همه حذف می‌شوند. این عملیات قابل بازگشت نیست.`,
    ok: 'حذف پروژه',
    danger: true,
    typeName: p.name,
    run: () => {
      const snap = snapshot();
      if (
        mutate(() => {
          const ids = tasksOf(p.id).map(t => t.id);
          D()
            .tasks.filter(t => t.project === p.id)
            .forEach(t => ids.push(t.id));
          deleteTasks(ids);
          D().projects = D().projects.filter(x => x !== p);
          D().projOrder = D().projOrder.filter(x => x !== p.id);
          D().files = D().files.filter(f => f.project !== p.id);
        })
      ) {
        if (S.ui.route === 'project' && S.ui.params.id === p.id) go('projects');
        // The API archives rather than hard-deletes: best effort there,
        // the project disappears locally either way.
        sync.archiveProject(p, true);
        toast(`حذف شد ${p.name}`, { action: 'بازگردانی', onAction: () => restore(snap) });
      }
    },
  });
};
A.requestAccess = el => {
  const p = proj(el.dataset.id);
  toast(`درخواست دسترسی ارسال شد. به شما اطلاع می‌دهیم وقتی ${mem(p?.lead)?.name || 'مالک'} پاسخ بدهد.`);
};

/* sharing & invites */
A.share = el => {
  const id = el.dataset.id || curProjectId();
  S.ui.shareQ = '';
  S.ui.pop = null;
  openModal({ type: 'share', id });
};
IN.shareQ = el => {
  S.ui.shareQ = el.value;
  render();
};
A.shareAdd = el => {
  const p = proj(el.dataset.id);
  const m = mem(el.dataset.mid);
  mutate(() => {
    p.members.push(m.id);
  });
  sync.addProjectMember(p.id, m.id);
  S.ui.shareQ = '';
  render();
  toast(`${m.name} اکنون می‌تواند ویرایش کند: ${p.name}`);
};
A.shareInvite = () => {
  const m = S.ui.modals[S.ui.modals.length - 1];
  const p = proj(m.id);
  const v = ($('#share-in')?.value || '').trim();
  const perm = $('#share-perm')?.value;
  if (!v) {
    $('#share-in')?.focus();
    return;
  }
  const ex = D().members.find(x => x.email.toLowerCase() === v.toLowerCase() || x.name.toLowerCase() === v.toLowerCase());
  if (ex) {
    if (!p.members.includes(ex.id))
      mutate(() => {
        p.members.push(ex.id);
        p.perms = p.perms || {};
        p.perms[ex.id] = perm;
      });
    S.ui.shareQ = '';
    render();
    toast(`به اشتراک گذاشته شد با ${ex.name}`);
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(v)) {
    toast('یک نشانی ایمیل معتبر مانند name@company.com وارد کنید', { kind: 'err' });
    return;
  }
  const nm = v
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  mutate(() => {
    const id = uid('m');
    D().members.push({ id, name: nm, email: v, role: 'Guest', team: p.team, title: 'Guest', c: '#6B7280', status: 'invited', last: null, tz: '—' });
    p.members.push(id);
    p.perms = p.perms || {};
    p.perms[id] = perm;
  });
  S.ui.shareQ = '';
  render();
  toast(`دعوت‌نامه ارسال شد به ${v}`);
};
IN.sharePerm = el => {
  const p = proj(el.dataset.id);
  const mid = el.dataset.mid;
  if (el.value === '__remove') {
    const snap = snapshot();
    mutate(() => {
      p.members = p.members.filter(x => x !== mid);
    });
    toast(`حذف شد ${mem(mid).name}`, { action: 'بازگردانی', onAction: () => restore(snap) });
  } else {
    mutate(() => {
      p.perms = p.perms || {};
      p.perms[mid] = el.value;
    });
    toast(`${mem(mid).name}: ${displayLabel(el.value)}`, { ms: 1800 });
  }
};
IN.shareAccess = el => {
  const p = proj(el.dataset.id);
  mutate(() => {
    p.access = el.value;
  });
};
A.invite = () => {
  S.ui.inviteDraft = '';
  S.ui.errors = {};
  S.ui.pop = null;
  openModal({ type: 'invite' });
};
A.submitInvite = () => {
  const raw = $('#inv-emails').value;
  S.ui.inviteDraft = raw;
  const role = $('#inv-role').value;
  const team = $('#inv-team').value;
  const list = raw
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
  const bad = list.filter(e => !/^\S+@\S+\.\S+$/.test(e));
  if (!list.length) {
    S.ui.errors.invite = 'حداقل یک نشانی ایمیل وارد کنید';
    render();
    return;
  }
  if (bad.length) {
    S.ui.errors.invite = `${bad[0]} یک نشانی ایمیل معتبر نیست`;
    render();
    return;
  }
  loadingBtn('inv-submit', 600, () => {
    if (
      !mutate(() =>
        list.forEach(e => {
          if (!D().members.some(m => m.email === e))
            D().members.push({
              id: uid('m'),
              name: e
                .split('@')[0]
                .replace(/[._-]+/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase()),
              email: e,
              role,
              team,
              title: role,
              c: '#6B7280',
              status: 'invited',
              last: null,
              tz: '—',
            });
        }),
      )
    )
      return;
    S.ui.modals.pop();
    S.ui.errors = {};
    render();
    toast(`${list.length} دعوت‌نامه ارسال شد`);
  });
};
A.copyInviteLink = () => copy(`https://gr8rstudio.com/join/${D().ws.url}-7f3k2`, 'پیوند دعوت کپی شد');
A.resendInvite = el => {
  S.ui.pop = null;
  render();
  toast(`دعوت‌نامه دوباره ارسال شد به ${mem(el.dataset.id).email}`);
};
A.viewProfile = el => go('member', { id: el.dataset.id });
A.assignToMember = el => {
  S.ui.pop = null;
  A.newTask({ dataset: { assignee: el.dataset.id } });
};
A.removeMember = el => {
  const m = mem(el.dataset.id);
  S.ui.pop = null;
  const n = allTasks().filter(t => t.assignee === m.id && t.status !== 'done').length;
  confirmDlg({
    title: `حذف ${m.name}?`,
    body: `${esc(m.name)} دسترسی خود را از دست خواهد داد به ${esc(D().ws.name)} بلافاصله.${n ? ` تعداد <b>${n} کار باز</b> بدون مسئول خواهند شد.` : ''}`,
    ok: 'حذف عضو',
    danger: true,
    icon: 'user-minus',
    run: () => {
      const snap = snapshot();
      if (
        mutate(() => {
          D().members = D().members.filter(x => x !== m);
          D().tasks.forEach(t => {
            if (t.assignee === m.id) t.assignee = null;
          });
          D().projects.forEach(p => (p.members = p.members.filter(x => x !== m.id)));
        })
      ) {
        sync.removeMember(m.id);
        if (S.ui.route === 'member') go('members');
        toast(`حذف شد ${m.name}`, { action: 'بازگردانی', onAction: () => restore(snap) });
      }
    },
  });
};
IN.memQ = el => {
  S.ui.memQ = el.value;
  render();
};
IN.actWho = el => {
  S.ui.actWho = el.value;
  render();
};

/* files */
IN.fileQ = el => {
  S.ui.fileQ = el.value;
  render();
};
IN.fileType = el => {
  S.ui.fileType = el.value;
  render();
};
IN.fileSort = el => {
  S.ui.fileSort = el.value;
  render();
};
A.renameFile = el => {
  const f = D().files.find(x => x.id === el.dataset.id);
  S.ui.pop = null;
  openModal({
    type: 'prompt',
    title: 'تغییر نام فایل',
    label: 'نام فایل',
    value: f.name,
    run: v => {
      if (v)
        mutate(() => {
          f.name = v;
          f.type = fileType(v);
        });
    },
  });
};
A.dupFile = el => {
  const f = D().files.find(x => x.id === el.dataset.id);
  S.ui.pop = null;
  mutate(() => {
    const i = D().files.indexOf(f);
    D().files.splice(i + 1, 0, { ...f, id: uid('f'), name: f.name.replace(/(\.[^.]+)$/, ' copy$1'), at: Date.now(), by: D().me });
  });
  toast('نسخه مشابه فایل ساخته شد');
};
A.delFile = el => {
  const f = D().files.find(x => x.id === el.dataset.id);
  S.ui.pop = null;
  confirmDlg({
    title: 'فایل حذف شود؟',
    body: `<b>${esc(f.name)}</b> از پروژه حذف خواهد شد${f.task ? ' و کارهای آن' : ''}.`,
    ok: 'حذف فایل',
    danger: true,
    run: () => {
      const snap = snapshot();
      if (
        mutate(() => {
          D().files = D().files.filter(x => x !== f);
          if (f.task && task(f.task)) task(f.task).attachments = task(f.task).attachments.filter(a => a.name !== f.name);
        })
      ) {
        rebuildFiles();
        // Server side delete (real attachments carry `raw` context).
        if (f?.raw) sync.deleteAttachment({ project: f.raw.projectId || f.project, id: f.task }, f.id);
        toast(`حذف شد ${f.name}`, { action: 'بازگردانی', onAction: () => restore(snap) });
      }
    },
  });
};

/* inbox & notifications */
A.selNotif = el => {
  const n = D().notifs.find(x => x.id === el.dataset.id);
  n.read = true;
  S.ui.inboxSel = n.id;
  save();
  render();
};
A.toggleRead = el => {
  const n = D().notifs.find(x => x.id === el.dataset.id);
  n.read = !n.read;
  save();
  render();
};
A.markAllRead = () => {
  const n = D().notifs.filter(x => !x.read).length;
  D().notifs.forEach(x => (x.read = true));
  save();
  render();
  if (n) toast('همه موارد را دیده‌اید.');
};
A.toggleUnreadOnly = () => {
  S.ui.inboxUnread = !S.ui.inboxUnread;
  render();
};
A.openNotif = el => {
  const n = D().notifs.find(x => x.id === el.dataset.id);
  n.read = true;
  save();
  if (n.task) A.openTask({ dataset: { id: n.task } });
  else if (n.project) go('project', { id: n.project, tab: 'overview' });
};

/* search & palette */
A.openPalette = () => {
  S.ui.palOpener = focusKey(document.activeElement);
  S.ui.palette = { q: '', mode: 'cmd', scope: 'all', hl: 0 };
  S.ui.pop = null;
  render();
};
A.openSearch = () => {
  S.ui.palOpener = focusKey(document.activeElement);
  S.ui.palette = { q: '', mode: 'search', scope: 'all', hl: 0 };
  S.ui.pop = null;
  S.ui.mnav = false;
  render();
};
A.closePalette = () => {
  S.ui.palette = null;
  render();
};
A.palScope = el => {
  if (!S.ui.palette) return;
  S.ui.palette.scope = el.dataset.v;
  S.ui.palette.hl = 0;
  render();
  $('#pal-in')?.focus();
};
IN.palQ = el => {
  if (!S.ui.palette) return;
  S.ui.palette.q = el.value;
  S.ui.palette.hl = 0;
  render();
};
A.palRun = el => {
  const it = PAL_FLAT[+el.dataset.i];
  if (!it) return;
  S.ui.palette = null;
  render();
  it.run();
};
IN.searchQ = el => {
  S.ui.searchQ = el.value;
  render();
};
A.setSearch = el => {
  S.ui.searchQ = el.dataset.q;
  render();
  $('#search-page-q')?.focus();
};

/* workspace, account, prototype controls */
A.switchWs = el => {
  const w = D().workspaces.find(x => x.id === el.dataset.v);
  S.ui.pop = null;
  D().ws = { name: w.name, url: w.name.toLowerCase().replace(/[^a-z0-9]+/g, ''), c: w.c, brand: !!w.brand };
  save();
  go('home');
  toast(`تغییر داده شد به ${w.name}`);
};
A.newWorkspace = () => {
  S.ui.pop = null;
  S.ui.auth = 'onboarding';
  S.ui.onb = 1;
  S.ui.onbData.ws = '';
  S.ui.onbData.url = '';
  render();
};
A.signOut = () => {
  S.ui.pop = null;
  S.ui.palette = null;
  S.ui.drawer = null;
  S.ui.modals = [];
  S.ui.auth = 'login';
  S.ui.errors = {};
  render();
};
A.shortcuts = () => {
  S.ui.pop = null;
  S.ui.palette = null;
  openModal({ type: 'shortcuts' });
};
A.startOnboarding = () => {
  S.ui.pop = null;
  S.ui.auth = 'onboarding';
  S.ui.onb = 0;
  render();
};
A.toggleOffline = () => {
  S.ui.offline = !S.ui.offline;
  S.ui.pop = null;
  render();
  toast(S.ui.offline ? 'حالت آفلاین فعال است؛ تغییرات ذخیره نمی‌شوند' : 'دوباره متصل شدید', { kind: S.ui.offline ? 'err' : 'ok' });
};
A.retryOnline = async el => {
  el.classList.add('is-loading');
  // Re-runs the workspace hydration; the layout's boot-failed takeover
  // clears automatically when it succeeds.
  const ok = await hydrateWorkspace();
  el.classList.remove('is-loading');
  S.ui.bootFailed = !ok;
  S.ui.loading = false;
  S.ui.offline = false;
  render();
  if (ok) toast('اتصال برقرار شد. فضای کاری همگام شد.', { kind: 'ok' });
};
A.resetDemo = () => {
  S.ui.pop = null;
  confirmDlg({
    title: 'داده‌های نمایشی بازنشانی شوند؟',
    body: 'همه پروژه‌ها، کارها و تنظیمات این مرورگر به داده‌های نمایشی اولیه برمی‌گردند.',
    ok: 'بازنشانی داده‌ها',
    danger: true,
    icon: 'rotate-ccw',
    run: () => {
      S.data = seed();
      S.views = {};
      S.prefs = { ...DEFAULT_PREFS, theme: S.prefs.theme };
      S.ui.drawer = null;
      save();
      go('home');
      toast('داده‌های نمایشی بازنشانی شدند');
    },
  });
};
A.toastInfo = el => toast(el.dataset.msg, { kind: 'info' });
A.demoToast = el => {
  const v = el.dataset.v;
  if (v === 'err') toast('تغییرات شما ذخیره نشدند.', { kind: 'err', action: 'تلاش دوباره', onAction: () => toast('ذخیره شد') });
  else if (v === 'retry') {
    toast('در حال تلاش دوباره…', { kind: 'info', ms: 1200 });
    setTimeout(() => toast('با موفقیت بارگذاری شد'), 1300);
  } else toast('کار ساخت وایرفریم صفحه اصلی به وضعیت بررسی منتقل شد', { action: 'بازگردانی', onAction: () => toast('بازگردانی شد', { kind: 'info' }) });
};
A.demoConfirm = () =>
  confirmDlg({
    title: 'پروژه وب‌سایت بازاریابی بایگانی شود؟',
    body: 'پروژه از نوار کناری پنهان می‌شود. هر زمان می‌توانید آن را بازیابی کنید.',
    ok: 'بایگانی پروژه',
    icon: 'archive',
    run: () => toast('این فقط پیش‌نمایش بود؛ چیزی بایگانی نشد', { kind: 'info' }),
  });
A.demoLoad = el => {
  el.classList.add('is-loading');
  setTimeout(() => {
    el.classList.remove('is-loading');
    toast('بارگذاری شد');
  }, 1400);
};
A.reloadPage = () => {
  S.ui.loading = true;
  render();
  setTimeout(() => {
    S.ui.loading = false;
    render();
  }, 1400);
};

/* modals */
A.closeModal = () => closeModal();
A.closeModalBg = (el, e) => {
  if (e.target === el) closeModal();
};
A.confirmOk = () => {
  const m = S.ui.modals[S.ui.modals.length - 1];
  if (m.typeName && S.ui.confirmText !== m.typeName) return;
  S.ui.modals.pop();
  S.ui.confirmText = '';
  render();
  m.run && m.run();
};
IN.confirmText = el => {
  S.ui.confirmText = el.value;
  const m = S.ui.modals[S.ui.modals.length - 1];
  const b = $('.modal:last-of-type [data-a="confirmOk"]') || $$('[data-a="confirmOk"]').pop();
  if (b) b.disabled = el.value !== m.typeName;
};
A.promptSubmit = () => {
  const m = S.ui.modals[S.ui.modals.length - 1];
  const v = $('#prompt-in').value.trim();
  S.ui.modals.pop();
  render();
  m.run(v);
};
IN.noop = () => {};

/* settings */
IN.prefToggle = el => {
  S.prefs[el.dataset.k] = el.checked;
  save();
};
IN.npToggle = el => {
  D().notifPrefs[el.dataset.k] = el.checked;
  save();
  toast('ترجیحات اعلان‌ها ذخیره شد', { ms: 1500 });
};
IN.prefSel = el => {
  const k = el.dataset.k;
  S.prefs[k] = k === 'weekStart' ? +el.value : el.value;
  save();
  render();
  toast('ترجیحات ذخیره شد', { ms: 1500 });
};
A.wsColor = el => {
  D().ws.c = el.dataset.v;
  save();
  render();
};
A.saveWorkspace = () => {
  const n = $('#ws-name').value.trim();
  const u = $('#ws-url')
    .value.trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  if (!n) {
    toast('نام فضای کاری نمی‌تواند خالی باشد', { kind: 'err' });
    return;
  }
  loadingBtn('ws-save', 600, () => {
    if (
      mutate(() => {
        const old = D().ws.name;
        D().ws.name = n;
        D().ws.url = u || D().ws.url;
        const w = D().workspaces.find(x => x.name === old);
        if (w) w.name = n;
      })
    )
      toast('تنظیمات فضای کاری ذخیره شد');
  });
};
A.delWorkspace = () =>
  confirmDlg({
    title: `حذف ${D().ws.name}?`,
    body: 'همه پروژه‌ها، کارها، فایل‌ها و دیدگاه‌های این فضای کاری برای همه اعضا به‌صورت دائمی حذف می‌شوند.',
    ok: 'حذف فضای کاری',
    danger: true,
    typeName: D().ws.name,
    run: () => {
      S.data = seed();
      S.views = {};
      save();
      S.ui.auth = 'login';
      render();
      toast('فضای کاری حذف شد و داده‌های نمایشی بازنشانی شدند.', { kind: 'info', ms: 5000 });
    },
  });
A.avColor = el => {
  me().c = el.dataset.v;
  save();
  render();
};
A.saveProfile = () => {
  const n = $('#pf-name').value.trim();
  if (!n) {
    S.ui.errors.pname2 = 'نام خود را وارد کنید';
    render();
    return;
  }
  S.ui.errors.pname2 = null;
  const tt = $('#pf-title').value.trim();
  loadingBtn('pf-save', 600, () => {
    if (
      mutate(() => {
        S.prefs.name = n;
        S.prefs.title = tt;
        me().name = n;
        me().title = tt;
      })
    ) {
      // Title lives in the server's member directory; the display name
      // is a local preference.
      sync.setMemberTitle(me().id, tt);
      toast('پروفایل به‌روز شد');
    }
  });
};
IN.pwStrength = el => {
  S.ui.pwNew = el.value;
  const m = el.parentElement.querySelector('.row .strength')?.parentElement;
  const tmp = document.createElement('div');
  tmp.innerHTML = strengthMeter(el.value);
  if (m) m.replaceWith(tmp.firstElementChild || document.createTextNode(''));
  else if (tmp.firstElementChild) el.after(tmp.firstElementChild);
};
A.savePassword = () => {
  const e: Record<string, any> = (S.ui.errors = {});
  const cur = $('#pw-cur').value,
    nw = $('#pw-new').value,
    cf = $('#pw-conf').value;
  S.ui.pwDone = false;
  if (!cur) e.pwCur = 'رمز عبور فعلی خود را وارد کنید';
  if (nw.length < 10 || !/[0-9\W]/.test(nw)) e.pwNew = 'حداقل ۱۰ نویسه شامل یک عدد یا نماد وارد کنید';
  if (nw !== cf) e.pwConf = 'رمزهای عبور یکسان نیستند';
  if (Object.keys(e).length) {
    render();
    return;
  }
  loadingBtn('pw-save', 800, () => {
    S.ui.pwDone = true;
    S.ui.pwNew = '';
    render();
    toast('رمز عبور به‌روز شد');
  });
};
A.revokeSession = el => {
  mutate(() => {
    D().sessions = D().sessions.filter(s => s.id !== el.dataset.id);
  });
  toast('نشست بسته شد');
};
A.revokeAll = () =>
  confirmDlg({
    title: 'از همه نشست‌های دیگر خارج شوید؟',
    body: 'در این دستگاه وارد می‌مانید. دستگاه‌های دیگر باید دوباره وارد شوند.',
    ok: 'خروج از سایر نشست‌ها',
    danger: true,
    icon: 'log-out',
    run: () => {
      mutate(() => {
        D().sessions = D().sessions.filter(s => s.cur);
      });
      toast('از نشست‌های دیگر خارج شدید');
    },
  });
A.setup2fa = () => {
  S.ui.tfaSetup = true;
  S.ui.errors = {};
  render();
};
A.cancel2fa = () => {
  S.ui.tfaSetup = false;
  render();
};
A.verify2fa = () => {
  const v = $('#tfa-code').value.trim();
  if (!/^\d{6}$/.test(v)) {
    S.ui.errors.tfa = 'کد ۶ رقمی برنامه را وارد کنید';
    render();
    return;
  }
  S.ui.errors = {};
  mutate(() => {
    D().tfa = true;
    S.ui.tfaSetup = false;
  });
  toast('احراز هویت دومرحله‌ای فعال شد');
};
A.disable2fa = () =>
  confirmDlg({
    title: 'احراز هویت دومرحله‌ای خاموش شود؟',
    body: 'حساب شما فقط با رمز عبور محافظت خواهد شد.',
    ok: 'خاموش کردن',
    danger: true,
    icon: 'shield-off',
    run: () => {
      mutate(() => {
        D().tfa = false;
      });
      toast('احراز هویت دومرحله‌ای غیرفعال شد');
    },
  });
A.changePlan = el => {
  const v = el.dataset.v;
  const price = { Free: 0, Team: 12, Business: 24 }[v];
  confirmDlg({
    title: `${v === 'رایگان' ? 'کاهش سطح' : 'ارتقا'} to ${v}?`,
    body: `${D().members.length} عضو × $${price}/ماه = <b>$${D().members.length * price}/ماه</b>، از امروز محاسبه و از کارت ویزا با شماره پایانی ۴۲۴۲ پرداخت می‌شود.`,
    ok: v === 'رایگان' ? 'کاهش سطح' : `ارتقا to ${v}`,
    icon: 'gem',
    run: () => {
      mutate(() => {
        D().plan = v;
      });
      toast(`طرح فعلی شما: ${v}`);
    },
  });
};

/* auth */
A.auth = el => {
  S.ui.auth = el.dataset.v;
  S.ui.errors = {};
  S.ui.pwNew = '';
  render();
  setTimeout(() => $('.auth input')?.focus(), 20);
};
A.toggleShowPw = () => {
  const v = $('#l-pw')?.value;
  S.ui.showPw = !S.ui.showPw;
  render();
  const i = $('#l-pw');
  if (i) {
    i.value = v;
    i.focus();
  }
};
export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export function enterApp(msg) {
  S.ui.auth = null;
  S.ui.errors = {};
  go(S.prefs.home || 'home');
  toast(msg);
}
A.doLogin = () => {
  const e: Record<string, any> = (S.ui.errors = {});
  const em = $('#l-email').value.trim(),
    pw = $('#l-pw').value;
  S.ui.af.email = em;
  if (!em) e.email = 'نشانی ایمیل خود را وارد کنید';
  else if (!EMAIL_RE.test(em)) e.email = 'یک ایمیل معتبر مانند name@company.com وارد کنید';
  if (!pw) e.pw = 'رمز عبور خود را وارد کنید';
  if (Object.keys(e).length) {
    render();
    (e.email ? $('#l-email') : $('#l-pw'))?.focus();
    if (!e.email) $('#l-pw').value = pw;
    return;
  }
  loadingBtn('login-btn', 750, () => enterApp(`واردشده با حساب ${em}`));
};
A.socialAuth = el => {
  el.classList.add('is-loading');
  setTimeout(() => enterApp(`واردشده با ${el.dataset.v}`), 800);
};
A.doSignup = () => {
  const e: Record<string, any> = (S.ui.errors = {});
  const nm = $('#s-name').value.trim(),
    em = $('#s-email').value.trim(),
    pw = $('#s-pw').value;
  S.ui.af.name = nm;
  S.ui.af.email = em;
  if (!nm) e.name = 'نام خود را وارد کنید';
  if (!EMAIL_RE.test(em)) e.email = 'یک ایمیل کاری معتبر وارد کنید';
  if (pw.length < 10 || !/[0-9\W]/.test(pw)) e.pw = 'حداقل ۱۰ نویسه شامل یک عدد یا نماد وارد کنید';
  if (Object.keys(e).length) {
    render();
    $('#s-email').value = em;
    return;
  }
  loadingBtn('signup-btn', 800, () => {
    S.ui.auth = 'verify';
    startResend();
    render();
  });
};
export function startResend() {
  S.ui.resendT = 30;
  clearInterval((startResend as any)._i);
  (startResend as any)._i = setInterval(() => {
    S.ui.resendT--;
    const el = $('#resend-t');
    if (el) el.textContent = S.ui.resendT;
    if (S.ui.resendT <= 0) {
      clearInterval((startResend as any)._i);
      if (S.ui.auth === 'verify') render();
    }
  }, 1000);
}
A.resend = el => {
  if (el.dataset.v === 'verify') {
    startResend();
    render();
    toast(`ایمیل تأیید ارسال شد به ${S.ui.af.email}`);
  } else toast(`پیوند بازنشانی ارسال شد به ${S.ui.af.email}`);
};
A.verified = () => {
  S.ui.auth = 'onboarding';
  S.ui.onb = 0;
  S.ui.onbData.ws = '';
  S.ui.onbData.url = '';
  render();
};
A.doForgot = () => {
  const em = $('#f-email').value.trim();
  S.ui.af.email = em;
  S.ui.errors = {};
  if (!EMAIL_RE.test(em)) {
    S.ui.errors.email = 'ایمیلی را که با آن وارد می‌شوید بنویسید';
    render();
    return;
  }
  loadingBtn('forgot-btn', 700, () => {
    S.ui.auth = 'forgot-sent';
    render();
  });
};
A.doReset = () => {
  const a = $('#r-pw').value,
    b = $('#r-pw2').value;
  const e: Record<string, any> = (S.ui.errors = {});
  if (a.length < 10 || !/[0-9\W]/.test(a)) e.pw = 'حداقل ۱۰ نویسه شامل یک عدد یا نماد وارد کنید';
  if (a !== b) e.pw2 = 'رمزهای عبور یکسان نیستند';
  if (Object.keys(e).length) {
    render();
    return;
  }
  loadingBtn('reset-btn', 700, () => {
    S.ui.auth = 'reset-done';
    S.ui.pwNew = '';
    render();
  });
};

/* onboarding */
A.onbSet = el => {
  S.ui.onbData[el.dataset.k] = el.dataset.v;
  if (el.dataset.k === 'tmpl') {
    const t = TEMPLATES.find(x => x.id === el.dataset.v);
    if (t && !S.ui.onbData.projTouched) S.ui.onbData.proj = t.name === 'وب‌سایت' ? 'راه‌اندازی وب‌سایت' : t.name;
  }
  render();
};
IN.onbWs = el => {
  const o = S.ui.onbData;
  o.ws = el.value;
  if (!o.urlTouched)
    o.url = el.value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  if (S.ui.errors.ws && el.value.trim()) S.ui.errors.ws = null;
  render();
};
IN.onbUrl = el => {
  S.ui.onbData.url = el.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  S.ui.onbData.urlTouched = true;
  render();
};
IN.onbProj = el => {
  S.ui.onbData.proj = el.value;
  S.ui.onbData.projTouched = true;
};
IN.onbInv = el => {
  const a = (S.ui.onbData.invites || '').split(',');
  a[+el.dataset.i] = el.value.trim();
  S.ui.onbData.invites = a.join(',');
};
A.onbBack = () => {
  S.ui.onb = Math.max(0, S.ui.onb - 1);
  render();
};
A.onbNext = el => {
  const o = S.ui.onbData;
  if (S.ui.onb === 1 && !o.ws.trim()) {
    S.ui.errors.ws = 'برای ادامه نام فضای کاری را وارد کنید';
    render();
    $('#o-ws')?.focus();
    return;
  }
  if (S.ui.onb === 3 && !o.proj.trim()) {
    toast('برای پروژه نامی انتخاب کنید', { kind: 'err' });
    return;
  }
  if (S.ui.onb === 4 && el.dataset.skip) o.invites = '';
  if (S.ui.onb === 4 && !el.dataset.skip) {
    const bad = (o.invites || '').split(',').filter(x => x && !EMAIL_RE.test(x));
    if (bad.length) {
      toast(`${bad[0]} یک نشانی ایمیل معتبر نیست`, { kind: 'err' });
      return;
    }
  }
  S.ui.onb++;
  render();
  setTimeout(() => $('.auth input')?.focus(), 20);
};
A.onbExit = () => {
  S.ui.auth = null;
  render();
};
A.onbFinish = () => {
  const o = S.ui.onbData;
  let p;
  mutate(() => {
    if (o.ws.trim()) {
      const c = ['#2F2E2A', '#5A67D8', '#23918A', '#C54B78'][D().workspaces.length % 4];
      D().ws = { name: o.ws.trim(), url: o.url || 'workspace', c };
      if (!D().workspaces.some(w => w.name === D().ws.name)) D().workspaces.push({ id: uid('w'), name: D().ws.name, c, plan: 'رایگان' });
    }
    S.prefs.defaultTab = { kanban: 'board', list: 'list', timeline: 'timeline', table: 'table' }[o.team] || 'board';
    const tm = TEMPLATES.find(t => t.id === o.tmpl) || TEMPLATES[2];
    p = createProject(
      {
        name: o.proj.trim() || tm.name,
        icon: tm.icon === 'file' ? 'folder' : tm.icon,
        color: 'indigo',
        team: me().team,
        lead: D().me,
        desc: `هنگام راه‌اندازی ایجاد شد با ${tm.name} template.`,
      },
      tm.id,
    );
    (o.invites || '')
      .split(',')
      .filter(x => EMAIL_RE.test(x))
      .forEach(e =>
        D().members.push({
          id: uid('m'),
          name: e.split('@')[0].replace(/\b\w/g, c => c.toUpperCase()),
          email: e,
          role: 'Member',
          team: me().team,
          title: 'Member',
          c: '#6B7280',
          status: 'invited',
          last: null,
          tz: '—',
        }),
      );
  });
  S.ui.auth = null;
  go('project', { id: p.id, tab: S.prefs.defaultTab });
  toast(`خوش آمدید به ${D().ws.name}`);
};
