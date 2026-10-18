import { faNumber } from '../core/locale';
/* ---------- filter engine ---------- */
import { DAY, TODAY, diffD, esc, parse } from '../core/utils';
import { ic } from '../core/icons';
import { LABELS, PR, PRIOS, STATUSES } from '../core/constants';
import { D, S, canSee, isOver, mem, pColor, proj, visibleProjects } from '../core/store';
import { av, prIcon, stIcon } from '../ui/helpers';
import type { ViewState } from '#lib/state';

export const FIELDS = {
  status: { name: 'وضعیت', icon: 'circle-dot', opts: () => STATUSES.map(s => ({ id: s.id, name: s.name, html: stIcon(s.id) })) },
  assignee: {
    name: 'مسئول',
    icon: 'user',
    opts: () => [
      { id: 'none', name: 'بدون مسئول', html: av(null, 'sm', false) },
      ...D().members.map(m => ({ id: m.id, name: m.name + (m.id === D().me ? ' (you)' : ''), html: av(m.id, 'sm', false) })),
    ],
  },
  priority: { name: 'اولویت', icon: 'signal-high', opts: () => PRIOS.map(p => ({ id: p.id, name: p.name, html: prIcon(p.id) })) },
  due: {
    name: 'مهلت انجام',
    icon: 'calendar',
    opts: () => [
      { id: 'overdue', name: 'عقب‌افتاده' },
      { id: 'today', name: 'امروز' },
      { id: 'week', name: '۷ روز آینده' },
      { id: 'later', name: 'بعداً' },
      { id: 'nodate', name: 'بدون مهلت' },
    ],
  },
  project: {
    name: 'پروژه',
    icon: 'folder',
    opts: () =>
      visibleProjects()
        .filter(canSee)
        .map(p => ({ id: p.id, name: p.name, html: `<span class="pdot" style="--c:${pColor(p)}"></span>` })),
  },
  labels: { name: 'برچسب‌ها', icon: 'tag', opts: () => LABELS.map(l => ({ id: l.id, name: l.name, html: `<span class="pdot" style="--c:${l.c}"></span>` })) },
  created: {
    name: 'تاریخ ایجاد',
    icon: 'calendar-plus',
    opts: () => [
      { id: '1', name: '۲۴ ساعت گذشته' },
      { id: '7', name: '۷ روز گذشته' },
      { id: '30', name: '۳۰ روز گذشته' },
    ],
  },
  updated: {
    name: 'تاریخ به‌روزرسانی',
    icon: 'history',
    opts: () => [
      { id: '1', name: '۲۴ ساعت گذشته' },
      { id: '7', name: '۷ روز گذشته' },
      { id: '30', name: '۳۰ روز گذشته' },
    ],
  },
};
export function defaultView(): ViewState {
  return {
    filters: [],
    sort: { f: 'manual', dir: 1 },
    group: 'status',
    q: '',
    hidden: ['start', 'created', 'deps'],
    colW: {},
    showDone: true,
  };
}
/** Seed a view outside render (scripts, effects, handlers) so render functions
    templates never mutate state. Called centrally from `setRoute`. */
