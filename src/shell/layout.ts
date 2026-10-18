/* ---------- shell ---------- */
import { MOD, TODAY, diffD, esc, parse } from '../core/utils';
import { ic, wsLogo } from '../core/icons';
import { PSTAT } from '../core/constants';
import { D, S, allTasks, mem, pColor, proj, team, teamsList, visibleProjects } from '../core/store';
import { av } from '../ui/helpers';
import { ROUTE_NAMES } from './render';
import { skeleton } from './skeletons';
import { pageHome } from '../pages/home';
import { pageOverview } from '../pages/overview';
import { pageMyTasks } from '../pages/my-tasks';
import { pageTasks } from '../pages/tasks';
import { pageInbox } from '../pages/inbox';
import { pageNotifications } from '../pages/notifications';
import { pageFavorites } from '../pages/favorites';
import { pageProjects } from '../pages/projects';
import { pageMember, pageMembers, pageTeam, pageTeams } from '../pages/members';
import { pageActivity } from '../pages/activity';
import { pageSearch } from '../pages/search';
import { page404, stateFailed } from '../pages/errors';
import { pageProject } from '../pages/project';
import { pageWsCalendar } from '../views/calendar';
import { pageWsTimeline } from '../views/timeline';
import { pageSettings } from '../pages/settings';
import { pageStates, pageSystem } from '../pages/design-system';
import { pageArchive } from '../features/archive';

export function renderShell() {
  const u = S.ui;
  return `<button class="skip" data-a="skipToContent">رفتن به محتوای اصلی</button><div class="shell ${u.collapsed ? 'collapsed' : ''} ${u.mnav ? 'mnav' : ''} ${u.fx.tabs ? 'fx-tabs' : ''}">
    ${renderSidebar()}
    ${u.mnav ? '<div class="side-scrim" data-a="closeMnav"></div>' : ''}
    <main class="main" id="main">
      ${renderTopbar()}
      ${u.offline ? `<div class="offline-bar" role="alert">${ic('wifi-off', 15)}<span><b>اتصال اینترنت شما قطع است.</b> تا برقراری دوباره اتصال، تغییرات ذخیره نمی‌شوند.</span><span class="sp"></span><button class="btn btn-sm btn-secondary" data-a="retryOnline">تلاش دوباره</button></div>` : ''}
      <div class="content ${u.fx.route ? 'fx-route' : ''}" id="main-content" tabindex="-1" data-keep="c:${u.route}:${u.params.id || ''}:${u.params.tab || ''}:${u.params.sec || ''}">${u.loading ? skeleton() : renderPage()}</div>
    </main>
    ${renderBottomNav()}
  </div>`;
}
export function renderPage() {
  const r = S.ui.route;
  try {
    const P = {
      home: pageHome,
      inbox: pageInbox,
      mytasks: pageMyTasks,
      favorites: pageFavorites,
      notifications: pageNotifications,
      search: pageSearch,
      overview: pageOverview,
      projects: pageProjects,
      project: pageProject,
      tasks: pageTasks,
      calendar: pageWsCalendar,
      timeline: pageWsTimeline,
      members: pageMembers,
      member: pageMember,
      teams: pageTeams,
      team: pageTeam,
      activity: pageActivity,
      settings: pageSettings,
      system: pageSystem,
      states: pageStates,
      archive: pageArchive,
    };
    return (P[r] || page404)();
  } catch (e) {
    console.error(e);
    return stateFailed();
  }
}

