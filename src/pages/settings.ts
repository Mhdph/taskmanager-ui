import { displayLabel } from '../core/locale';
/* =====================================================================
   SETTINGS · AUTH · ONBOARDING · DESIGN SYSTEM · SYSTEM STATES
   ===================================================================== */
import { dOff, esc, fmtDate } from '../core/utils';
import { ic, wsLogo } from '../core/icons';
import { D, S, me } from '../core/store';
import { av, pIcon } from '../ui/helpers';
import { permsTable, teamsGrid } from './members';
import { page404 } from './errors';
import { SHORTCUTS } from '../overlays/modals';

export const SET_NAV: Array<[string, Array<[string, string, string]>]> = [
  [
    'عمومی',
    [
      ['workspace', 'فضای کاری', 'building-2'],
      ['appearance', 'ظاهر', 'palette'],
      ['language', 'زبان', 'languages'],
      ['datetime', 'تاریخ و ساعت', 'clock'],
    ],
  ],
  [
    'فضای کاری',
    [
      ['members', 'اعضا', 'users'],
      ['teams', 'تیم‌ها', 'users-round'],
      ['projects', 'پروژه‌ها', 'folder-kanban'],
      ['permissions', 'دسترسی‌ها', 'shield'],
    ],
  ],
  [
    'اعلان‌ها',
    [
      ['notif-email', 'ایمیل', 'mail'],
      ['notif-push', 'اعلان دستگاه', 'smartphone'],
      ['notif-mentions', 'اشاره‌ها', 'at-sign'],
      ['notif-assign', 'واگذاری کارها', 'user-check'],
    ],
  ],
  [
    'شخصی',
    [
      ['profile', 'پروفایل', 'user'],
      ['preferences', 'ترجیحات', 'sliders-horizontal'],
      ['shortcuts', 'میانبرهای صفحه‌کلید', 'keyboard'],
    ],
  ],
  [
    'امنیت',
    [
      ['password', 'رمز عبور', 'key-round'],
      ['sessions', 'نشست‌ها', 'monitor-smartphone'],
      ['2fa', 'احراز هویت دومرحله‌ای', 'shield-check'],
    ],
  ],
  [
    'صورتحساب',
    [
      ['plan', 'طرح اشتراک', 'gem'],
      ['payment', 'پرداخت', 'credit-card'],
      ['invoices', 'صورتحساب‌ها', 'receipt'],
    ],
  ],
];
export function srow(t, d, ctl) {
  return `<div class="srow"><div><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div><div class="row">${ctl}</div></div>`;
}
export const tog = (k, on, src = 'pref') =>
  `<input type="checkbox" class="toggle" data-in="${src}Toggle" data-k="${k}" ${on ? 'checked' : ''} aria-label="${displayLabel(k)}">`;
export const sel = (k, opts, v) =>
  `<select class="select" style="width:auto;min-width:180px" data-in="prefSel" data-k="${k}" aria-label="${displayLabel(k)}">${opts
    .map(o => {
      const [val, n] = Array.isArray(o) ? o : [o, o];
      return `<option value="${val}" ${String(v) === String(val) ? 'selected' : ''}>${displayLabel(String(n))}</option>`;
    })
    .join('')}</select>`;
