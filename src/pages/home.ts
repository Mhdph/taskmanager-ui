import { faNumber } from '../core/locale';
/* ---------- HOME ---------- */
import { DAY, TODAY, diffD, esc, fmtDate, parse } from '../core/utils';
import { ic } from '../core/icons';
import { D, S, allTasks, canSee, isOver, pColor, progressOf, proj, visibleProjects } from '../core/store';
import { av, avStack, empty, pIcon, pStatus, prIcon, progBar } from '../ui/helpers';
import { sortTasks } from '../shell/view-engine';
import { actHtml, miniRow } from '../components/task-list';

export function pageHome() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'صبح بخیر' : h < 18 ? 'روز بخیر' : 'عصر بخیر';
  const all = allTasks();
  const mineAll = all.filter(t => t.assignee === D().me);
  const activeP = visibleProjects().filter(p => canSee(p) && p.status !== 'complete');
  const open = all.filter(t => t.status !== 'done');
  const doneWk = all.filter(t => t.status === 'done' && t.completedAt && Date.now() - t.completedAt < 7 * DAY);
  const over = all.filter(isOver);
  const tab = S.ui.homeTab;
  const lists = {
    upcoming: sortTasks(
      mineAll.filter(t => t.status !== 'done' && !isOver(t)),
      { f: 'due', dir: 1 },
    ),
    overdue: mineAll.filter(isOver),
    completed: sortTasks(
      mineAll.filter(t => t.status === 'done'),
      { f: 'updated', dir: 1 },
    ),
  };
  const cur = lists[tab].slice(0, 7);
  const dl = (lab, a, b) => {
    const ts = sortTasks(
      open.filter(t => t.due && diffD(parse(t.due), TODAY) >= a && diffD(parse(t.due), TODAY) <= b),
      { f: 'priority', dir: 1 },
    );
    return { lab, ts };
  };
  const dls = [dl('امروز', 0, 0), dl('فردا', 1, 1), dl('این هفته', 2, 7)];
  return `<div class="page">
    <div class="ph"><div><h1>${greet}، ${esc(S.prefs.name.split(' ')[0])}</h1><p><span class="num">${new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(TODAY)}</span> · نگاهی به وضعیت فضای کاری شما.</p></div>
      <div class="acts"><button class="btn btn-secondary hide-m" data-a="invite">${ic('user-plus', 14)}دعوت عضو</button><button class="btn btn-secondary hide-m" data-a="newProject">${ic('folder-plus', 14)}پروژه جدید</button><button class="btn btn-primary" data-a="newTask">${ic('plus', 14)}کار جدید</button></div></div>
    <div class="stats" style="margin-bottom:16px">
      <button class="stat" data-a="go" data-r="projects"><span class="k">${ic('folder-kanban', 14)}پروژه‌های فعال</span><span class="v">${faNumber(activeP.length)}</span><span class="d">${faNumber(activeP.filter(p => p.status === 'risk').length)} در معرض خطر</span></button>
      <button class="stat" data-a="goTasks" data-f="open"><span class="k">${ic('circle-dashed', 14)}کارهای باز</span><span class="v">${faNumber(open.length)}</span><span class="d">${faNumber(open.filter(t => t.assignee === D().me).length)} واگذارشده به شما</span></button>
      <button class="stat" data-a="goTasks" data-f="done"><span class="k">${ic('circle-check', 14)}تکمیل‌شده</span><span class="v">${faNumber(doneWk.length)}</span><span class="d up">این هفته</span></button>
      <button class="stat" data-a="goTasks" data-f="overdue"><span class="k">${ic('clock-alert', 14)}عقب‌افتاده</span><span class="v" style="${over.length ? 'color:var(--red)' : ''}">${faNumber(over.length)}</span><span class="d ${over.length ? 'bad' : ''}">${over.length ? 'نیازمند توجه' : 'همه طبق برنامه'}</span></button>
    </div>
    <div class="grid2">
      <div class="stack">
        <section class="panel" aria-labelledby="h-mytasks">
          <div class="panel-h"><h2 id="h-mytasks">کارهای من</h2>
            <div class="acts"><div class="seg" role="tablist">${[
              ['upcoming', 'پیش رو'],
              ['overdue', 'عقب‌افتاده'],
              ['completed', 'تکمیل‌شده'],
            ]
              .map(
                ([k, n]) =>
                  `<button role="tab" class="${tab === k ? 'on' : ''}" data-a="set" data-k="homeTab" data-v="${k}">${n} <span class="faint">${faNumber(lists[k].length)}</span></button>`,
              )
              .join('')}</div>
            <button class="ibtn ibtn-sm" data-a="go" data-r="mytasks" data-tip="باز کردن کارهای من" aria-label="باز کردن کارهای من">${ic('arrow-up-right', 15)}</button></div></div>
          ${cur.length ? cur.map(t => miniRow(t, { av: false })).join('') : empty(tab === 'overdue' ? 'circle-check' : 'list-checks', tab === 'overdue' ? 'هیچ کار عقب‌افتاده‌ای ندارید' : 'اینجا کاری وجود ندارد', tab === 'overdue' ? 'همه کارهای شما طبق برنامه پیش می‌روند.' : 'برای شروع یک کار اضافه کنید.', '', 'sm')}
          ${lists[tab].length > 7 ? `<button class="addrow" style="padding-inline-start:14px;border-top:1px solid var(--divider);border-bottom:0" data-a="go" data-r="mytasks">مشاهده همه ${faNumber(lists[tab].length)} کار ${ic('arrow-right', 13)}</button>` : ''}
        </section>
        <section class="panel">
          <div class="panel-h"><h2>پیشرفت پروژه‌ها</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="go" data-r="projects">همه پروژه‌ها</button></div></div>
          <div style="overflow-x:auto"><table class="perm-t" style="min-width:560px"><thead><tr><th style="padding-inline-start:14px">پروژه</th><th style="text-align:start">وضعیت</th><th style="text-align:start;width:26%">پیشرفت</th><th style="text-align:start">مهلت</th><th style="text-align:end;padding-inline-end:14px">تیم</th></tr></thead><tbody>
          ${activeP
            .filter(canSee)
            .map(p => {
              const pr = progressOf(p.id);
              return `<tr style="cursor:pointer" data-a="go" data-r="project" data-id="${p.id}" data-tab="overview"><td style="padding-inline-start:14px"><span class="row">${pIcon(p, '', 14)}<b style="font-weight:500">${esc(p.name)}</b></span></td><td style="text-align:start">${pStatus(p.status)}</td><td><span class="row">${progBar(pr, p.status === 'risk' ? 'red' : '')}<span class="num faint" style="font-size:11.5px;width:30px">${faNumber(pr)}%</span></span></td><td style="text-align:start" class="num muted">${fmtDate(p.due)}</td><td style="text-align:end;padding-inline-end:14px">${avStack(p.members, 3)}</td></tr>`;
            })
            .join('')}
          </tbody></table></div>
        </section>
      </div>
      <div class="stack">
        <section class="panel">
          <div class="panel-h"><h2>مهلت‌های پیش رو</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="go" data-r="calendar">${ic('calendar', 13)}تقویم</button></div></div>
          <div class="panel-b" style="padding-bottom:6px">
          ${dls
            .map(
              g => `<div style="margin-bottom:10px"><div class="row" style="font-size:11.5px;font-weight:600;color:var(--text-2);margin-bottom:4px">${g.lab}<span class="faint" style="font-weight:500">${faNumber(g.ts.length)}</span></div>
            ${
              g.ts.length
                ? g.ts
                    .slice(0, 4)
                    .map(
                      t =>
                        `<div class="row" style="height:30px;cursor:pointer;gap:8px;font-size:13px" data-a="openTask" data-id="${t.id}"><span class="pdot" style="--c:${pColor(proj(t.project))}"></span><span class="trunc grow">${esc(t.title)}</span>${prIcon(t.priority, 13)}${av(t.assignee, 'sm')}</div>`,
                    )
                    .join('') +
                  (g.ts.length > 4 ? `<div class="faint" style="font-size:11.5px;padding-inline-start:16px">+${faNumber(g.ts.length - 4)} مورد دیگر</div>` : '')
                : `<div class="faint" style="font-size:12.5px;padding:4px 0 2px">مهلتی تعیین نشده</div>`
            }</div>`,
            )
            .join('')}
          </div>
        </section>
        <section class="panel">
          <div class="panel-h"><h2>فعالیت‌های اخیر</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="go" data-r="activity">مشاهده همه</button></div></div>
          <div class="panel-b feed lined">${D()
            .activity.slice(0, 7)
            .map(a => actHtml(a, { proj: true }))
            .join('')}</div>
        </section>
      </div>
    </div>
  </div>`;
}
