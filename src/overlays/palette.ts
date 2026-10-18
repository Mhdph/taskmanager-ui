/* ---------------- COMMAND PALETTE ---------------- */
import { MOD, clamp, esc } from '../core/utils';
import { LOGO, ic, wsLogo } from '../core/icons';
import { PSTAT } from '../core/constants';
import { D, S, allTasks, pColor, proj, save, task, visibleProjects } from '../core/store';
import { FT, av, hl, stIcon } from '../ui/helpers';
import { effectiveDark } from '../core/theme';
import { go, render } from '../shell/render';
import { sortTasks } from '../shell/view-engine';
import { searchAll } from '../pages/search';
import { openModal } from './modals';
import { A } from '../actions/actions';

/* Flat item list of the last rendered palette (keyboard/click dispatch).
   Kept outside workspace state so rendering does not notify subscribers. */
export let PAL_FLAT: any[] = [];

export function commands() {
  return [
    { id: 'c-task', name: 'ایجاد کار', icon: 'plus', kbd: 'N', run: () => A.newTask(document.body) },
    { id: 'c-proj', name: 'ایجاد پروژه', icon: 'folder-plus', kbd: 'P', run: () => A.newProject() },
    {
      id: 'c-search',
      name: 'جستجو در فضای کاری',
      icon: 'search',
      kbd: '/',
      run: () => {
        S.ui.palette = { q: '', mode: 'search', scope: 'all', hl: 0 };
        render();
      },
    },
    { id: 'c-home', name: 'رفتن به خانه', icon: 'house', kbd: 'G H', run: () => go('home') },
    { id: 'c-inbox', name: 'رفتن به صندوق ورودی', icon: 'inbox', kbd: 'G I', run: () => go('inbox') },
    { id: 'c-my', name: 'رفتن به کارهای من', icon: 'circle-check', kbd: 'G T', run: () => go('mytasks') },
    { id: 'c-projs', name: 'رفتن به پروژه‌ها', icon: 'folder-kanban', kbd: 'G P', run: () => go('projects') },
    { id: 'c-cal', name: 'رفتن به تقویم', icon: 'calendar', kbd: 'G C', run: () => go('calendar') },
    { id: 'c-tl', name: 'رفتن به خط زمانی', icon: 'chart-gantt', run: () => go('timeline') },
    { id: 'c-mem', name: 'رفتن به اعضا', icon: 'users', run: () => go('members') },
    { id: 'c-set', name: 'باز کردن تنظیمات', icon: 'settings', kbd: 'G S', run: () => go('settings') },
    { id: 'c-app', name: 'تنظیمات ظاهر', icon: 'palette', run: () => go('settings', { sec: 'appearance' }) },
    {
      id: 'c-ws',
      name: 'تغییر فضای کاری…',
      icon: 'arrow-left-right',
      run: () => {
        S.ui.palette = { q: '', mode: 'ws', hl: 0 };
        render();
      },
    },
    {
      id: 'c-dark',
      name: effectiveDark() ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره',
      icon: effectiveDark() ? 'sun' : 'moon',
      kbd: MOD + ' ⇧ L',
      run: () => A.toggleDark(),
    },
    { id: 'c-inv', name: 'دعوت عضو', icon: 'user-plus', run: () => A.invite() },
    { id: 'c-side', name: 'تغییر نمایش نوار کناری', icon: 'panel-left', kbd: '[', run: () => A.toggleSide() },
    { id: 'c-keys', name: 'میانبرهای صفحه‌کلید', icon: 'keyboard', kbd: '?', run: () => A.shortcuts() },
    { id: 'c-out', name: 'خروج', icon: 'log-out', run: () => A.signOut() },
  ];
}
export function paletteItems() {
  const pl = S.ui.palette;
  if (!pl) return [];
  const q = pl.q.trim();
  const ql = q.toLowerCase();
  const groups: any[] = [];
  if (pl.mode === 'ws') {
    groups.push({
      name: 'تغییر فضای کاری',
      items: D()
        .workspaces.filter(w => !q || w.name.toLowerCase().includes(ql))
        .map(w => ({ html: `${wsLogo(w, 20)}`, name: w.name, sub: w.plan + ' plan', run: () => A.switchWs({ dataset: { v: w.id } }) })),
    });
    return groups;
  }
  if (pl.mode === 'cmd') {
    const cmds = commands().filter(c => !q || c.name.toLowerCase().includes(ql));
    if (!q) {
      groups.push({ name: 'پیشنهادها', items: cmds.slice(0, 3).concat(cmds.filter(c => c.id === 'c-dark' || c.id === 'c-ws')) });
      const recent = sortTasks(
        allTasks().filter(t => t.assignee === D().me || t.fav),
        { f: 'updated', dir: 1 },
      ).slice(0, 4);
      groups.push({
        name: 'کارهای اخیر',
        items: recent.map(t => ({
          html: stIcon(t.status),
          name: t.title,
          sub: proj(t.project).name,
          r: t.key,
          run: () => A.openTask({ dataset: { id: t.id } }),
        })),
      });
      groups.push({ name: 'ناوبری', items: cmds.filter(c => c.id.startsWith('c-') && c.name.startsWith('رفتن به')) });
      return groups;
    }
    if (cmds.length) groups.push({ name: 'فرمان‌ها', items: cmds.slice(0, 5) });
  }
  const r = searchAll(q);
  const sc = pl.mode === 'search' ? pl.scope : 'all';
  const lim = sc === 'all' ? 4 : 12;
  if (pl.mode === 'search' && !q) {
    groups.push({
      name: 'جستجوهای اخیر',
      items: D().recentSearches.map(s => ({
        icon: 'history',
        name: s,
        run: () => {
          pl.q = s;
          pl.hl = 0;
          render();
        },
      })),
    });
    const firstProject = visibleProjects()[0];
    groups.push({
      name: 'پیشنهادی',
      items: [
        { icon: 'clock-alert', name: 'کارهای عقب‌افتاده', run: () => A.goTasks({ dataset: { f: 'overdue' } }) },
        { icon: 'user', name: 'کارهای واگذارشده به من', run: () => go('mytasks') },
        {
          icon: 'signal-high',
          name: 'با اولویت زیاد در ' + (firstProject?.name || 'یک پروژه'),
          run: () => {
            if (firstProject) go('project', { id: firstProject.id, tab: 'board' });
          },
        },
        {
          icon: 'paperclip',
          name: 'فایل‌ها در ' + (firstProject?.name || 'یک پروژه'),
          run: () => {
            if (firstProject) go('project', { id: firstProject.id, tab: 'files' });
          },
        },
      ],
    });
    return groups;
  }
  if (!q) return groups;
  if (sc === 'all' || sc === 'tasks')
    groups.push({
      name: 'کارها',
      items: r.tasks
        .slice(0, lim)
        .map(t => ({ html: stIcon(t.status), name: t.title, sub: proj(t.project).name, r: t.key, run: () => A.openTask({ dataset: { id: t.id } }) })),
    });
  if (sc === 'all' || sc === 'projects')
    groups.push({
      name: 'پروژه‌ها',
      items: r.projects.slice(0, lim).map(p => ({
        html: `<span class="pdot" style="--c:${pColor(p)}"></span>`,
        name: p.name,
        sub: PSTAT[p.status].name,
        run: () => go('project', { id: p.id }),
      })),
    });
  if (sc === 'all' || sc === 'people')
    groups.push({
      name: 'افراد',
      items: r.people.slice(0, lim).map(m => ({ html: av(m.id, 'sm', false), name: m.name, sub: m.title, run: () => go('member', { id: m.id }) })),
    });
  if (sc === 'all' || sc === 'files')
    groups.push({
      name: 'فایل‌ها',
      items: r.files.slice(0, lim).map(f => ({
        icon: FT[f.type].i,
        name: f.name,
        sub: proj(f.project).name,
        r: f.size,
        run: () => openModal({ type: 'filePreview', file: f, tid: f.task }),
      })),
    });
  if (sc === 'all' || sc === 'comments')
    groups.push({
      name: 'دیدگاه‌ها',
      items: r.comments
        .slice(0, lim)
        .map(c => ({ html: av(c.by, 'sm', false), name: c.text, sub: 'on ' + task(c.task).title, run: () => A.openTask({ dataset: { id: c.task } }) })),
    });
  const out = groups.filter(g => g.items.length);
  out.push({
    name: '',
    items: [
      {
        icon: 'search',
        name: `مشاهده همه نتایج برای «${q}”`,
        run: () => {
          S.ui.searchQ = q;
          S.ui.searchCat = sc;
          if (!D().recentSearches.includes(q)) D().recentSearches.unshift(q);
          D().recentSearches = D().recentSearches.slice(0, 5);
          save();
          go('search');
        },
      },
    ],
  });
  return out;
}
export function paletteHtml() {
  const pl = S.ui.palette;
  if (!pl) return '';
  const groups = paletteItems();
  const flat = groups.flatMap(g => g.items);
  // NOTE: render must not mutate workspace state (`pl` is a reactive proxy).
  // The flat item list lives in a module var for keyboard/click handlers.
  PAL_FLAT = flat;
  const hlIdx = clamp(pl.hl, 0, Math.max(flat.length - 1, 0));
  let idx = 0;
  const ph =
    pl.mode === 'search' ? 'جستجوی کارها، پروژه‌ها، افراد، فایل‌ها و دیدگاه‌ها…' : pl.mode === 'ws' ? 'جستجوی فضای کاری…' : 'فرمانی بنویسید یا جستجو کنید…';
  return `<div class="palette" role="dialog" aria-modal="true" aria-label="فهرست فرمان‌ها">
    <div class="pal-in">${ic(pl.mode === 'search' ? 'search' : 'command', 17)}${pl.mode !== 'cmd' ? `<span class="badge" style="flex-shrink:0">${pl.mode === 'search' ? 'جستجو' : 'فضای کاری'}</span>` : ''}<input id="pal-in" data-in="palQ" value="${esc(pl.q)}" placeholder="${ph}" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-activedescendant="pi-${hlIdx}">><kbd>Esc</kbd></div>
    ${
      pl.mode === 'search'
        ? `<div class="pal-scope" role="tablist">${[
            ['all', 'همه', 'layers'],
            ['tasks', 'کارها', 'circle-check'],
            ['projects', 'پروژه‌ها', 'folder'],
            ['people', 'افراد', 'users'],
            ['files', 'فایل‌ها', 'paperclip'],
            ['comments', 'دیدگاه‌ها', 'message-square'],
          ]
            .map(([k, n, i]) => `<button role="tab" class="${pl.scope === k ? 'on' : ''}" data-a="palScope" data-v="${k}">${ic(i, 12)}${n}</button>`)
            .join('')}</div>`
        : ''
    }
    <div class="pal-list" id="pal-list" role="listbox">${
      flat.length
        ? groups
            .map(
              g =>
                `<div class="pal-group">${g.name ? `<div class="pal-sec">${g.name}</div>` : ''}${g.items
                  .map(it => {
                    const i = idx++;
                    return `<div class="pi ${i === hlIdx ? 'hl' : ''}" id="pi-${i}" role="option" aria-انتخاب‌شده="${i === hlIdx}" data-a="palRun" data-i="${i}" data-hover-i="${i}">${it.html || ic(it.icon || 'circle', 15)}<span class="trunc">${hl(it.name, pl.q.trim())}</span>${it.sub ? `<span class="sub">${esc(it.sub)}</span>` : ''}<span class="r">${it.r ? `<span class="mono">${esc(it.r)}</span>` : ''}${
                      it.kbd
                        ? it.kbd
                            .split(' ')
                            .map(k => `<kbd>${k}</kbd>`)
                            .join('')
                        : ''
                    }</span></div>`;
                  })
                  .join('')}</div>`,
            )
            .join('')
        : `<div class="empty-state sm"><div class="glyph">${ic('search-x', 18)}</div><h2 class="es-h">نتیجه‌ای پیدا نشد</h2><p>عبارت دیگری را امتحان کنید یا با Tab در همه موارد جستجو کنید.</p></div>`
    }</div>
    <div class="pal-f"><span><kbd>↑</kbd><kbd>↓</kbd>navigate</span><span><kbd>↵</kbd>select</span>${pl.mode === 'cmd' ? '<span><kbd>Tab</kbd>search mode</span>' : '<span><kbd>⌫</kbd>back to commands</span>'}<span class="sp" style="flex:1"></span><span>${LOGO(12)}</span></div>
  </div>`;
}
