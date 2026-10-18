import { faNumber } from '../core/locale';
/* ---------- MY TASKS ---------- */
import { TODAY, dOff, diffD, parse } from '../core/utils';
import { ic } from '../core/icons';
import { D, S, allTasks, isOver } from '../core/store';
import { applyView, viewOf, viewToolbar } from '../shell/view-engine';
import { listHtml } from '../components/task-list';
import { calendarHtml } from '../views/calendar';

export function pageMyTasks() {
  const key = 'mytasks';
  const v = viewOf(key);
  const mine = applyView(
    allTasks().filter(t => t.assignee === D().me),
    v.sort.f === 'manual' ? { ...v, sort: { f: 'due', dir: 1 } } : v,
  );
  const groups = [
    { key: 'overdue', name: 'عقب‌افتاده', html: `<span style="color:var(--red)">${ic('clock-alert', 14)}</span>`, tasks: mine.filter(isOver), set: {} },
    {
      key: 'today',
      name: 'امروز',
      html: ic('sun', 14),
      tasks: mine.filter(t => t.status !== 'done' && t.due && diffD(parse(t.due), TODAY) === 0),
      set: { due: dOff(0) },
    },
    {
      key: 'upcoming',
      name: 'پیش رو',
      html: ic('calendar-days', 14),
      tasks: mine.filter(t => t.status !== 'done' && (!t.due || diffD(parse(t.due), TODAY) > 0)),
      set: { due: dOff(3) },
    },
    {
      key: 'completed',
      name: 'تکمیل‌شده',
      html: `<span style="color:var(--green)">${ic('circle-check', 14)}</span>`,
      tasks: mine.filter(t => t.status === 'done'),
      set: { status: 'done' },
      collapsed: true,
    },
  ];
  const mode = S.ui.myView;
  return `<div class="page flush">
    <div class="ph"><div><h1>کارهای من</h1><p>${faNumber(groups[1].tasks.length)} با مهلت امروز · ${faNumber(groups[0].tasks.length)} عقب‌افتاده · ${faNumber(groups[2].tasks.length)} پیش رو</p></div>
      <div class="acts"><div class="seg" role="tablist" aria-label="نما">${[
        ['list', 'فهرست', 'list'],
        ['calendar', 'تقویم', 'calendar'],
      ]
        .map(([k, n, i]) => `<button class="${mode === k ? 'on' : ''}" data-a="set" data-k="myView" data-v="${k}">${ic(i, 13)}${n}</button>`)
        .join('')}</div>
      <button class="btn btn-primary" data-a="newTask" data-assignee="${D().me}">${ic('plus', 14)}کار جدید</button></div></div>
    ${viewToolbar(key, { group: false })}
    ${mode === 'calendar' ? calendarHtml(mine, { key: 'my' }) : `<div class="list-wrap">${listHtml(groups, key, { cols: ['project', 'status', 'priority', 'due'], complete: true, drag: false, keepEmpty: true })}</div>`}
  </div>`;
}