export function pageSettings() {
  const sec = S.ui.params.sec || S.ui.settings || 'appearance';
  const title = SET_NAV.flatMap(g => g[1]).find(x => x[0] === sec) || ['appearance', 'ظاهر'];
  return `<div class="set">
    <nav class="set-nav" aria-label="تنظیمات">${SET_NAV.map(([g, items]) => `<div class="gh">${g}</div>${items.map(([k, n, i]) => `<button class="sitem ${sec === k ? 'on' : ''}" data-a="go" data-r="settings" data-sec="${k}">${ic(i, 15)}<span>${n}</span></button>`).join('')}`).join('')}</nav>
    <div class="set-body" data-keep="set:${sec}"><div class="set-in">${settingsBody(sec, title[1])}</div></div>
  </div>`;
}
export function settingsBody(sec, title) {
  const P = S.prefs;
  const d = D();
  const np = d.notifPrefs;
  const H = lead => `<h1>${title}</h1><p class="lead">${lead}</p>`;
  switch (sec) {
    case 'workspace':
      return (
        H('نام، نشانی و مشخصات فضای کاری شما.') +
        `
      <form data-submit="saveWorkspace">
      <div class="sblock" style="margin-top:0"><div class="row" style="gap:14px;margin-bottom:18px">${wsLogo(d.ws, 52)}<div><div class="label" style="margin-bottom:6px">نشان فضای کاری</div><div class="swatches">${['#2F2E2A', '#5A67D8', '#3B82C4', '#23918A', '#C54B78', '#C48A1E'].map(c => `<button type="button" class="sw ${d.ws.c === c ? 'on' : ''}" style="--c:${c};width:22px;height:22px" data-a="wsColor" data-v="${c}" aria-label="رنگ ${c}"></button>`).join('')}</div></div></div>
      <div class="col" style="gap:14px;max-width:440px"><div class="field"><label class="label" for="ws-name">نام فضای کاری</label><input class="input" id="ws-name" value="${esc(d.ws.name)}"></div>
      <div class="field"><label class="label" for="ws-url">نشانی فضای کاری</label><div class="row" style="gap:0"><span class="input" style="width:auto;background:var(--surface-2);border-inline-end:0;border-radius:6px 0 0 6px;display:flex;align-items:center;color:var(--text-2)">gr8rstudio.com/</span><input class="input" id="ws-url" value="${esc(d.ws.url)}" style="border-radius:0 6px 6px 0"></div><span class="hint">تغییر نشانی باعث از کار افتادن پیوندهای قبلی می‌شود.</span></div>
      <div><button class="btn btn-primary" data-a="saveWorkspace" id="ws-save">ذخیره تغییرات</button></div></div></div></form>
      <div class="sblock"><h2 style="color:var(--red)">بخش عملیات حساس</h2>${srow('حذف فضای کاری', 'این فضای کاری و همه پروژه‌ها، کارها و فایل‌های آن برای همیشه حذف می‌شوند. این عملیات قابل بازگشت نیست.', `<button class="btn btn-danger-ghost" style="border:1px solid color-mix(in srgb,var(--red) 35%,transparent)" data-a="delWorkspace">حذف فضای کاری</button>`)}</div>`
      );
    case 'appearance':
      return (
        H('ظاهر برنامه را روی این دستگاه تنظیم کنید.') +
        `
      <div class="sblock" style="margin-top:0"><h2>پوسته</h2><div class="themecards" style="margin-top:12px" role="radiogroup" aria-label="پوسته">${[
        ['light', 'روشن'],
        ['dark', 'تیره'],
        ['system', 'سیستم'],
      ]
        .map(([k, n]) => {
          const L = { bg: '#FBFAF8', s: '#F2F1EE', t: '#1D1C1A', b: '#E3E1DC', a: '#4B5BD6' },
            Dk = { bg: '#1D1D1C', s: '#151514', t: '#ECEAE5', b: '#333230', a: '#8E9AF3' };
          const pv = c =>
            `<div class="s" style="background:${c.s}"><i style="background:${c.b};width:70%"></i><i style="background:${c.a};width:55%"></i><i style="background:${c.b};width:80%"></i><i style="background:${c.b};width:60%"></i></div><div class="m" style="background:${c.bg}"><i style="background:${c.t};width:45%;height:7px"></i><i style="background:${c.b}"></i><i style="background:${c.b};width:80%"></i><i style="background:${c.a};width:30%;height:10px;margin-top:4px"></i></div>`;
          return `<button class="tcard ${P.theme === k ? 'on' : ''}" role="radio" aria-checked="${P.theme === k}" data-a="setTheme" data-v="${k}"><div class="tprev" style="${k === 'system' ? 'grid-template-columns:1fr 1fr;display:grid' : ''}">${k === 'system' ? `<div style="display:grid;grid-template-columns:30% 1fr">${pv(L)}</div><div style="display:grid;grid-template-columns:30% 1fr">${pv(Dk)}</div>` : pv(k === 'light' ? L : Dk)}</div><span class="row" style="font-weight:500;font-size:13px;gap:6px">${ic(k === 'light' ? 'sun' : k === 'dark' ? 'moon' : 'monitor', 14)}${n}${P.theme === k ? `<span class="sp"></span><span style="color:var(--accent)">${ic('circle-check', 15)}</span>` : ''}</span></button>`;
        })
        .join('')}</div></div>
      <div class="sblock"><h2>رنگ اصلی</h2>${srow(
        'رنگ اصلی',
        'برای دکمه‌های اصلی، نشانگر تمرکز و انتخاب استفاده می‌شود.',
        `<div class="swatches" role="radiogroup" aria-label="رنگ اصلی">${[
          ['indigo', '#4B5BD6'],
          ['blue', '#2F6CD4'],
          ['violet', '#7348CC'],
          ['teal', '#1A7F7A'],
          ['rose', '#B93D68'],
          ['graphite', '#34332F'],
        ]
          .map(
            ([k, c]) =>
              `<button class="sw ${P.accent === k ? 'on' : ''}" style="--c:${c}" role="radio" aria-checked="${P.accent === k}" data-a="setPref" data-k="accent" data-v="${k}" aria-label="${displayLabel(k)}" data-tip="${k[0].toUpperCase() + k.slice(1)}">${P.accent === k ? ic('check', 13) : ''}</button>`,
          )
          .join('')}</div>`,
      )}</div>
      <div class="sblock"><h2>تراکم</h2>
        ${srow('تراکم نوار کناری', 'در حالت فشرده، پروژه‌های بیشتری در صفحه جا می‌گیرند.', `<div class="seg">${['comfortable', 'compact'].map(k => `<button class="${P.side === k ? 'on' : ''}" data-a="setPref" data-k="side" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`)}
        ${srow('نمایش کار', 'ارتفاع ردیف‌های فهرست و فاصله داخلی کارت‌های تابلو.', `<div class="seg">${['comfortable', 'compact'].map(k => `<button class="${P.density === k ? 'on' : ''}" data-a="setPref" data-k="density" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`)}
        ${srow(
          'حرکت',
          'حرکت پنل‌ها، پنجره‌ها و جابه‌جایی صفحه‌ها را کاهش دهید.',
          sel(
            'motion',
            [
              ['system', 'هماهنگ با سیستم'],
              ['reduce', 'کاهش حرکت'],
            ],
            P.motion,
          ),
        )}
      </div>`
      );
    case 'language':
      return (
        H('زبان و قالب‌های منطقه‌ای.') +
        srow('زبان', 'زبان رابط کاربری برنامه.', sel('lang', [['fa-IR', 'فارسی']], 'fa-IR')) +
        srow('بررسی املا', 'املای توضیحات و دیدگاه‌ها بررسی شود.', tog('spell', P.spell !== false))
      );
    case 'datetime':
      return (
        H('شیوه نمایش تاریخ و ساعت در فضای کاری.') +
        srow(
          'منطقه زمانی',
          'برای مهلت‌ها و یادآوری‌ها استفاده می‌شود.',
          sel(
            'tz',
            [
              ['Asia/Tehran', 'تهران (UTC+03:30)'],
              ['(GMT-08:00) Pacific Time', 'ساحل اقیانوس آرام (UTC-08:00)'],
              ['(GMT-05:00) Eastern Time', 'شرق آمریکا (UTC-05:00)'],
              ['(GMT+00:00) London', 'لندن (UTC+00:00)'],
              ['(GMT+01:00) Berlin', 'برلین (UTC+01:00)'],
              ['(GMT+08:00) Singapore', 'سنگاپور (UTC+08:00)'],
            ],
            P.tz,
          ),
        ) +
        srow(
          'قالب تاریخ',
          `پیش‌نمایش: <b>${fmtDate(dOff(8))}</b>`,
          sel(
            'dateFmt',
            [
              ['MMM d', '۱ مهر'],
              ['d/M', '۱/۷'],
              ['M/d', '۷/۱'],
              ['yyyy-MM-dd', '۱۴۰۵/۰۷/۰۱'],
            ],
            P.dateFmt,
          ),
        ) +
        srow(
          'شروع هفته از',
          'روی تقویم و خط زمانی تأثیر می‌گذارد.',
          sel(
            'weekStart',
            [
              ['1', 'دوشنبه'],
              ['0', 'یکشنبه'],
              ['6', 'شنبه'],
            ],
            P.weekStart,
          ),
        ) +
        srow(
          'قالب ساعت',
          '',
          sel(
            'timeFmt',
            [
              ['12', '۱۲ ساعته (۲:۳۰ بعدازظهر)'],
              ['24', '۲۴ ساعته (۱۴:۳۰)'],
            ],
            P.timeFmt || '12',
          ),
        )
      );
    case 'members':
      return (
        H(`${d.members.length} نفر دسترسی دارند به ${esc(d.ws.name)}.`) +
        `<div class="row" style="margin-bottom:12px"><button class="btn btn-primary" data-a="invite">${ic('user-plus', 14)}دعوت عضو</button><button class="btn btn-secondary" data-a="go" data-r="members">باز کردن فهرست اعضا</button></div>
      <div class="panel" style="overflow:hidden">${d.members.map(m => `<div class="mini" style="min-height:52px;cursor:default" data-ctx="member" data-id="${m.id}">${av(m.id, 'md', false)}<div class="grow"><div style="font-weight:500">${esc(m.name)}</div><div class="faint" style="font-size:12px">${esc(m.email)}</div></div>${m.status === 'invited' ? '<span class="badge amber">دعوت‌شده</span>' : ''}${m.role === 'Owner' ? `<span class="pillbtn">${ic('crown', 13)}مالک</span>` : `<button class="pillbtn bordered" data-a="pop" data-pop="role" data-id="${m.id}">${displayLabel(m.role)}${ic('chevron-down', 12)}</button>`}<button class="ibtn ibtn-sm" data-a="ctxBtn" data-ctx="member" data-id="${m.id}" aria-label="گزینه‌ها">${ic('ellipsis', 14)}</button></div>`).join('')}</div>`
      );
    case 'teams':
      return H('تیم‌ها افراد و پروژه‌ها را گروه‌بندی می‌کنند.') + teamsGrid();
    case 'projects': {
      const arch = d.projects.filter(p => p.archived);
      return (
        H('پیش‌فرض پروژه‌های جدید و کارهای بایگانی‌شده.') +
        srow(
          'نمای پیش‌فرض پروژه',
          'زبانه‌ای که هنگام باز کردن پروژه نمایش داده می‌شود.',
          sel(
            'defaultTab',
            [
              ['board', 'تابلو'],
              ['list', 'فهرست'],
              ['table', 'جدول'],
              ['overview', 'نمای کلی'],
              ['timeline', 'خط زمانی'],
            ],
            P.defaultTab || 'board',
          ),
        ) +
        srow('نمایش کارهای تکمیل‌شده در تابلو', '', tog('showDoneBoard', P.showDoneBoard !== false)) +
        `<div class="sblock"><h2>پروژه‌های بایگانی‌شده</h2>${arch.length ? arch.map(p => `<div class="srow"><div class="row">${pIcon(p, '', 14)}<b style="font-weight:500">${esc(p.name)}</b></div><div class="row"><button class="btn btn-secondary btn-sm" data-a="restoreProject" data-id="${p.id}">بازیابی</button><button class="btn btn-danger-ghost btn-sm" data-a="delProject" data-id="${p.id}">حذف</button></div></div>`).join('') : `<p class="faint" style="padding:12px 0">پروژه بایگانی‌شده‌ای وجود ندارد. پروژه‌های بایگانی‌شده از نوار کناری پنهان می‌شوند اما کارهایشان محفوظ می‌مانند.</p>`}<div style="margin-top:12px"><button class="btn btn-secondary btn-sm" data-a="go" data-r="archive">${ic('archive', 13)}باز کردن بایگانی</button></div></div>`
      );
    }
    case 'permissions':
      return (
        H('دسترسی‌های هر نقش را تنظیم کنید.') +
        srow('اعضا می‌توانند پروژه ایجاد کنند', '', tog('permCreate', P.permCreate !== false)) +
        srow('اعضا می‌توانند مهمان دعوت کنند', 'مهمان‌ها فقط پروژه‌هایی را می‌بینند که به آن‌ها اضافه شده‌اند.', tog('permGuests', P.permGuests !== false)) +
        srow('اجازه اشتراک‌گذاری عمومی با پیوند', 'هر فرد دارای پیوند می‌تواند پروژه را مشاهده کند.', tog('permPublic', !!P.permPublic)) +
        `<div class="sblock"><h2>دسترسی نقش‌ها</h2><div style="margin-top:12px">${permsTable()}</div></div>`
      );
    case 'notif-email':
      return (
        H('ایمیل‌هایی را که دریافت می‌کنید انتخاب کنید.') +
        srow('اشاره‌ها', 'وقتی کسی به شما اشاره می‌کند.', tog('email_mention', np.email_mention, 'np')) +
        srow('واگذاری‌ها', 'وقتی کاری به شما واگذار می‌شود.', tog('email_assign', np.email_assign, 'np')) +
        srow('دیدگاه‌ها', 'در کارهایی که ایجاد کرده‌اید یا مسئول آن هستید.', tog('email_comment', np.email_comment, 'np')) +
        srow('خلاصه روزانه', 'خلاصه تغییرات، روزهای کاری ساعت ۸ صبح.', tog('email_digest', np.email_digest, 'np'))
      );
    case 'notif-push':
      return (
        H('اعلان‌ها روی دسکتاپ و موبایل.') +
        srow('اشاره‌ها', '', tog('push_mention', np.push_mention, 'np')) +
        srow('واگذاری‌ها', '', tog('push_assign', np.push_assign, 'np')) +
        srow('دیدگاه‌ها', '', tog('push_comment', np.push_comment, 'np')) +
        srow('یادآوری مهلت انجام', 'یک روز قبل از مهلت کار.', tog('push_due', np.push_due, 'np'))
      );
    case 'notif-mentions':
      return (
        H('مشخص کنید کدام اشاره‌ها به شما اطلاع داده شوند.') +
        srow('اشاره به شما در دیدگاه‌ها و توضیحات', '', tog('mention_all', np.mention_all, 'np')) +
        srow('اشاره به تیم', 'وقتی به تیم شما اشاره می‌شود.', tog('mention_team', np.mention_team !== false, 'np')) +
        srow('اشاره به فضای کاری', 'اطلاعیه‌های همگانی.', tog('mention_ws', !!np.mention_ws, 'np'))
      );
    case 'notif-assign':
      return (
        H('به‌روزرسانی کارهایی که به شما واگذار شده‌اند.') +
        srow('وقتی کاری به من واگذار می‌شود', '', tog('assign_self', np.assign_self, 'np')) +
        srow('وقتی وضعیت کارم تغییر می‌کند', '', tog('assign_status', np.assign_status !== false, 'np')) +
        srow('وقتی مهلت کارم می‌گذرد', '', tog('assign_over', np.assign_over !== false, 'np'))
      );
    case 'profile': {
      const err = S.ui.errors.pname2;
      return (
        H('مشخصاتی که دیگران از شما در فضای کاری می‌بینند.') +
        `<form data-submit="saveProfile" class="col" style="gap:16px;max-width:440px">
      <div class="row" style="gap:14px">${av(d.me, 'xl', false)}<div><div class="label" style="margin-bottom:6px">رنگ آواتار</div><div class="swatches">${['#5A67D8', '#C54B78', '#3B82C4', '#23918A', '#C48A1E', '#8662C9'].map(c => `<button type="button" class="sw ${me().c === c ? 'on' : ''}" style="--c:${c};width:22px;height:22px" data-a="avColor" data-v="${c}" aria-label="رنگ"></button>`).join('')}</div></div></div>
      <div class="field"><label class="label" for="pf-name">نام و نام خانوادگی</label><input class="input ${err ? 'is-error' : ''}" id="pf-name" value="${esc(P.name)}">${err ? `<span class="err">${ic('circle-alert', 12)}${err}</span>` : ''}</div>
      <div class="field"><label class="label" for="pf-title">عنوان</label><input class="input" id="pf-title" value="${esc(P.title)}"></div>
      <div class="field"><label class="label" for="pf-email">ایمیل</label><input class="input" id="pf-email" value="${esc(me().email)}" disabled><span class="hint">برای تغییر ایمیل ورود با مالک فضای کاری تماس بگیرید.</span></div>
      <div><button class="btn btn-primary" data-a="saveProfile" id="pf-save">ذخیره پروفایل</button></div></form>`
      );
    }
    case 'preferences':
      return (
        H('تنظیمات شخصی متناسب با شیوه کار شما.') +
        srow(
          'صفحه شروع',
          'صفحه‌ای که هنگام باز کردن برنامه می‌بینید.',
          sel(
            'home',
            [
              ['home', 'خانه'],
              ['mytasks', 'کارهای من'],
              ['inbox', 'صندوق ورودی'],
            ],
            P.home,
          ),
        ) +
        srow(
          'باز کردن کارها در',
          'پنل کناری موقعیت شما را در فهرست حفظ می‌کند.',
          sel(
            'openTasks',
            [
              ['drawer', 'پنل کناری'],
              ['full', 'تمام‌صفحه'],
            ],
            P.openTasks,
          ),
        ) +
        srow('تأیید قبل از حذف کارها', '', tog('confirmDel', P.confirmDel !== false))
      );
    case 'shortcuts':
      return (
        H('با صفحه‌کلید سریع‌تر کار کنید.') +
        SHORTCUTS.map(
          ([g, list]) =>
            `<div class="sblock" style="margin-top:18px"><h2>${g}</h2>${list.map(([n, k]) => `<div class="srow" style="padding:9px 0"><span>${n}</span><span class="row" style="gap:4px">${k.map((x, i) => `${i && k[0] === 'G' ? '<span class="faint" style="font-size:11px">then</span>' : ''}<kbd>${x}</kbd>`).join('')}</span></div>`).join('')}</div>`,
        ).join('')
      );
    case 'password': {
      const e = S.ui.errors;
      const pw = S.ui.pwNew || '';
      return (
        H('از یک رمز عبور بلند و منحصربه‌فرد استفاده کنید.') +
        `${S.ui.pwDone ? `<div class="alert ok" style="margin-bottom:14px">${ic('circle-check', 15)}<span>رمز عبور به‌روز شد. نشست‌های دیگر وارد می‌مانند.</span></div>` : ''}<form data-submit="savePassword" class="col" style="gap:14px;max-width:400px">
      <div class="field"><label class="label" for="pw-cur">رمز عبور فعلی</label><input type="password" class="input ${e.pwCur ? 'is-error' : ''}" id="pw-cur" autocomplete="current-password">${e.pwCur ? `<span class="err">${ic('circle-alert', 12)}${e.pwCur}</span>` : ''}</div>
      <div class="field"><label class="label" for="pw-new">رمز عبور جدید</label><input type="password" class="input ${e.pwNew ? 'is-error' : ''}" id="pw-new" data-in="pwStrength" value="${esc(pw)}" autocomplete="new-password">${strengthMeter(pw)}${e.pwNew ? `<span class="err">${ic('circle-alert', 12)}${e.pwNew}</span>` : '<span class="hint">حداقل ۱۰ نویسه شامل یک عدد یا نماد.</span>'}</div>
      <div class="field"><label class="label" for="pw-conf">تکرار رمز عبور جدید</label><input type="password" class="input ${e.pwConf ? 'is-error' : ''}" id="pw-conf" autocomplete="new-password">${e.pwConf ? `<span class="err">${ic('circle-alert', 12)}${e.pwConf}</span>` : ''}</div>
      <div><button class="btn btn-primary" data-a="savePassword" id="pw-save">به‌روزرسانی رمز عبور</button></div></form>`
      );
    }
    case 'sessions':
      return (
        H('دستگاه‌هایی که اکنون به حساب شما وارد شده‌اند.') +
        d.sessions
          .map(s =>
            srow(
              `<span class="row" style="gap:8px">${ic(s.dev.includes('iPhone') ? 'smartphone' : 'monitor', 15)}${esc(s.dev)}${s.cur ? '<span class="badge green">این دستگاه</span>' : ''}</span>`,
              `${esc(s.loc)} · ${esc(s.at)}`,
              s.cur ? '' : `<button class="btn btn-secondary btn-sm" data-a="revokeSession" data-id="${s.id}">خروج</button>`,
            ),
          )
          .join('') +
        `<div style="margin-top:16px"><button class="btn btn-danger-ghost" data-a="revokeAll" ${d.sessions.length > 1 ? '' : 'disabled'}>خروج از همه نشست‌های دیگر</button></div>`
      );
    case '2fa':
      return (
        H('یک مرحله دیگر برای ورود اضافه کنید.') +
        (d.tfa
          ? `<div class="alert ok">${ic('shield-check', 16)}<div><b>احراز هویت دومرحله‌ای فعال است.</b><div class="muted">برای ورود در دستگاه جدید، کدی از برنامه احراز هویت وارد می‌کنید.</div></div></div><div class="sblock"><h2>کدهای بازیابی</h2><p class="muted" style="font-size:13px">این کدها را در جای امن نگه دارید. هر کد یک بار قابل استفاده است.</p><div style="display:grid;grid-template-columns:repeat(2,max-content);gap:6px 28px;font-family:var(--mono);font-size:13px;padding:14px;border:1px solid var(--border);border-radius:var(--r);background:var(--sunken);user-select:all">${['7KQ2-M8PX', 'D4TN-9WRE', 'HV3C-QZ6L', 'P2YB-J7SK', 'R9FG-4NUD', 'X6MA-T3HE'].map(c => `<span>${c}</span>`).join('')}</div><div style="margin-top:14px"><button class="btn btn-danger-ghost" data-a="disable2fa">خاموش کردن احراز هویت دومرحله‌ای</button></div></div>`
          : S.ui.tfaSetup
            ? `<div class="panel" style="padding:18px;display:flex;gap:20px;flex-wrap:wrap"><div style="width:132px;height:132px;display:grid;grid-template-columns:repeat(11,1fr);gap:1px;padding:8px;background:#fff;border-radius:8px;border:1px solid var(--border)" aria-label="QR code">${Array.from(
                { length: 121 },
                (_, i) => {
                  const r = Math.floor(i / 11),
                    c = i % 11;
                  const f = (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
                  const on = f ? !((r === 1 && c === 1) || (r === 1 && c === 9) || (r === 9 && c === 1)) : (i * 7919) % 13 < 6;
                  return `<i style="background:${on ? '#1D1C1A' : '#fff'}"></i>`;
                },
              ).join('')}</div>
        <div class="grow col" style="gap:10px;min-width:220px"><div><b>۱. کد QR را اسکن کنید</b><div class="muted" style="font-size:13px">از برنامه احراز هویت برای اسکن کد استفاده کنید.</div></div><div><b>۲. کد ۶ رقمی را وارد کنید</b></div><form data-submit="verify2fa" class="row"><input class="input mono ${S.ui.errors.tfa ? 'is-error' : ''}" id="tfa-code" inputmode="numeric" maxlength="6" placeholder="000000" style="width:130px;letter-spacing:.2em;font-size:15px" autofocus><button class="btn btn-primary" data-a="verify2fa">تأیید</button><button type="button" class="btn btn-ghost" data-a="cancel2fa">انصراف</button></form>${S.ui.errors.tfa ? `<span class="err">${ic('circle-alert', 12)}${S.ui.errors.tfa}</span>` : '<span class="hint">در این نسخه نمایشی هر کد ۶ رقمی پذیرفته می‌شود.</span>'}</div></div>`
            : `<div class="panel" style="padding:18px" ><div class="row" style="gap:14px;align-items:flex-start"><span class="ftype" style="--c:var(--amber);width:36px;height:36px">${ic('shield-alert', 18)}</span><div class="grow"><b>احراز هویت دومرحله‌ای غیرفعال است</b><p class="muted" style="margin:4px 0 12px;font-size:13px">علاوه بر رمز عبور، با کد برنامه احراز هویت از حساب خود محافظت کنید.</p><button class="btn btn-primary" data-a="setup2fa">راه‌اندازی احراز هویت دومرحله‌ای</button></div></div></div>`)
      );
    case 'plan':
      return (
        H('اشتراک و میزان مصرف شما.') +
        `<div class="panel" style="padding:18px;margin-bottom:18px"><div class="row" style="flex-wrap:wrap"><div><div class="eyebrow">طرح فعلی</div><div style="font-size:20px;font-weight:600;letter-spacing:-.015em;margin-top:4px">${esc(d.plan || 'تیم')} <span class="muted" style="font-size:14px;font-weight:400">· ۱۲ دلار برای هر عضو در ماه</span></div><div class="muted" style="font-size:13px">تمدید در ${fmtDate(dOff(7), true)} · پرداخت ماهانه</div></div><span class="sp"></span><button class="btn btn-secondary" data-a="go" data-r="settings" data-sec="invoices">مشاهده صورتحساب‌ها</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;margin-top:18px">${[
        ['اعضا', d.members.length, 10, ''],
        ['فضای ذخیره‌سازی', 12.4, 100, ' GB'],
        ['پروژه‌ها', d.projects.length, 50, ''],
      ]
        .map(
          ([n, v, m, u]) =>
            `<div><div class="row" style="font-size:12.5px;margin-bottom:6px"><span class="muted">${n}</span><span class="sp"></span><span class="num">${v}${u} of ${m}${u}</span></div><div class="meter"><i style="width:${(v / m) * 100}%;${v / m > 0.75 ? 'background:var(--amber)' : ''}"></i></div></div>`,
        )
        .join('')}</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">${[
        ['رایگان', '$0', ['حداکثر ۳ عضو', 'کارهای نامحدود', '۵ گیگابایت فضای ذخیره‌سازی']],
        ['تیم', '$12', ['حداکثر ۵۰ عضو', 'خط زمانی و نماهای سفارشی', '۱۰۰ گیگابایت فضای ذخیره‌سازی', 'دسترسی مهمان']],
        ['کسب‌وکار', '$24', ['اعضای نامحدود', 'دسترسی‌های پیشرفته', 'SAML SSO', '۱ ترابایت فضای ذخیره‌سازی']],
      ]
        .map(([n, pr, fs]: [string, string, string[]]) => {
          const cur = (d.plan || 'تیم') === n;
          return `<div class="plan ${cur ? 'cur' : ''}"><div class="row"><b>${n}</b>${cur ? '<span class="badge accent">فعلی</span>' : ''}</div><div class="pr">${pr}<span class="muted" style="font-size:12.5px;font-weight:400"> برای هر عضو در ماه</span></div><ul>${fs.map(f => `<li>${ic('check', 13)}${f}</li>`).join('')}</ul><div style="margin-top:8px">${cur ? `<button class="btn btn-secondary btn-block" disabled>طرح فعلی</button>` : `<button class="btn ${n === 'کسب‌وکار' ? 'btn-primary' : 'btn-secondary'} btn-block" data-a="changePlan" data-v="${n}">${n === 'رایگان' ? 'کاهش سطح' : 'ارتقا'}</button>`}</div></div>`;
        })
        .join('')}</div>`
      );
    case 'payment':
      return (
        H('روش پرداخت و مشخصات صورتحساب.') +
        srow(
          `<span class="row" style="gap:10px"><span class="ftype" style="--c:var(--blue)">${ic('credit-card', 15)}</span>ویزا با شماره پایانی ۴۲۴۲</span>`,
          'انقضا ۲۰۲۸/۰۸ · پیش‌فرض',
          `<button class="btn btn-secondary btn-sm" data-a="toastInfo" data-msg="Card updates open in a secure payment window">به‌روزرسانی</button>`,
        ) +
        srow('ایمیل صورتحساب', 'صورتحساب‌ها و رسیدها به این نشانی ارسال می‌شوند.', `<span class="muted" style="user-select:all">hello@gr8rstudio.com</span>`) +
        srow(
          'نشانی صورتحساب',
          '2150 Mission St, San Francisco, CA 94110',
          `<button class="btn btn-secondary btn-sm" data-a="toastInfo" data-msg="Address editing opens in the billing portal">ویرایش</button>`,
        ) +
        srow('شناسه مالیاتی', 'در صورتحساب‌ها نمایش داده می‌شود', `<span class="muted">US EIN ••-•••4410</span>`)
      );
    case 'invoices':
      return (
        H('صورتحساب‌های قبلی این فضای کاری.') +
        `<div class="panel" style="overflow-x:auto"><table class="perm-t" style="min-width:480px"><thead><tr><th style="padding-inline-start:14px">صورتحساب</th><th style="text-align:start">تاریخ</th><th style="text-align:start">مبلغ</th><th style="text-align:start">وضعیت</th></tr></thead><tbody>${d.invoices.map(i => `<tr><td style="padding-inline-start:14px" class="mono">${i.id}</td><td style="text-align:start" class="num">${fmtDate(i.date, true)}</td><td style="text-align:start" class="num">${i.amt}</td><td style="text-align:start"><span class="badge green">${ic('check', 11)}${i.st}</span></td></tr>`).join('')}</tbody></table></div>`
      );
  }
  return page404();
}
export function strengthMeter(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  const c = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--green)', 'var(--green)'][s];
  const n = ['بسیار کوتاه', 'ضعیف', 'متوسط', 'خوب', 'قوی'][s];
  return pw
    ? `<div class="row" style="gap:8px"><div class="strength grow" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i < s ? 'on' : ''}" style="--c:${c}"></i>`).join('')}</div><span style="font-size:11.5px;color:${c};width:60px;text-align:end">${n}</span></div>`
    : '';
}
