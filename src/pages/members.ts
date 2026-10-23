import { faNumber } from '../core/locale';
import { displayLabel } from '../core/locale';
/* ---------- MEMBERS / PROFILE / TEAMS ---------- */
import { ago, esc, minsAgo } from '../core/utils';
import { ic } from '../core/icons';
import { ROLES } from '../core/constants';
import { D, S, TM, allTasks, canSee, isOver, me, mem, progressOf, team, teamsList, visibleProjects } from '../core/store';
import { av, avStack, empty, pIcon, pStatus, progBar } from '../ui/helpers';
import { sortTasks } from '../shell/view-engine';
import { actHtml, miniRow } from '../components/task-list';
import { page404 } from './errors';

export function pageMembers() {
  const u = S.ui;
  const q = (u.memQ || '').toLowerCase();
  const role = u.memRole || 'all';
  const ms = D().members.filter(m => (role === 'all' || m.role === role) && (!q || m.name.toLowerCase().includes(q) || m.email.includes(q)));
  const isAdmin = ['Owner', 'Admin'].includes(me().role);
  const tab = u.membersTab;
  return `<div class="page wide" style="max-width:1200px">
    <div class="ph"><div><h1>اعضا</h1><p>${faNumber(D().members.length)} نفر در ${esc(D().ws.name)} · ${faNumber(D().members.filter(m => m.status === 'invited').length)} در انتظار</p></div><div class="acts"><button class="btn btn-primary" data-a="invite">${ic('user-plus', 14)}دعوت عضو</button></div></div>
    <div class="tabs" style="margin-bottom:14px">${[
      ['members', 'اعضا'],
      ['teams', 'تیم‌ها'],
      ['roles', 'نقش‌ها و دسترسی‌ها'],
      ['workload', 'ظرفیت و بار کار'],
    ]
      .map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-a="set" data-k="membersTab" data-v="${k}">${n}</button>`)
      .join('')}</div>
    ${
      tab === 'workload'
        ? ''
        : tab === 'teams'
          ? `<div class="row" style="margin-bottom:12px"><span class="muted" style="font-size:13px">${faNumber(teamsList().length)} teams</span><span class="sp"></span><button class="btn btn-secondary btn-sm" data-a="newTeam">${ic('plus', 13)}تیم جدید</button></div>${teamsGrid()}`
          : tab === 'roles'
            ? permsTable()
            : `
    <div class="row" style="margin-bottom:12px;gap:8px;flex-wrap:wrap"><div class="inwrap">${ic('search', 13)}<input class="input search-sm" id="mem-q" data-in="memQ" placeholder="جستجو با نام یا ایمیل" value="${esc(u.memQ || '')}" aria-label="جستجوی اعضا"></div>
      <div class="seg">${['all', ...ROLES].map(r => `<button class="${role === r ? 'on' : ''}" data-a="set" data-k="memRole" data-v="${r}">${r === 'all' ? 'همه' : displayLabel(r)}</button>`).join('')}</div></div>
    <div class="panel" style="overflow-x:auto">${
      ms.length
        ? `<table class="perm-t" style="min-width:880px"><thead><tr><th style="padding-inline-start:14px">عضو</th><th style="text-align:start">نقش</th><th style="text-align:start">تیم</th><th>پروژه‌های فعال</th><th>کارها</th><th style="text-align:start">آخرین فعالیت</th><th style="text-align:start">وضعیت</th><th></th></tr></thead><tbody>
    ${ms
      .map(m => {
        const ap = visibleProjects().filter(p => p.members.includes(m.id) && p.status !== 'complete').length;
        const ot = allTasks().filter(t => t.assignee === m.id && t.status !== 'done').length;
        return `<tr data-ctx="member" data-id="${m.id}"><td style="padding-inline-start:14px"><button class="row" data-a="go" data-r="member" data-id="${m.id}" style="gap:10px;text-align:start">${av(m.id, 'md', false)}<span class="col"><b style="font-weight:500">${esc(m.name)}${m.id === D().me ? ' <span class="faint" style="font-weight:400">(شما)</span>' : ''}</b><span class="faint" style="font-size:12px">${esc(m.email)}</span></span></button></td>
      <td style="text-align:start">${isAdmin && m.role !== 'Owner' ? `<button class="pillbtn bordered" data-a="pop" data-pop="role" data-id="${m.id}">${displayLabel(m.role)}${ic('chevron-down', 12)}</button>` : `<span class="pillbtn">${m.role === 'Owner' ? ic('crown', 13) : ''}${displayLabel(m.role)}</span>`}</td>
      <td style="text-align:start"><span class="row">${ic(TM[m.team].icon, 13)}${TM[m.team].name}</span></td><td class="num">${ap}</td><td class="num">${ot}</td>
      <td style="text-align:start" class="muted">${m.last == null ? '—' : m.last < 5 ? '<span style="color:var(--green)">آنلاین</span>' : ago(minsAgo(m.last))}</td>
      <td style="text-align:start">${m.status === 'invited' ? '<span class="badge amber"><span class="dot"></span>دعوت‌شده</span>' : m.status === 'deactivated' ? '<span class="badge gray">Deactivated</span>' : '<span class="badge green"><span class="dot"></span>فعال</span>'}</td>
      <td><button class="ibtn ibtn-sm" data-a="ctxBtn" data-ctx="member" data-id="${m.id}" aria-label="گزینه‌های عضو">${ic('ellipsis', 14)}</button></td></tr>`;
      })
      .join('')}
    </tbody></table>`
        : empty('search-x', 'نتیجه‌ای پیدا نشد', 'عضوی مطابق این جستجو پیدا نشد.', '', 'sm')
    }</div>`
    }
  </div>`;
}
export function permsTable() {
  const rows = [
    ['مشاهده پروژه‌ها و کارها', 1, 1, 1, 1],
    ['ثبت دیدگاه برای کارها', 1, 1, 1, 1],
    ['ایجاد و ویرایش کارها', 1, 1, 1, 0],
    ['ایجاد پروژه‌ها', 1, 1, 1, 0],
    ['دعوت اعضا', 1, 1, 0, 0],
    ['مدیریت نقش‌ها', 1, 1, 0, 0],
    ['تنظیمات فضای کاری', 1, 1, 0, 0],
    ['صورتحساب', 1, 0, 0, 0],
    ['حذف فضای کاری', 1, 0, 0, 0],
  ];
  return `<div class="panel" style="overflow-x:auto"><table class="perm-t" style="min-width:560px"><thead><tr><th style="padding-inline-start:14px">دسترسی</th>${ROLES.map(r => `<th>${r}</th>`).join('')}</tr></thead><tbody>${rows
    .map(
      r =>
        `<tr><td style="padding-inline-start:14px">${r[0]}</td>${r
          .slice(1)
          .map(
            v =>
              `<td>${v ? `<span style="color:var(--green);display:inline-flex" aria-label="مجاز">${ic('check', 15)}</span>` : `<span class="faint" style="display:inline-flex" aria-label="غیرمجاز">${ic('minus', 15)}</span>`}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')}</tbody></table></div>`;
}
export function teamsGrid() {
  return `<div class="pgrid">${teamsList()
    .map(t => {
      const ms = D().members.filter(m => m.team === t.id);
      const ps = visibleProjects().filter(p => p.team === t.id);
      return `<div class="pcard" data-a="go" data-r="team" data-id="${t.id}" role="link" tabindex="0"><div class="row"><span class="picon" style="--c:${t.c}">${ic(t.icon, 15)}</span><b style="font-weight:600;font-size:14px">${t.name}</b></div><div class="desc">${t.desc}</div><div class="foot"><span class="row" style="gap:4px">${ic('users', 12)}${faNumber(ms.length)} عضو</span><span class="row" style="gap:4px">${ic('folder', 12)}${faNumber(ps.length)} پروژه</span><span class="sp"></span>${avStack(
        ms.map(m => m.id),
        4,
      )}</div></div>`;
    })
    .join('')}</div>`;
}
export function pageTeams() {
  return `<div class="page"><div class="ph"><div><h1>تیم‌ها</h1><p>گروه‌هایی از افراد که روی پروژه‌ها با هم کار می‌کنند.</p></div><div class="acts"><button class="btn btn-primary" data-a="newTeam">${ic('plus', 14)}تیم جدید</button></div></div>${teamsList().length ? teamsGrid() : `<div class="panel">${empty('users', 'هنوز تیمی وجود ندارد', 'برای گروه‌بندی افراد و مشخص کردن مسئول پروژه‌ها، یک تیم ایجاد کنید.', `<button class="btn btn-primary btn-sm" data-a="newTeam">${ic('plus', 14)}تیم جدید</button>`)}</div>`}</div>`;
}
export function pageTeam() {
  const t = team(S.ui.params.id);
  if (!t) return page404();
  const ms = D().members.filter(m => m.team === t.id);
  const ps = visibleProjects().filter(p => p.team === t.id);
  const ts = allTasks().filter(x => ms.some(m => m.id === x.assignee) && x.status !== 'done');
  return `<div class="page">
    <div class="ph"><div class="row" style="gap:12px"><span class="picon lg" style="--c:${t.c}">${ic(t.icon, 18)}</span><div><h1>${t.name}</h1><p style="margin:2px 0 0">${t.desc}</p></div></div><div class="acts"><button class="btn btn-secondary" data-a="editTeam" data-id="${t.id}">${ic('pencil', 14)}ویرایش تیم</button><button class="btn btn-secondary" data-a="invite">${ic('user-plus', 14)}دعوت به فضای کاری</button></div></div>
    <div class="grid2"><div class="stack">
      <section class="panel"><div class="panel-h"><h2>پروژه‌ها</h2><span class="faint">${faNumber(ps.length)}</span></div>${ps.map(p => `<div class="mini" data-a="go" data-r="project" data-id="${p.id}">${pIcon(p, '', 14)}<span class="tt">${esc(p.name)}</span>${pStatus(p.status)}<span class="row" style="width:120px">${progBar(progressOf(p.id))}</span></div>`).join('') || '<div class="panel-b faint">پروژه‌ای وجود ندارد</div>'}</section>
      <section class="panel"><div class="panel-h"><h2>کارهای باز</h2><span class="faint">${faNumber(ts.length)}</span></div>${sortTasks(ts, {
        f: 'due',
        dir: 1,
      })
        .slice(0, 8)
        .map(x => miniRow(x))
        .join('')}</section>
    </div>
    <section class="panel" style="align-self:start"><div class="panel-h"><h2>اعضا</h2><span class="faint">${faNumber(ms.length)}</span></div>${ms.map(m => `<div class="mini" style="min-height:48px" data-a="go" data-r="member" data-id="${m.id}">${av(m.id, 'md', false)}<div class="grow"><div style="font-weight:500">${esc(m.name)}</div><div class="faint" style="font-size:12px">${esc(m.title)}</div></div><span class="badge">${displayLabel(m.role)}</span></div>`).join('')}</section></div>
  </div>`;
}
export function pageMember() {
  const m = mem(S.ui.params.id);
  if (!m) return page404();
  const ts = allTasks().filter(t => t.assignee === m.id);
  const open = ts.filter(t => t.status !== 'done');
  const done = ts.filter(t => t.status === 'done');
  const ps = visibleProjects().filter(p => p.members.includes(m.id) && p.status !== 'complete' && canSee(p));
  const acts = D()
    .activity.filter(a => a.by === m.id)
    .slice(0, 8);
  const tab = S.ui.memTab || 'assigned';
  return `<div class="page">
    <div class="row" style="gap:18px;margin-bottom:22px;flex-wrap:wrap;align-items:flex-start">
      ${av(m.id, 'xl ' + (m.last != null && m.last < 5 ? 'presence' : ''), false)}
      <div class="grow" style="min-width:220px"><div class="row" style="gap:10px;flex-wrap:wrap"><h1 style="font-size:var(--fs-2xl);margin:0;font-weight:600;letter-spacing:-.02em">${esc(m.name)}</h1><span class="badge">${m.role === 'Owner' ? ic('crown', 11) : ''}${displayLabel(m.role)}</span>${m.status === 'invited' ? '<span class="badge amber">در انتظار پذیرش دعوت</span>' : ''}</div>
        <div class="muted" style="margin-top:3px">${esc(m.title)} · ${TM[m.team].name}</div>
        <div class="row faint" style="margin-top:8px;gap:14px;font-size:12.5px;flex-wrap:wrap"><span class="row" style="gap:5px">${ic('mail', 13)}<span style="user-select:all">${esc(m.email)}</span></span><span class="row" style="gap:5px">${ic('map-pin', 13)}${esc(m.tz)}</span><span class="row" style="gap:5px">${ic('clock', 13)}${m.last == null ? 'هنوز وارد نشده است' : m.last < 5 ? 'اکنون آنلاین' : 'فعال ' + ago(minsAgo(m.last))}</span></div></div>
      <div class="row"><button class="btn btn-secondary" data-a="copyText" data-text="${esc(m.email)}">${ic('copy', 14)}کپی ایمیل</button><button class="btn btn-primary" data-a="newTask" data-assignee="${m.id}">${ic('plus', 14)}تعیین مسئول کار</button><button class="ibtn" data-a="ctxBtn" data-ctx="member" data-id="${m.id}" aria-label="بیشتر">${ic('ellipsis', 16)}</button></div>
    </div>
    <div class="stats" style="margin-bottom:18px">
      <div class="stat"><span class="k">پروژه‌های فعال</span><span class="v">${faNumber(ps.length)}</span></div>
      <div class="stat"><span class="k">کارهای واگذارشده</span><span class="v">${faNumber(open.length)}</span></div>
      <div class="stat"><span class="k">کارهای تکمیل‌شده</span><span class="v">${faNumber(done.length)}</span></div>
      <div class="stat"><span class="k">عقب‌افتاده</span><span class="v" style="${open.filter(isOver).length ? 'color:var(--red)' : ''}">${faNumber(open.filter(isOver).length)}</span></div>
    </div>
    <div class="grid2"><section class="panel"><div class="tabs" style="padding:0 8px">${[
      ['assigned', `واگذارشده · ${open.length}`],
      ['completed', `تکمیل‌شده · ${done.length}`],
    ]
      .map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-a="set" data-k="memTab" data-v="${k}">${n}</button>`)
      .join('')}</div>
      ${(tab === 'assigned' ? sortTasks(open, { f: 'due', dir: 1 }) : done).map(t => miniRow(t, { av: false })).join('') || empty('list-checks', 'اینجا کاری وجود ندارد', 'موردی برای نمایش در این فهرست وجود ندارد.', '', 'sm')}</section>
      <div class="stack"><section class="panel"><div class="panel-h"><h2>پروژه‌های فعال</h2></div>${ps.map(p => `<div class="mini" data-a="go" data-r="project" data-id="${p.id}">${pIcon(p, '', 14)}<span class="tt">${esc(p.name)}</span><span class="faint" style="font-size:12px">${p.lead === m.id ? 'سرپرست' : 'Member'}</span></div>`).join('') || '<div class="panel-b faint">پروژه فعالی وجود ندارد</div>'}</section>
      <section class="panel"><div class="panel-h"><h2>فعالیت‌های اخیر</h2></div><div class="panel-b feed">${acts.map(a => actHtml(a)).join('') || '<span class="faint">فعالیت تازه‌ای وجود ندارد</span>'}</div></section></div></div>
  </div>`;
}
