import { faNumber } from '../core/locale';
import { DAY, TODAY, esc, fmtDate, parse } from '../core/utils';
import { ic } from '../core/icons';
import { D, S, allTasks, canSee, isOver, pColor, progressOf, visibleProjects } from '../core/store';
import { avStack, empty, pIcon, pStatus, progBar } from '../ui/helpers';
import { sortTasks } from '../shell/view-engine';
import { actHtml, miniRow } from '../components/task-list';

/** The current Persian month, calculated with Intl so leap years stay correct. */
function monthCalendar() {
  const format = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' });
  const numericDay = (d: Date) => Number(new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric' }).format(d));
  const start = new Date(TODAY);
  start.setDate(start.getDate() - numericDay(start) + 1);
  const offset = (start.getDay() + 1) % 7;
  const end = new Date(start);
  end.setDate(end.getDate() + 32);
  end.setDate(end.getDate() - numericDay(end) + 1);
  const days = Math.round((end.getTime() - start.getTime()) / DAY);
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i - offset);
    const outside = i < offset || i >= offset + days;
    const today = date.toDateString() === TODAY.toDateString();
    const count = allTasks().filter(t => t.status !== 'done' && t.due && parse(t.due)?.toDateString() === date.toDateString()).length;
    return `<span class="month-day ${outside ? 'outside' : ''} ${today ? 'today' : ''}" ${today ? 'aria-current="date"' : ''} title="${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(date)}${count ? `، ${faNumber(count)} کار` : ''}">${format.format(date)}${count && !outside ? '<i></i>' : ''}</span>`;
  }).join('');
  return `<section class="panel dashboard-calendar" aria-labelledby="calendar-title"><div class="panel-h"><h2 id="calendar-title">${ic('calendar-days', 18)}${new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(TODAY)}</h2><button class="ibtn" data-a="go" data-r="calendar" aria-label="باز کردن تقویم کامل">${ic('arrow-up-right', 17)}</button></div><div class="month-grid">${['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => `<span class="month-weekday">${d}</span>`).join('')}${cells}</div><div class="calendar-legend"><i></i> کارهای برنامه‌ریزی‌شده <span class="sp"></span><span>امروز ${faNumber(numericDay(TODAY))}</span></div></section>`;
}

function welcomeArt() {
  return `<svg class="welcome-art" viewBox="0 0 330 180" fill="none" aria-hidden="true"><circle cx="162" cy="94" r="76" fill="currentColor" opacity=".05"/><circle cx="243" cy="37" r="6" fill="#c4b4ed"/><path d="M47 124h22m-11-11v22M270 119h16m-8-8v16" stroke="#b09bdf" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-9 150 90)"><rect x="86" y="32" width="126" height="130" rx="14" fill="#cfc0f0"/><rect x="94" y="24" width="126" height="130" rx="14" fill="var(--surface)"/><rect x="129" y="16" width="56" height="19" rx="7" fill="#9575d7"/><rect x="112" y="53" width="22" height="22" rx="7" fill="#eee8fb"/><path d="m118 64 4 4 7-8" stroke="#7954c5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M146 59h49m-49 9h32" stroke="#d1c6e8" stroke-width="5" stroke-linecap="round"/><rect x="112" y="87" width="22" height="22" rx="7" fill="#eee8fb"/><path d="m118 98 4 4 7-8" stroke="#7954c5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M146 93h49m-49 9h32M114 126h81" stroke="#d1c6e8" stroke-width="5" stroke-linecap="round"/></g><circle cx="232" cy="125" r="28" fill="#7652c9"/><path d="m219 125 9 9 17-19" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="m56 51 4-10 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#c3afe9"/></svg>`;
}

