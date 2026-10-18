import { faNumber } from '../core/locale';
/* ---------- OVERVIEW ---------- */
import { TODAY, dayBucket, diffD, esc, fmtDate, parse } from '../core/utils';
import { ic } from '../core/icons';
import { STATUSES } from '../core/constants';
import { D, TM, isOver, mem, pColor, progressOf, task, tasksOf } from '../core/store';
import { av, avStack, empty, pStatus, stIcon } from '../ui/helpers';
import { sortTasks } from '../shell/view-engine';
import { actHtml, miniRow } from '../components/task-list';

export function projOverview(p) {
  const ts = tasksOf(p.id);
  const pr = progressOf(p.id);
  const cnt = STATUSES.map(s => ({ s, n: ts.filter(t => t.status === s.id).length }));
  const over = ts.filter(isOver);
  const soon = sortTasks(
    ts.filter(t => t.status !== 'done' && t.due),
    { f: 'due', dir: 1 },
  ).slice(0, 6);
  const acts = D()
    .activity.filter(a => a.project === p.id)
    .slice(0, 6);
  const daysLeft = diffD(parse(p.due), TODAY);
  return `<div class="page" style="max-width:1160px;padding-top:22px">
    <div class="grid2">
      <div class="stack">
        <section class="panel"><div class="panel-h"><h2>About</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="editProject" data-id="${p.id}">${ic('pencil', 13)}ویرایش</button></div></div><div class="panel-b" style="font-size:14px;line-height:1.6;color:var(--text)">${esc(p.desc)}</div></section>
        <section class="panel"><div class="panel-h"><h2>پیشرفت</h2><div class="acts"><span class="faint" style="font-size:12px">${faNumber(ts.filter(t => t.status === 'done').length)} از ${faNumber(ts.length)} کار انجام‌شده</span></div></div>
          <div class="panel-b">
            <div class="row" style="align-items:baseline;gap:10px;margin-bottom:10px"><span style="font-size:30px;font-weight:600;letter-spacing:-.03em" class="num">${faNumber(pr)}%</span><span class="muted">${daysLeft >= 0 ? `${daysLeft} روز تا ${fmtDate(p.due)}` : `پایان ${fmtDate(p.due)}`}</span>${over.length ? `<span class="badge red">${ic('clock-alert', 11)}${faNumber(over.length)} عقب‌افتاده</span>` : ''}</div>
            <div class="stackbar" style="height:8px;margin-bottom:12px">${cnt.map(c => `<i style="width:${(c.n / Math.max(ts.length, 1)) * 100}%;background:var(--st-${c.s.id})" title="${c.s.name}: ${c.n}"></i>`).join('')}</div>
            <div class="row" style="flex-wrap:wrap;gap:14px;font-size:12.5px">${cnt.map(c => `<button class="row" style="gap:5px" data-a="goFilteredList" data-id="${p.id}" data-st="${c.s.id}">${stIcon(c.s.id, 12)}<span class="muted">${c.s.name}</span><b class="num" style="font-weight:600">${c.n}</b></button>`).join('')}</div>
          </div></section>
        <section class="panel"><div class="panel-h"><h2>پیش رو</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="go" data-r="project" data-id="${p.id}" data-tab="list">مشاهده فهرست</button></div></div>${soon.map(t => miniRow(t, { noProj: true })).join('') || empty('circle-check', 'چیزی زمان‌بندی نشده', 'کارهایی که مهلت انجام دارند اینجا نمایش داده می‌شوند.', '', 'sm')}</section>
      </div>
      <div class="stack">
        <section class="panel"><div class="panel-h"><h2>جزئیات</h2></div><div class="panel-b"><dl class="kv">
          <dt>${ic('circle-dot', 14)}وضعیت</dt><dd><button class="pillbtn" data-a="pop" data-pop="pstatus" data-id="${p.id}">${pStatus(p.status)}</button></dd>
          <dt>${ic('user', 14)}سرپرست</dt><dd><span class="pillbtn">${av(p.lead, 'sm', false)}${esc(mem(p.lead)?.name)}</span></dd>
          <dt>${ic('users', 14)}تیم</dt><dd><button class="pillbtn" data-a="go" data-r="team" data-id="${p.team}">${ic(TM[p.team].icon, 13)}${TM[p.team].name}</button></dd>
          <dt>${ic('calendar', 14)}Start</dt><dd><span class="pillbtn num">${fmtDate(p.start, true)}</span></dd>
          <dt>${ic('flag', 14)}مهلت</dt><dd><span class="pillbtn num">${fmtDate(p.due, true)}</span></dd>
          <dt>${ic('user-plus', 14)}اعضا</dt><dd><button class="pillbtn" data-a="share" data-id="${p.id}">${avStack(p.members, 6)}<span class="faint">${faNumber(p.members.length)}</span></button></dd>
        </dl></div></section>
        <section class="panel"><div class="panel-h"><h2>نقاط عطف</h2></div><div class="panel-b">${
          (p.milestones || [])
            .map(m => {
              const n = diffD(parse(m.date), TODAY);
              return `<div class="row" style="height:32px;font-size:13px"><span style="width:9px;height:9px;transform:rotate(45deg);border-radius:2px;flex-shrink:0;margin:0 3px;background:${n < 0 ? 'var(--green)' : pColor(p)}"></span><span class="grow trunc ${n < 0 ? 'faint' : ''}">${esc(m.name)}</span><span class="num muted">${fmtDate(m.date)}</span></div>`;
            })
            .join('') || '<span class="faint">هنوز نقطه عطفی وجود ندارد</span>'
        }</div></section>
        <section class="panel"><div class="panel-h"><h2>فعالیت‌های اخیر</h2><div class="acts"><button class="btn btn-sm btn-ghost" data-a="go" data-r="project" data-id="${p.id}" data-tab="activity">مشاهده همه</button></div></div><div class="panel-b feed">${acts.map(a => actHtml(a)).join('') || '<span class="faint">هنوز فعالیتی ثبت نشده</span>'}</div></section>
      </div>
    </div>
  </div>`;
}
export function projActivity(p) {
  const as = D().activity.filter(a => a.project === p.id);
  const cs = D()
    .comments.filter(c => task(c.task)?.project === p.id)
    .map(c => ({ id: c.id, by: c.by, verb: 'دیدگاهی نوشت برای', task: c.task, project: p.id, at: c.at, extra: '' }));
  const all = [...as, ...cs].sort((a, b) => b.at - a.at);
  const b: Record<string, any> = {};
  all.forEach(a => (b[dayBucket(a.at)] ||= []).push(a));
  return `<div class="page" style="max-width:780px;padding-top:18px">${
    all.length
      ? Object.entries(b)
          .map(([k, list]) => `<div class="day-h">${k}</div><div class="feed lined">${list.map(a => actHtml(a)).join('')}</div>`)
          .join('')
      : empty('activity', 'هنوز فعالیتی ثبت نشده', 'تغییرات این پروژه اینجا نمایش داده می‌شوند.')
  }</div>`;
}
