import { faNumber } from '../core/locale';
/* ---------- PROJECTS ---------- */
import { ago, esc, fmtDate, minsAgo } from '../core/utils';
import { ic } from '../core/icons';
import { PSTAT } from '../core/constants';
import { S, TM, canSee, mem, progressOf, tasksOf, visibleProjects } from '../core/store';
import { av, avStack, empty, pIcon, pStatus, progBar } from '../ui/helpers';

export function projectCard(p) {
  const ts = tasksOf(p.id);
  const pr = progressOf(p.id);
  const open = ts.filter(t => t.status !== 'done').length;
  const locked = !canSee(p);
  return `<div class="pcard" data-a="go" data-r="project" data-id="${p.id}" data-ctx="project" role="link" tabindex="0" aria-label="${esc(p.name)}">
    <div class="row">${pIcon(p)}<div class="grow" style="min-width:0"><div class="row" style="gap:6px"><b class="trunc" style="font-weight:600;font-size:14px">${esc(p.name)}</b>${p.fav ? `<span style="color:var(--amber)">${ic('star', 12)}</span>` : ''}${p.private ? `<span class="faint" data-tip="پروژه خصوصی">${ic('lock', 12)}</span>` : ''}</div></div>${pStatus(p.status)}</div>
    <div class="desc">${esc(p.desc)}</div>
    ${locked ? `<div class="row faint" style="font-size:12px">${ic('lock', 12)}محدود؛ برای مشاهده کارها درخواست دسترسی بدهید</div>` : `<div class="row" style="gap:10px">${progBar(pr, p.status === 'complete' ? 'green' : p.status === 'risk' ? 'red' : '')}<span class="num" style="font-size:12px;font-weight:500">${faNumber(pr)}%</span></div>`}
    <div class="foot"><span class="row" style="gap:4px">${ic('circle-check', 12)}${locked ? '—' : `${ts.length - open}/${ts.length}`}</span><span class="row" style="gap:4px">${ic('calendar', 12)}${fmtDate(p.due)}</span><span class="row hide-m" style="gap:4px">${ic('clock', 12)}${ago(minsAgo(p.last))}</span><span class="sp"></span>${avStack(p.members, 3)}</div>
    <button class="ibtn ibtn-sm more" data-a="ctxBtn" data-ctx="project" data-id="${p.id}" aria-label="گزینه‌های پروژه" style="background:var(--surface);box-shadow:0 0 0 1px var(--border)">${ic('ellipsis', 14)}</button>
  </div>`;
}
export function pageProjects() {
  const u = S.ui;
  const q = (u.projQ || '').toLowerCase();
  const st = u.projStatus || 'all';
  const sort = u.projSort || 'recent';
  const ps = visibleProjects().filter(p => (st === 'all' || p.status === st) && (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
  const sorter = { recent: p => p.last, name: p => p.name, due: p => p.due, progress: p => -progressOf(p.id) }[sort];
  ps.sort((a, b) => (sorter(a) > sorter(b) ? 1 : -1));
  const view = u.projView;
  let body;
  if (!visibleProjects().length)
    body = `<div class="panel">${empty('folder-kanban', 'هنوز پروژه‌ای وجود ندارد', 'برای سامان‌دهی کارها، اولین پروژه‌تان را ایجاد کنید.', `<button class="btn btn-primary btn-sm" data-a="newProject">${ic('plus', 14)}ایجاد پروژه</button>`)}</div>`;
  else if (!ps.length)
    body = `<div class="panel">${empty('search-x', 'نتیجه‌ای پیدا نشد', 'پروژه‌ای مطابق جستجو یا فیلترها پیدا نشد. عبارت دیگری را امتحان کنید.', `<button class="btn btn-secondary btn-sm" data-a="clearProjFilters">پاک کردن فیلترها</button>`)}</div>`;
  else if (view === 'grid') body = `<div class="pgrid">${ps.map(projectCard).join('')}</div>`;
  else if (view === 'list')
    body = `<div class="panel" style="overflow:hidden">${ps
      .map(p => {
        const pr = progressOf(p.id);
        return `<div class="mini" style="min-height:52px;gap:12px" data-a="go" data-r="project" data-id="${p.id}" data-ctx="project">${pIcon(p)}<div class="grow" style="min-width:0"><div class="row" style="gap:6px"><b style="font-weight:500">${esc(p.name)}</b>${p.private ? ic('lock', 12) : ''}</div><div class="trunc faint" style="font-size:12px">${esc(p.desc)}</div></div><span class="hide-m">${pStatus(p.status)}</span><span class="row hide-m" style="width:140px">${progBar(pr)}<span class="num faint" style="font-size:11.5px">${faNumber(pr)}%</span></span><span class="num muted hide-m" style="width:70px;font-size:12px">${fmtDate(p.due)}</span>${avStack(p.members, 3)}<button class="ibtn ibtn-sm" data-a="ctxBtn" data-ctx="project" data-id="${p.id}" aria-label="گزینه‌ها">${ic('ellipsis', 14)}</button></div>`;
      })
      .join('')}</div>`;
  else
    body = `<div class="panel" style="overflow-x:auto"><table class="perm-t" style="min-width:860px"><thead><tr><th style="padding-inline-start:14px">پروژه</th><th style="text-align:start">وضعیت</th><th style="text-align:start">سرپرست</th><th style="text-align:start">تیم</th><th style="text-align:start;width:16%">پیشرفت</th><th>کارها</th><th style="text-align:start">Start</th><th style="text-align:start">مهلت</th><th style="text-align:start">آخرین فعالیت</th><th></th></tr></thead><tbody>
    ${ps
      .map(p => {
        const ts = tasksOf(p.id);
        const pr = progressOf(p.id);
        return `<tr style="cursor:pointer" data-a="go" data-r="project" data-id="${p.id}" data-ctx="project"><td style="padding-inline-start:14px"><span class="row">${pIcon(p, '', 14)}<span style="font-weight:500">${esc(p.name)}</span></span></td><td style="text-align:start">${pStatus(p.status)}</td><td style="text-align:start"><span class="row">${av(p.lead, 'sm')}${esc(mem(p.lead)?.name)}</span></td><td style="text-align:start" class="muted">${TM[p.team]?.name}</td><td><span class="row">${progBar(pr)}<span class="num faint" style="font-size:11.5px">${faNumber(pr)}%</span></span></td><td class="num">${faNumber(ts.length)}</td><td style="text-align:start" class="num muted">${fmtDate(p.start)}</td><td style="text-align:start" class="num muted">${fmtDate(p.due)}</td><td style="text-align:start" class="muted">${ago(minsAgo(p.last))}</td><td><button class="ibtn ibtn-sm" data-a="ctxBtn" data-ctx="project" data-id="${p.id}" aria-label="گزینه‌ها">${ic('ellipsis', 14)}</button></td></tr>`;
      })
      .join('')}
    </tbody></table></div>`;
  return `<div class="page wide">
    <div class="ph"><div><h1>پروژه‌ها</h1><p>${faNumber(visibleProjects().filter(p => p.status !== 'complete').length)} فعال · ${faNumber(visibleProjects().filter(p => p.status === 'complete').length)} تکمیل‌شده</p></div><div class="acts"><button class="btn btn-primary" data-a="newProject">${ic('plus', 14)}پروژه جدید</button></div></div>
    <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div class="inwrap">${ic('search', 13)}<input class="input search-sm" id="proj-q" data-in="projQ" placeholder="جستجوی پروژه‌ها" value="${esc(u.projQ || '')}" aria-label="جستجوی پروژه‌ها"></div>
      <select class="select" style="height:26px;width:auto;font-size:12px" data-in="projStatus" aria-label="فیلتر بر اساس وضعیت"><option value="all">همه وضعیت‌ها</option>${Object.entries(
        PSTAT,
      )
        .map(([k, v]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${v.name}</option>`)
        .join('')}</select>
      <select class="select" style="height:26px;width:auto;font-size:12px" data-in="projSort" aria-label="مرتب‌سازی">${[
        ['recent', 'اخیراً فعال'],
        ['name', 'نام'],
        ['due', 'مهلت انجام'],
        ['progress', 'پیشرفت'],
      ]
        .map(([k, n]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>مرتب‌سازی: ${n}</option>`)
        .join('')}</select>
      <span class="sp"></span>
      <div class="seg" role="tablist" aria-label="چیدمان">${[
        ['grid', 'شبکه', 'layout-grid'],
        ['list', 'فهرست', 'list'],
        ['table', 'جدول', 'table-2'],
      ]
        .map(
          ([k, n, i]) =>
            `<button class="${view === k ? 'on' : ''}" data-a="set" data-k="projView" data-v="${k}" aria-label="${n}">${ic(i, 13)}<span class="hide-m">${n}</span></button>`,
        )
        .join('')}</div>
    </div>
    ${body}
  </div>`;
}