export function sItem(route, label, icon, opt: Record<string, any> = {}) {
  const on = S.ui.route === route && (!opt.id || S.ui.params.id === opt.id);
  return `<button class="sitem ${on ? 'on' : ''}" data-a="${opt.act || 'go'}" data-r="${route}" ${opt.id ? `data-id="${opt.id}"` : ''} ${S.ui.collapsed ? `data-tip="${esc(label)}" data-tip-pos="right"` : ''} ${on ? 'aria-current="page"' : ''}>${ic(icon, 16)}<span class="trunc">${esc(label)}</span>${opt.ct ? `<span class="ct ${opt.dot ? 'dotc' : ''}">${opt.ct}</span>` : ''}${opt.kbd ? `<span class="ct hide-m"><kbd>${opt.kbd}</kbd></span>` : ''}</button>`;
}
export function renderSidebar() {
  const u = S.ui,
    d = D();
  const unreadInbox = d.notifs.filter(n => !n.read && n.type !== 'update').length;
  const unreadAll = d.notifs.filter(n => !n.read).length;
  const myOpen = allTasks().filter(t => t.assignee === d.me && t.status !== 'done' && t.due && diffD(parse(t.due), TODAY) <= 0).length;
  const projs = visibleProjects().filter(p => p.status !== 'complete');
  const inProj = u.route === 'project' ? u.params.id : null;
  return `<nav class="side" aria-label="اصلی">
    <div class="side-top">
      <div class="row" style="gap:2px">
        <button class="ws grow" data-a="pop" data-pop="ws" aria-haspopup="menu" aria-label="تغییر فضای کاری">
          ${wsLogo(d.ws, 22)}
          <span class="ws-name trunc">${esc(d.ws.name)}</span>
          <span class="chev-d faint">${ic('chevrons-up-down', 13)}</span>
        </button>
        ${u.collapsed ? '' : `<button class="ibtn ibtn-sm hide-m" data-a="toggleSide" data-tip="جمع کردن نوار کناری  [" aria-label="جمع کردن نوار کناری">${ic('panel-left', 15)}</button>`}
      </div>
    </div>
    <div class="side-scroll" data-keep="side">
      ${u.collapsed ? `<button class="sitem" data-a="toggleSide" data-tip="باز کردن نوار کناری" data-tip-pos="right" aria-label="باز کردن نوار کناری">${ic('panel-left', 16)}</button>` : ''}
      ${sItem('home', 'خانه', 'house')}
      ${sItem('inbox', 'صندوق ورودی', 'inbox', { ct: unreadInbox || '', dot: true })}
      ${sItem('mytasks', 'کارهای من', 'circle-check', { ct: myOpen || '' })}
      ${sItem('favorites', 'علاقه‌مندی‌ها', 'star')}
      ${sItem('notifications', 'اعلان‌ها', 'bell', { ct: unreadAll || '' })}
      <div class="sgroup">
        <div class="sgroup-h">فضای کاری</div>
        ${sItem('overview', 'نمای کلی', 'layout-dashboard')}
        ${sItem('projects', 'پروژه‌ها', 'folder-kanban')}
        ${sItem('tasks', 'کارها', 'list-checks')}
        ${sItem('calendar', 'تقویم', 'calendar')}
        ${sItem('timeline', 'خط زمانی', 'chart-gantt')}
        ${sItem('members', 'اعضا', 'users')}
        ${sItem('activity', 'فعالیت‌ها', 'activity')}
      </div>
      <div class="sgroup" id="side-projects">
        <div class="sgroup-h"><span>پروژه‌ها</span><span class="sp"></span><button class="ibtn ibtn-xs" data-a="newProject" data-tip="پروژه جدید  P" aria-label="پروژه جدید">${ic('plus', 14)}</button></div>
        ${projs
          .map(p => {
            const open = !!u.expanded[p.id];
            const on = inProj === p.id;
            return `<div class="sproj" data-proj-drop="${p.id}">
            <div class="sitem ${on ? 'on' : ''}" draggable="true" data-drag-proj="${p.id}" data-a="go" data-r="project" data-id="${p.id}" data-ctx="project" role="link" tabindex="0" ${u.collapsed ? `data-tip="${esc(p.name)}" data-tip-pos="right"` : ''}>
              <span class="pico" style="--c:${pColor(p)}" data-a="toggleExpand" data-id="${p.id}" aria-label="تغییر نمایش زیرصفحه‌ها">${ic(p.icon, 12)}</span>
              <span class="trunc">${esc(p.name)}</span>
              ${p.fav ? `<span class="fav">${ic('star', 11)}</span>` : ''}
              ${p.private ? `<span class="faint" style="margin-inline-start:4px">${ic('lock', 11)}</span>` : ''}
              <span class="sdot" style="background:${PSTAT[p.status].c}" title="${PSTAT[p.status].name}"></span>
              <span class="hov"><span class="ibtn ibtn-xs" data-a="ctxBtn" data-ctx="project" data-id="${p.id}" aria-label="گزینه‌های پروژه">${ic('ellipsis', 14)}</span><span class="ibtn ibtn-xs" data-a="toggleExpand" data-id="${p.id}" aria-label="باز کردن">${ic('chevron-right', 13, 'chev ' + (open ? 'open' : ''))}</span></span>
            </div>
            <div class="sub ${open && !u.collapsed ? 'open' : ''}">
              ${[
                ['board', 'تابلو', 'square-kanban'],
                ['list', 'فهرست', 'list'],
                ['timeline', 'خط زمانی', 'chart-gantt'],
                ['files', 'فایل‌ها', 'paperclip'],
              ]
                .map(
                  ([tab, n, i]) =>
                    `<button class="sitem ${on && u.params.tab === tab ? 'on' : ''}" data-a="go" data-r="project" data-id="${p.id}" data-tab="${tab}">${ic(i, 14)}<span>${n}</span></button>`,
                )
                .join('')}
            </div>
          </div>`;
          })
          .join('')}
        ${sItem('archive', 'بایگانی', 'archive', { ct: D().tasks.filter(t => t.archived).length + D().projects.filter(p => p.archived).length || '' })}
      </div>
      <div class="sgroup">
        <div class="sgroup-h"><span>تیم‌ها</span><span class="sp"></span><button class="ibtn ibtn-xs" data-a="newTeam" data-tip="تیم جدید" aria-label="تیم جدید">${ic('plus', 14)}</button></div>
        ${teamsList()
          .map(t => sItem('team', t.name, t.icon, { id: t.id }))
          .join('')}
      </div>
    </div>
    <div class="side-bot">
      <button class="sitem" data-a="pop" data-pop="help" ${u.collapsed ? 'data-tip="Help" data-tip-pos="right"' : ''}>${ic('circle-help', 16)}<span>راهنما و منابع</span></button>
      ${sItem('settings', 'تنظیمات', 'settings')}
      <button class="sitem" data-a="pop" data-pop="user" style="height:36px" ${u.collapsed ? 'data-tip="Profile" data-tip-pos="right"' : ''}>${av(d.me, 'presence', false)}<span class="trunc" style="color:var(--text);font-weight:500">${esc(S.prefs.name)}</span><span class="ct">${ic('chevrons-up-down', 13)}</span></button>
    </div>
  </nav>`;
}

