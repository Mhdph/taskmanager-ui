import { faNumber } from '../core/locale';
/* ---------- WORKSPACE OVERVIEW ---------- */
import { TODAY, diffD, esc, fmtDate, parse, relDate } from '../core/utils';
import { ic } from '../core/icons';
import { STATUSES } from '../core/constants';
import { D, allTasks, canSee, isOver, mem, pColor, progressOf, tasksOf, visibleProjects } from '../core/store';
import { av, pIcon, pStatus, progBar, stIcon } from '../ui/helpers';

export function pageOverview() {
  const ps = visibleProjects().filter(canSee);
  const all = allTasks();
  const done = all.filter(t => t.status === 'done').length;
  const counts = STATUSES.map(s => ({ s, n: all.filter(t => t.status === s.id).length }));
  const ms = ps
    .flatMap(p => (p.milestones || []).map(m => ({ ...m, p })))
    .filter(m => diffD(parse(m.date), TODAY) >= 0)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 6);
  const load = D()
    .members.filter(m => m.status === 'active')
    .map(m => ({ m, ts: all.filter(t => t.assignee === m.id && t.status !== 'done') }))
    .sort((a, b) => b.ts.length - a.ts.length);
  const maxL = Math.max(...load.map(l => l.ts.length), 1);
  return `<div class="page">
    <div class="ph"><div><h1>نمای کلی فضای کاری</h1><p>وضعیت سلامت پروژه‌ها در ${esc(D().ws.name)}.</p></div><div class="acts"><button class="btn btn-secondary" data-a="go" data-r="timeline">${ic('chart-gantt', 14)}خط زمانی</button><button class="btn btn-primary" data-a="newProject">${ic('plus', 14)}پروژه جدید</button></div></div>
    <div class="stats" style="margin-bottom:16px">
      <div class="stat"><span class="k">پروژه‌ها</span><span class="v">${faNumber(ps.length)}</span><span class="d">${faNumber(ps.filter(p => p.status === 'complete').length)} تکمیل‌شده</span></div>
      <div class="stat"><span class="k">کارها</span><span class="v">${faNumber(all.length)}</span><span class="d">${faNumber(all.length - done)} باز</span></div>
      <div class="stat"><span class="k">نرخ تکمیل</span><span class="v">${faNumber(Math.round((done / Math.max(all.length, 1)) * 100))}%</span><span class="d">در همه پروژه‌ها</span></div>
      <div class="stat"><span class="k">اعضا</span><span class="v">${faNumber(D().members.length)}</span><span class="d">${faNumber(D().members.filter(m => m.status === 'invited').length)} دعوت در انتظار</span></div>
    </div>
    <div class="grid2">
      <section class="panel"><div class="panel-h"><h2>سبد پروژه‌ها</h2></div>
        <div style="overflow-x:auto"><table class="perm-t" style="min-width:600px"><thead><tr><th style="padding-inline-start:14px">پروژه</th><th style="text-align:start">سرپرست</th><th style="text-align:start">وضعیت</th><th style="text-align:start;width:22%">پیشرفت</th><th>باز</th><th>عقب‌افتاده</th><th style="text-align:start">مهلت</th></tr></thead><tbody>
        ${ps
          .map(p => {
            const ts = tasksOf(p.id);
            const pr = progressOf(p.id);
            const ov = ts.filter(isOver).length;
            return `<tr style="cursor:pointer" data-a="go" data-r="project" data-id="${p.id}" data-tab="overview"><td style="padding-inline-start:14px"><span class="row">${pIcon(p, '', 14)}<span class="trunc" style="font-weight:500">${esc(p.name)}</span></span></td><td style="text-align:start"><span class="row">${av(p.lead, 'sm')}<span class="muted trunc">${esc(mem(p.lead)?.name.split(' ')[0])}</span></span></td><td style="text-align:start">${pStatus(p.status)}</td><td><span class="row">${progBar(pr, p.status === 'complete' ? 'green' : p.status === 'risk' ? 'red' : '')}<span class="num faint" style="font-size:11.5px;width:30px">${faNumber(pr)}%</span></span></td><td class="num">${faNumber(ts.filter(t => t.status !== 'done').length)}</td><td class="num" style="${ov ? 'color:var(--red)' : 'color:var(--text-3)'}">${ov}</td><td style="text-align:start" class="num muted">${fmtDate(p.due)}</td></tr>`;
          })
          .join('')}
        </tbody></table></div>
      </section>
      <div class="stack">
        <section class="panel"><div class="panel-h"><h2>کارها بر اساس وضعیت</h2></div><div class="panel-b">
          <div class="stackbar" style="height:10px;margin-bottom:12px">${counts.map(c => `<i style="width:${(c.n / Math.max(all.length, 1)) * 100}%;background:var(--st-${c.s.id})" title="${c.s.name}: ${c.n}"></i>`).join('')}</div>
          ${counts.map(c => `<div class="row" style="height:28px;font-size:13px">${stIcon(c.s.id)}<span class="grow">${c.s.name}</span><span class="num muted">${c.n}</span><span class="num faint" style="width:36px;text-align:end">${faNumber(Math.round((c.n / Math.max(all.length, 1)) * 100))}%</span></div>`).join('')}
        </div></section>
        <section class="panel"><div class="panel-h"><h2>حجم کار</h2><div class="acts"><span class="faint" style="font-size:11.5px">کارهای باز هر فرد</span></div></div><div class="panel-b">
          ${load
            .map(
              l =>
                `<div class="row" style="height:30px;font-size:13px;cursor:pointer" data-a="go" data-r="member" data-id="${l.m.id}">${av(l.m.id, 'sm', false)}<span style="width:96px" class="trunc">${esc(l.m.name.split(' ')[0])}</span><span class="grow" style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--surface-3)"><span style="display:flex;width:${(l.ts.length / maxL) * 100}%">${STATUSES.filter(
                  s => s.id !== 'done',
                )
                  .map(s => {
                    const n = l.ts.filter(t => t.status === s.id).length;
                    return n ? `<i style="display:block;flex:${n};background:var(--st-${s.id})"></i>` : '';
                  })
                  .join('')}</span></span><span class="num muted" style="width:22px;text-align:end">${faNumber(l.ts.length)}</span></div>`,
            )
            .join('')}
        </div></section>
        <section class="panel"><div class="panel-h"><h2>نقاط عطف پیش رو</h2></div><div class="panel-b">
          ${ms.map(m => `<div class="row" style="height:32px;font-size:13px;cursor:pointer" data-a="go" data-r="project" data-id="${m.p.id}" data-tab="timeline"><span style="width:9px;height:9px;transform:rotate(45deg);background:${pColor(m.p)};border-radius:2px;flex-shrink:0;margin:0 3px"></span><span class="grow trunc">${esc(m.name)} <span class="faint">· ${esc(m.p.name)}</span></span><span class="num muted">${relDate(m.date)}</span></div>`).join('') || '<div class="faint">نقطه عطفی پیش رو نیست</div>'}
        </div></section>
      </div>
    </div>
  </div>`;
}