export function pageHome() {
  const all = allTasks();
  const mine = all.filter(t => t.assignee === D().me);
  const projects = visibleProjects().filter(p => canSee(p) && p.status !== 'complete');
  const open = all.filter(t => t.status !== 'done');
  const completed = all.filter(t => t.status === 'done');
  const doneWeek = completed.filter(t => t.completedAt && Date.now() - t.completedAt < 7 * DAY);
  const overdue = all.filter(isOver);
  const tab = S.ui.homeTab;
  const lists = {
    upcoming: sortTasks(
      mine.filter(t => t.status !== 'done' && !isOver(t)),
      { f: 'due', dir: 1 },
    ),
    overdue: mine.filter(isOver),
    completed: sortTasks(
      mine.filter(t => t.status === 'done'),
      { f: 'updated', dir: 1 },
    ),
  };
  const current = lists[tab] || lists.upcoming;
  const progress = all.length ? Math.round((completed.length / all.length) * 100) : 0;
  const todayTasks = open.filter(t => t.due && parse(t.due)?.toDateString() === TODAY.toDateString());
  const metrics = [
    {
      icon: 'folder-kanban',
      label: 'پروژه‌های فعال',
      value: projects.length,
      sub: 'یک قدم نزدیک‌تر به هدف',
      tone: 'violet',
      action: 'go',
      attrs: 'data-r="projects"',
    },
    {
      icon: 'list-checks',
      label: 'کارهای در جریان',
      value: open.length,
      sub: `${faNumber(mine.filter(t => t.status !== 'done').length)} کار واگذارشده به شما`,
      tone: 'blue',
      action: 'goTasks',
      attrs: 'data-f="open"',
    },
    {
      icon: 'circle-check',
      label: 'انجام‌شده این هفته',
      value: doneWeek.length,
      sub: 'نتیجه‌ی تلاش تیم شما',
      tone: 'green',
      action: 'goTasks',
      attrs: 'data-f="done"',
    },
    {
      icon: 'clock-alert',
      label: 'نیازمند پیگیری',
      value: overdue.length,
      sub: overdue.length ? 'کارهای گذشته از مهلت' : 'همه چیز طبق برنامه است',
      tone: 'orange',
      action: 'goTasks',
      attrs: 'data-f="overdue"',
    },
  ];
  return `<div class="page dashboard">
    <div class="ph dashboard-heading"><div><div class="dashboard-eyebrow">فضایی برای فکرهای بزرگ و قدم‌های کوچک</div><h1>میز کار من</h1></div><div class="dashboard-date">${ic('calendar', 17)}${new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(TODAY)}</div></div>
    <section class="welcome-banner"><div class="welcome-copy"><span class="welcome-kicker"><i></i> یک روز تازه، یک فرصت تازه</span><h2>سلام ${esc(S.prefs.name.split(' ')[0])}، به هم‌کار خوش آمدی!</h2><p>همه‌چیز برای یک روز پربار آماده است.<br>امروز <b>${faNumber(todayTasks.length)} کار</b> در انتظار تیم شماست؛ با هم پیش می‌رویم.</p><button class="btn btn-primary" data-a="go" data-r="mytasks">بریم سراغ کارها ${ic('arrow-left', 16)}</button></div>${welcomeArt()}</section>
    <div class="dashboard-metrics">${metrics.map(m => `<button class="metric-card tone-${m.tone}" data-a="${m.action}" ${m.attrs}><span class="metric-icon">${ic(m.icon, 22)}</span><span class="metric-label">${m.label}</span><strong>${faNumber(m.value)}</strong><span class="metric-sub">${m.sub}</span>${ic('arrow-up-left', 17, 'metric-arrow')}</button>`).join('')}</div>
    <div class="dashboard-columns"><div class="dashboard-primary">
      <section class="dashboard-projects" aria-labelledby="projects-title"><div class="section-heading"><h2 id="projects-title">پروژه‌های در جریان <span class="section-count">${faNumber(projects.length)}</span></h2><button class="text-link" data-a="go" data-r="projects">همه پروژه‌ها ${ic('arrow-left', 15)}</button></div><div class="dashboard-project-grid">${
        projects.length
          ? projects
              .slice(0, 3)
              .map(p => {
                const pr = progressOf(p.id);
                return `<button class="dashboard-project" style="--project-color:${pColor(p)}" data-a="go" data-r="project" data-id="${p.id}" data-tab="board"><span class="project-card-top">${pIcon(p, 'lg', 22)}${pStatus(p.status)}</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><span class="project-progress-label"><span>پیشرفت پروژه</span><b>${faNumber(pr)}٪</b></span>${progBar(pr)}<span class="project-card-foot">${avStack(p.members, 3)}<span>${ic('calendar', 13)}${fmtDate(p.due)}</span></span></button>`;
              })
              .join('')
          : `<div class="panel">${empty('folder-kanban', 'اولین پروژه‌ات را بساز', 'کارهای تیم را در یک فضای مشترک پیش ببر.', '<button class="btn btn-primary" data-a="newProject">پروژه جدید</button>', 'sm')}</div>`
      }</div></section>
      <section class="panel dashboard-tasks" aria-labelledby="tasks-title"><div class="panel-h"><h2 id="tasks-title">${ic('list-checks', 19)}کارهای من <span class="section-count">${faNumber(mine.length)}</span></h2><button class="text-link" data-a="go" data-r="mytasks">مشاهده همه ${ic('arrow-left', 15)}</button></div><div class="dashboard-task-tabs">${[
        ['upcoming', 'پیش رو'],
        ['overdue', 'عقب‌افتاده'],
        ['completed', 'انجام‌شده'],
      ]
        .map(
          ([k, label]) =>
            `<button aria-pressed="${tab === k}" class="${tab === k ? 'on' : ''}" data-a="set" data-k="homeTab" data-v="${k}">${label}<span>${faNumber(lists[k].length)}</span></button>`,
        )
        .join('')}</div><div class="dashboard-task-list">${
        current.length
          ? current
              .slice(0, 5)
              .map(t => miniRow(t, { av: true }))
              .join('')
          : empty(
              'circle-check',
              tab === 'overdue' ? 'خیالت راحت؛ کار عقب‌افتاده نداری' : 'اینجا هنوز کاری نیست',
              'برای قدم بعدی آماده‌ای؟ یک کار جدید اضافه کن.',
              '',
              'sm',
            )
      }</div><button class="dashboard-add-task" data-a="newTask">${ic('plus', 17)}افزودن کار جدید</button></section>
      <section class="panel dashboard-activity"><div class="panel-h"><h2>${ic('activity', 18)}تازه‌های تیم</h2><button class="text-link" data-a="go" data-r="activity">همه فعالیت‌ها ${ic('arrow-left', 15)}</button></div><div class="panel-b feed lined">${
        D()
          .activity.slice(0, 3)
          .map(a => actHtml(a, { proj: true }))
          .join('') || '<p class="muted">فعالیت‌های تیم اینجا نمایش داده می‌شوند.</p>'
      }</div></section>
    </div><aside class="dashboard-aside">${monthCalendar()}
      <section class="panel team-progress"><div class="panel-h"><h2>یک نگاه به عملکرد تیم</h2>${ic('chart-pie', 18)}</div><div class="progress-ring" style="--progress:${progress * 3.6}deg" role="img" aria-label="${faNumber(progress)} درصد کارها تکمیل شده"><div><strong>${faNumber(progress)}<small>٪</small></strong><span>پیشرفت کلی</span></div></div><p>هر کار کوچک، یک قدم بزرگ برای تیم</p><div class="progress-legend"><span><i class="done"></i>انجام‌شده<b>${faNumber(completed.length)}</b></span><span><i></i>باقی‌مانده<b>${faNumber(open.length)}</b></span></div><button class="btn btn-secondary btn-block" data-a="go" data-r="overview">مشاهده گزارش عملکرد ${ic('arrow-left', 15)}</button></section>
      <div class="dashboard-invite">${ic('sparkles', 24)}<h3>ایده‌های بهتر، با هم ساخته می‌شوند.</h3><p>هم‌تیمی‌هایت را دعوت کن و اولین قدم را با هم بردارید.</p><button class="text-link" data-a="invite">دعوت از همکاران ${ic('arrow-left', 15)}</button></div>
    </aside></div><footer class="dashboard-footer"><span>هم‌کار؛ هر روز، کمی جلوتر.</span><span>با تمرکز بساز، با هم پیش برو.</span></footer>
  </div>`;
}