export function crumbs() {
  const u = S.ui,
    r = u.route,
    out: string[] = [];
  const c = (label, act = '', cur = false, icon = '') => `<button class="${cur ? 'cur' : ''}" ${act}>${icon}${esc(label)}</button>`;
  if (r === 'project') {
    const p = proj(u.params.id);
    out.push(c('پروژه‌ها', 'data-a="go" data-r="projects"'));
    if (p)
      out.push(
        c(
          p.name,
          `data-a="go" data-r="project" data-id="${p.id}" data-tab="overview"`,
          true,
          `<span class="pico" style="--c:${pColor(p)};width:16px;height:16px;border-radius:4px;display:grid;place-items:center;color:${pColor(p)}">${ic(p.icon, 11)}</span>`,
        ),
      );
  } else if (r === 'member') {
    out.push(c('اعضا', 'data-a="go" data-r="members"'));
    out.push(c(mem(u.params.id)?.name || 'Member', '', true));
  } else if (r === 'team') {
    out.push(c('تیم‌ها', 'data-a="go" data-r="teams"'));
    out.push(c(team(u.params.id)?.name || 'تیم', '', true));
  } else if (r === 'settings') {
    out.push(c('تنظیمات', '', true));
  } else out.push(c(ROUTE_NAMES[r] || 'پیدا نشد', '', true));
  return out.join('<span class="sep">/</span>');
}
export function renderTopbar() {
  return `<header class="topbar">
    <button class="ibtn" data-a="openMnav" aria-label="باز کردن فهرست ناوبری" style="display:none" id="mnav-btn">${ic('menu', 17)}</button>
    <style>@media(max-width:900px){#mnav-btn{display:inline-flex!important}}</style>
    <nav class="crumbs trunc" aria-label="مسیر صفحه">${crumbs()}</nav>
    <span class="sp"></span>
    <button class="topsearch" data-a="openPalette" aria-label="جستجو و فرمان‌ها">${ic('search', 14)}<span class="lbltxt">جستجو یا رفتن به…</span><span class="kbd">${MOD}K</span></button>
    <button class="ibtn" data-a="go" data-r="notifications" data-tip="اعلان‌ها" aria-label="اعلان‌ها">${ic('bell', 16)}${D().notifs.some(n => !n.read) ? '<span style="position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--surface)"></span>' : ''}</button>
    <button class="btn btn-secondary btn-sm" data-a="pop" data-pop="create" aria-haspopup="menu" aria-label="ایجاد مورد جدید">${ic('plus', 14)}<span class="hide-m">جدید</span>${ic('chevron-down', 12, 'hide-m')}</button>
    <button class="ibtn hide-m" data-a="pop" data-pop="user" aria-label="فهرست حساب کاربری" style="width:auto;padding:0 2px">${av(D().me, 'md', false)}</button>
  </header>`;
}
export function renderBottomNav() {
  const r = S.ui.route;
  const unread = D().notifs.some(n => !n.read && n.type !== 'update');
  const b = (route, label, icon, extra = '') =>
    `<button class="${r === route ? 'on' : ''}" data-a="go" data-r="${route}">${ic(icon, 19)}<span>${label}</span>${extra}</button>`;
  return `<nav class="bottomnav" aria-label="اصلی">
    ${b('home', 'خانه', 'house')}${b('mytasks', 'کارهای من', 'circle-check')}${b('projects', 'پروژه‌ها', 'folder-kanban')}${b('inbox', 'صندوق ورودی', 'inbox', unread ? '<span class="bdot"></span>' : '')}
    <button data-a="openMnav">${ic('ellipsis', 19)}<span>بیشتر</span></button>
  </nav>`;
}
