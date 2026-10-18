/* =====================================================================
   PROJECT PAGE + VIEWS: overview, board, list, table, calendar, timeline, files, activity
   ===================================================================== */
import { esc } from '../core/utils';
import { ic } from '../core/icons';
import { PSTAT } from '../core/constants';
import { D, S, canSee, proj, tasksOf } from '../core/store';
import { avStack, empty, pIcon } from '../ui/helpers';
import { applyView, groupTasks, viewOf, viewToolbar } from '../shell/view-engine';
import { listHtml } from '../components/task-list';
import { page404, stateDenied } from './errors';
import { projActivity, projOverview } from '../views/project-overview';
import { boardHtml } from '../views/board';
import { tableHtml } from '../views/table';
import { calendarHtml } from '../views/calendar';
import { timelineHtml, tlControls } from '../views/timeline';
import { filesHtml } from '../views/files';

export const PTABS = [
  ['overview', 'نمای کلی', 'layout-dashboard'],
  ['board', 'تابلو', 'square-kanban'],
  ['list', 'فهرست', 'list'],
  ['table', 'جدول', 'table-2'],
  ['calendar', 'تقویم', 'calendar'],
  ['timeline', 'خط زمانی', 'chart-gantt'],
  ['files', 'فایل‌ها', 'paperclip'],
  ['activity', 'فعالیت‌ها', 'activity'],
];

export function pageProject() {
  const p = proj(S.ui.params.id);
  if (!p) return page404();
  if (!canSee(p)) return stateDenied(p);
  const tab = S.ui.params.tab || 'board';
  if (!PTABS.some(([name]) => name === tab) && !tab.startsWith('v:')) return page404();
  const views = D().savedViews.filter(v => v.project === p.id);
  let body = '';
  const key = 'p:' + p.id;
  const ts = tasksOf(p.id);
  if (tab.startsWith('v:')) {
    const sv = views.find(v => 'v:' + v.id === tab);
    if (!sv) body = page404();
    else {
      const k = 'sv:' + sv.id;
      if (!S.views[k]) {
        const view = viewOf(k);
        view.filters = JSON.parse(JSON.stringify(sv.filters));
      }
      body = taskViewBody(sv.type, applyView(ts, viewOf(k)), k, p);
    }
  } else if (tab === 'overview') body = projOverview(p);
  else if (tab === 'files') body = filesHtml(p.id);
  else if (tab === 'activity') body = projActivity(p);
  else body = taskViewBody(tab, applyView(ts, viewOf(key)), key, p);

  return `<div class="page flush">
    <div class="proj-h">
      <div class="t">
        ${pIcon(p, 'lg', 18)}
        <h1>${esc(p.name)}</h1>
        <button class="ibtn ibtn-sm" data-a="toggleFavProj" data-id="${p.id}" data-tip="${p.fav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}" aria-pressed="${p.fav}" aria-label="افزودن به علاقه‌مندی‌ها" style="${p.fav ? 'color:var(--amber)' : ''}">${ic('star', 15)}</button>
        <button class="pillbtn bordered" data-a="pop" data-pop="pstatus" data-id="${p.id}" aria-label="وضعیت پروژه" style="height:24px"><span class="pdot" style="--c:${PSTAT[p.status].c};border-radius:50%;width:7px;height:7px"></span>${PSTAT[p.status].name}${ic('chevron-down', 12)}</button>
        <span class="sp"></span>
        <div class="row" style="gap:4px">
          <button class="row" data-a="share" data-id="${p.id}" aria-label="اعضا" style="gap:0">${avStack(p.members, 5, 'md')}</button>
          <button class="ibtn ibtn-sm" data-a="share" data-id="${p.id}" data-tip="افزودن عضو" aria-label="افزودن عضو">${ic('user-plus', 15)}</button>
          <button class="btn btn-secondary btn-sm hide-m" data-a="share" data-id="${p.id}">${ic('share-2', 13)}اشتراک‌گذاری</button>
          <button class="ibtn ibtn-sm" data-a="editProject" data-id="${p.id}" data-tip="تنظیمات پروژه" aria-label="تنظیمات پروژه">${ic('settings', 15)}</button>
          <button class="ibtn ibtn-sm" data-a="ctxBtn" data-ctx="project" data-id="${p.id}" aria-label="بیشتر">${ic('ellipsis', 15)}</button>
        </div>
      </div>
      <nav class="tabs" aria-label="نماهای پروژه">
        ${PTABS.map(([k, n, i]) => `<button ${tab === k ? 'aria-current="page"' : ''} class="tab ${tab === k ? 'on' : ''}" data-a="go" data-r="project" data-id="${p.id}" data-tab="${k}">${ic(i, 14)}${n}</button>`).join('')}
        ${views.map(v => `<button ${tab === 'v:' + v.id ? 'aria-current="page"' : ''} class="tab ${tab === 'v:' + v.id ? 'on' : ''}" data-a="go" data-r="project" data-id="${p.id}" data-tab="v:${v.id}" data-ctx="savedview" data-vid="${v.id}">${ic('list-filter', 14)}${esc(v.name)}</button>`).join('')}
        <button class="tab" data-a="saveView" data-id="${p.id}" data-tip="ذخیره فیلترهای فعلی به‌عنوان نما" aria-label="ذخیره نما">${ic('plus', 14)}</button>
      </nav>
    </div>
    <div class="pbody${S.ui.fx.tab ? ' fx-tab' : ''}">${body}</div>
  </div>`;
}
export function taskViewBody(type, ts, key, p) {
  const v = viewOf(key);
  const addBtn = `<button class="btn btn-primary btn-sm" data-a="newTask" data-project="${p.id}">${ic('plus', 13)}کار جدید</button>`;
  const noTasks = !tasksOf(p.id).length;
  const emptyAll = empty(
    'list-checks',
    'اینجا کاری وجود ندارد',
    'برای شروع یک کار اضافه کنید.',
    `<button class="btn btn-primary btn-sm" data-a="newTask" data-project="${p.id}">${ic('plus', 14)}افزودن کار</button>`,
  );
  const emptyFilter = empty(
    'search-x',
    'نتیجه‌ای پیدا نشد',
    'کاری مطابق این فیلترها پیدا نشد.',
    `<button class="btn btn-secondary btn-sm" data-a="clearFilters" data-key="${key}">پاک کردن فیلترها</button>`,
  );
  if (type === 'board') return viewToolbar(key, { group: false, right: addBtn }) + (noTasks ? emptyAll : boardHtml(ts, key, { project: p.id }));
  if (type === 'list')
    return (
      viewToolbar(key, { right: addBtn }) +
      `<div class="list-wrap">${noTasks ? emptyAll : !ts.length ? emptyFilter : listHtml(groupTasks(ts, v.group), key, { project: p.id })}</div>`
    );
  if (type === 'table') return viewToolbar(key, { cols: true, right: addBtn }) + (noTasks ? emptyAll : tableHtml(ts, key, p));
  if (type === 'calendar') return viewToolbar(key, { group: false, right: addBtn }) + calendarHtml(ts, { key, project: p.id, events: true });
  if (type === 'timeline') return viewToolbar(key, { group: false, right: addBtn, extra: tlControls() }) + timelineHtml(ts, key, p);
  return page404();
}