export function ensureView(key) {
  if (!S.views[key]) S.views[key] = defaultView();
  return S.views[key];
}
export function viewOf(key) {
  if (!S.views[key]) S.views[key] = defaultView();
  return S.views[key];
}
export function matchF(t, f) {
  if (!f.v || !f.v.length) return true;
  let hit;
  if (f.f === 'labels') hit = f.v.some(v => t.labels.includes(v));
  else if (f.f === 'assignee') hit = f.v.includes(t.assignee || 'none');
  else if (f.f === 'due') {
    hit = f.v.some(v => {
      if (v === 'nodate') return !t.due;
      if (!t.due) return false;
      const n = diffD(parse(t.due), TODAY);
      return v === 'overdue' ? isOver(t) : v === 'today' ? n === 0 : v === 'week' ? n >= 0 && n <= 7 : n > 7;
    });
  } else if (f.f === 'created' || f.f === 'updated') {
    const ts = f.f === 'created' ? t.created : t.updated;
    hit = f.v.some(v => Date.now() - ts <= +v * DAY);
  } else hit = f.v.includes(t[f.f]);
  return f.op === 'not' ? !hit : hit;
}
export function applyView(ts, v) {
  let out = ts.filter(t => v.filters.every(f => matchF(t, f)));
  if (v.q) {
    const q = v.q.toLowerCase();
    out = out.filter(t => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q));
  }
  return sortTasks(out, v.sort);
}
export function sortTasks(ts, s) {
  const d = s.dir || 1;
  const a = [...ts];
  const key =
    {
      manual: t => t.order,
      title: t => t.title.toLowerCase(),
      due: t => t.due || '9999',
      start: t => t.start || '9999',
      priority: t => -PR[t.priority || 'none'].w,
      status: t => STATUSES.findIndex(x => x.id === t.status),
      assignee: t => mem(t.assignee)?.name || 'zzz',
      created: t => -t.created,
      updated: t => -t.updated,
      estimate: t => t.estimate || 'zzz',
      project: t => proj(t.project)?.name,
    }[s.f] || (t => t.order);
  return a.sort((x, y) => {
    const p = key(x),
      q = key(y);
    return (p > q ? 1 : p < q ? -1 : 0) * d;
  });
}
export function groupTasks(ts, g) {
  if (g === 'none') return [{ key: 'all', name: 'همه کارها', html: '', tasks: ts }];
  let groups;
  if (g === 'status') groups = STATUSES.map(s => ({ key: s.id, name: s.name, html: stIcon(s.id), set: { status: s.id } }));
  else if (g === 'priority') groups = PRIOS.map(p => ({ key: p.id, name: p.name, html: prIcon(p.id), set: { priority: p.id } }));
  else if (g === 'assignee')
    groups = [
      ...D().members.map(m => ({ key: m.id, name: m.name, html: av(m.id, 'sm', false), set: { assignee: m.id } })),
      { key: 'none', name: 'بدون مسئول', html: av(null, 'sm', false), set: { assignee: null } },
    ];
  else if (g === 'project')
    groups = visibleProjects()
      .filter(canSee)
      .map(p => ({ key: p.id, name: p.name, html: `<span class="pdot" style="--c:${pColor(p)}"></span>`, set: { project: p.id } }));
  else if (g === 'due')
    groups = [
      { key: 'overdue', name: 'عقب‌افتاده' },
      { key: 'today', name: 'امروز' },
      { key: 'week', name: '۷ روز آینده' },
      { key: 'later', name: 'بعداً' },
      { key: 'nodate', name: 'بدون مهلت' },
    ].map(x => ({ ...x, html: ic('calendar', 14) }));
  groups.forEach(G => {
    G.tasks = ts.filter(t => {
      if (g === 'assignee') return (t.assignee || 'none') === G.key;
      if (g === 'due') return matchF(t, { f: 'due', op: 'is', v: [G.key] });
      return t[g] === G.key;
    });
  });
  return g === 'status' || g === 'priority' ? groups : groups.filter(G => G.tasks.length);
}
export function filterChips(key) {
  const v = viewOf(key);
  if (!v.filters.length) return '';
  const chips = v.filters
    .map((f, i) => {
      const F = FIELDS[f.f];
      const opts = F.opts();
      const names = f.v.map(id => opts.find(o => o.id === id)?.name || id);
      const val = names.length ? (names.length > 2 ? `${names.length} selected` : names.join(', ')) : 'any';
      return `${i ? '<span>and</span>' : ''}<span class="chip"><button data-a="pop" data-pop="fvals" data-key="${key}" data-i="${i}" style="display:inline-flex;gap:5px;align-items:center">${ic(F.icon, 12)}<b>${F.name}</b> ${f.op === 'not' ? 'برابر نیست با' : 'is'} <span>${esc(val)}</span></button><button class="ibtn" data-a="rmFilter" data-key="${key}" data-i="${i}" aria-label="حذف فیلتر">${ic('x', 12)}</button></span>`;
    })
    .join('');
  return `<div class="chipsbar">${ic('list-filter', 13)}${chips}<button class="btn btn-sm btn-ghost" data-a="pop" data-pop="filter" data-key="${key}">${ic('plus', 12)}افزودن</button><span class="sp"></span><button class="btn btn-sm btn-ghost" data-a="clearFilters" data-key="${key}">پاک کردن همه</button></div>`;
}
export function viewToolbar(key, opt: Record<string, any> = {}) {
  const v = viewOf(key);
  const sortName = {
    manual: 'دستی',
    title: 'عنوان',
    due: 'مهلت انجام',
    priority: 'اولویت',
    status: 'وضعیت',
    created: 'ایجاد شد',
    updated: 'به‌روز شد',
    assignee: 'مسئول',
    start: 'تاریخ شروع',
    estimate: 'برآورد زمان',
    project: 'پروژه',
  }[v.sort.f];
  return `<div class="toolbar" role="toolbar">
    <div class="inwrap">${ic('search', 13)}<input class="input search-sm" id="vq-${key}" data-in="viewQ" data-key="${key}" placeholder="جستجوی کارها" value="${esc(v.q)}" aria-label="جستجوی کارها"></div>
    <button class="btn btn-ghost ${v.filters.length ? 'on' : ''}" data-a="pop" data-pop="filter" data-key="${key}">${ic('list-filter', 14)}فیلتر${v.filters.length ? ` <span class="badge accent" style="height:16px;padding:0 5px">${faNumber(v.filters.length)}</span>` : ''}</button>
    <button class="btn btn-ghost" data-a="pop" data-pop="sort" data-key="${key}">${ic('arrow-up-down', 14)}<span class="hide-m">مرتب‌سازی:</span> ${sortName}</button>
    ${opt.group !== false ? `<button class="btn btn-ghost" data-a="pop" data-pop="group" data-key="${key}">${ic('rows-3', 14)}<span class="hide-m">گروه‌بندی:</span> ${{ status: 'وضعیت', priority: 'اولویت', assignee: 'مسئول', project: 'پروژه', due: 'مهلت انجام', none: 'هیچ‌کدام' }[v.group]}</button>` : ''}
    ${opt.cols ? `<button class="btn btn-ghost" data-a="pop" data-pop="cols" data-key="${key}">${ic('columns-3', 14)}Columns</button>` : ''}
    ${opt.extra || ''}
    <span class="sp"></span>
    ${opt.right || ''}
  </div>${filterChips(key)}`;
}
