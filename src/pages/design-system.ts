import { faNumber } from '../core/locale';
/* ---------------- DESIGN SYSTEM ---------------- */
import { dOff } from '../core/utils';
import { ic } from '../core/icons';
import { LABELS, PCOLORS, PRIOS, STATUSES } from '../core/constants';
import { S, allTasks, task } from '../core/store';
import { av, avStack, empty, lbl, pStatus, prPill, progBar, stPill } from '../ui/helpers';
import { sItem } from '../shell/layout';
import { sk, skRows } from '../shell/skeletons';
import { miniRow } from '../components/task-list';
import { kcard } from '../views/board';

export function pageSystem() {
  const tok = (n, v) => `<div class="ds-tok"><div class="c" style="--c:var(${v})"></div><div class="n"><span>${n}</span><code>${v}</code></div></div>`;
  const B = (cls, lab, st = '') => `<button class="btn ${cls} ${st}" ${st === 'dis' ? 'disabled' : ''}>${lab}</button>`;
  const states = ['', 'state-hover', 'state-active', 'state-focus', 'dis', 'is-loading'];
  const stN = ['پیش‌فرض', 'نشانگر ماوس', 'فعال', 'تمرکز', 'غیرفعال', 'در حال بارگذاری'];
  return `<div class="page">
    <div class="ph"><div><h1>سیستم طراحی</h1><p>توکن‌ها و اجزای سازنده برنامه. برای دیدن هر دو پالت، پوسته را تغییر دهید.</p></div><div class="acts"><div class="seg">${[
      ['light', 'sun'],
      ['dark', 'moon'],
      ['system', 'monitor'],
    ]
      .map(
        ([k, i]) =>
          `<button class="${S.prefs.theme === k ? 'on' : ''}" data-a="setTheme" data-v="${k}">${ic(i, 13)}${k[0].toUpperCase() + k.slice(1)}</button>`,
      )
      .join('')}</div></div></div>
    <div class="ds-sec" style="margin-top:8px"><h2>رنگ <span>توکن‌های معنایی متناسب با هر پوسته</span></h2><div class="ds-grid">${[
      ['پس‌زمینه', '--bg'],
      ['نوار کناری', '--bg-side'],
      ['سطح', '--surface'],
      ['سطح ۲', '--surface-2'],
      ['سطح ۳', '--surface-3'],
      ['حاشیه', '--border'],
      ['حاشیه پررنگ', '--border-strong'],
      ['متن', '--text'],
      ['متن ۲', '--text-2'],
      ['متن ۳', '--text-3'],
      ['رنگ اصلی', '--accent'],
      ['موفقیت', '--green'],
      ['هشدار', '--amber'],
      ['خطا', '--red'],
    ]
      .map(([n, v]) => tok(n, v))
      .join('')}</div></div>
    <div class="ds-sec"><h2>وضعیت و اولویت <span>همیشه همراه متن یا راهنمای شناور</span></h2><div class="ds-row">${STATUSES.map(s => `<span class="pillbtn bordered">${stPill(s.id)}</span>`).join('')}</div><div class="ds-row">${PRIOS.map(p => `<span class="pillbtn bordered">${prPill(p.id)}</span>`).join('')}</div><div class="ds-row">${LABELS.map(l => lbl(l.id)).join('')}</div></div>
    <div class="ds-sec"><h2>تایپوگرافی <span>استعداد</span></h2><div class="panel" style="padding:4px 16px">${[
      ['عنوان صفحه', 'var(--fs-2xl)', 600, 'بازطراحی وب‌سایت'],
      ['عنوان بخش', 'var(--fs-xl)', 600, 'مهلت‌های پیش رو'],
      ['زیربخش', 'var(--fs-md)', 600, 'زیرکارها'],
      ['متن اصلی', 'var(--fs)', 400, 'وایرفریم‌های اولیه صفحه اصلی جدید.'],
      ['ثانویه', 'var(--fs-sm)', 400, '۳۸ دقیقه پیش به‌روز شد'],
      ['فراداده', 'var(--fs-xs)', 500, 'WEB-109 · مهلت فردا'],
      ['برچسب', 'var(--fs-2xs)', 600, 'WORKSPACE'],
    ]
      .map(
        ([n, s, w, ex]: [string, string, number, string]) =>
          `<div class="row" style="padding:10px 0;border-bottom:1px solid var(--divider);gap:16px"><span class="faint" style="width:110px;font-size:12px;flex-shrink:0">${n}</span><span class="grow trunc" style="font-size:${s};font-weight:${w};${n === 'برچسب' ? 'letter-spacing:.06em;color:var(--text-3)' : n === 'ثانویه' || n === 'فراداده' ? 'color:var(--text-2)' : ''}">${ex}</span><code class="mono faint" style="font-size:11px">${s.replace('var(', '').replace(')', '')} / ${faNumber(w)}</code></div>`,
      )
      .join('')}</div></div>
    <div class="ds-sec"><h2>فاصله، شعاع و ارتفاع <span>4pt scale</span></h2><div class="grid2" style="grid-template-columns:1fr 1fr">
      <div class="panel" style="padding:14px">${[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => `<div class="row" style="height:22px;font-size:12px"><code class="mono faint" style="width:56px">--s-${faNumber(n)}</code><span style="height:8px;width:var(--s-${n});background:var(--accent);border-radius:2px;opacity:.7"></span><span class="faint">${faNumber(n * 4)}px</span></div>`).join('')}</div>
      <div class="panel" style="padding:14px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">${[
        ['xs', 4],
        ['sm', 6],
        ['', 8],
        ['lg', 10],
      ]
        .map(
          ([k, v]) =>
            `<div class="col" style="align-items:center;gap:6px;font-size:11.5px"><span style="width:48px;height:48px;border:1.5px solid var(--border-strong);border-radius:var(--r${k ? '-' + k : ''});background:var(--surface-2)"></span><span class="faint">${v}px</span></div>`,
        )
        .join('')}${[
        ['card', '--shadow-card'],
        ['pop', '--shadow-pop'],
        ['drag', '--shadow-drag'],
      ]
        .map(
          ([n, v]) =>
            `<div class="col" style="align-items:center;gap:6px;font-size:11.5px"><span style="width:48px;height:48px;border-radius:8px;background:var(--surface);box-shadow:var(${v})"></span><span class="faint">${n}</span></div>`,
        )
        .join('')}</div></div></div>
    <div class="ds-sec"><h2>دکمه‌ها <span>اصلی · ثانویه · ساده · حذف · آیکن</span></h2>
      ${[
        ['btn-primary', 'ایجاد کار'],
        ['btn-secondary', 'اشتراک‌گذاری'],
        ['btn-ghost', 'فیلتر'],
        ['btn-danger', 'حذف'],
      ]
        .map(
          ([c, l]) =>
            `<div class="ds-row"><span class="lab">${c.replace('btn-', '')}</span>${states.map((s, i) => `<span class="col" style="gap:4px;align-items:flex-start"><span class="faint" style="font-size:11px">${stN[i]}</span>${B(c, l, s)}</span>`).join('')}</div>`,
        )
        .join('')}
      <div class="ds-row"><span class="lab">icon</span>${['plus', 'list-filter', 'ellipsis', 'star', 'share-2', 'settings'].map((i, k) => `<button class="ibtn ${k === 1 ? 'on' : ''}" aria-label="${i}" data-tip="${i}">${ic(i, 16)}</button>`).join('')}<button class="ibtn" disabled aria-label="غیرفعال">${ic('trash-2', 16)}</button><span class="faint" style="font-size:11.5px">اندازه‌ها:</span><button class="btn btn-secondary btn-sm">Small</button><button class="btn btn-secondary">متوسط</button><button class="btn btn-secondary btn-lg">Large</button></div></div>
    <div class="ds-sec"><h2>Inputs</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px" class="panel" >
      <div style="padding:14px;display:contents"></div>
      ${[
        ['متن', `<input class="input" placeholder="نام کار" id="ds-1">`],
        ['تمرکز', `<input class="input" value="Homepage wireframes" style="border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)" id="ds-2">`],
        ['خطا', `<input class="input is-error" value="alex@" id="ds-3"><span class="err">${ic('circle-alert', 12)}یک نشانی ایمیل معتبر وارد کنید</span>`],
        ['غیرفعال', `<input class="input" value="hello@gr8rstudio.com" disabled id="ds-4">`],
        ['جستجو', `<div class="inwrap">${ic('search', 13)}<input class="input" placeholder="جستجوی کارها" id="ds-5"><span class="kbd">/</span></div>`],
        ['انتخاب', `<select class="select" id="ds-6"><option>در حال انجام</option><option>در حال بررسی</option></select>`],
        [
          'انتخاب چندگانه',
          `<div class="input" style="height:auto;min-height:30px;display:flex;flex-wrap:wrap;gap:4px;padding:4px">${lbl('design')}${lbl('frontend')}${lbl('qa')}<span class="faint" style="font-size:12px;padding:2px 4px">افزودن…</span></div>`,
        ],
        ['تاریخ', `<input type="date" class="input" value="${dOff(3)}" id="ds-7">`],
        ['زمان', `<input type="time" class="input" value="14:30" id="ds-8">`],
        [
          'چک‌باکس · انتخاب تکی · کلید',
          `<div class="row" style="gap:14px"><input type="checkbox" class="check" checked aria-label="c1"><input type="checkbox" class="check" aria-label="c2"><input type="checkbox" class="check round" checked aria-label="c3"><input type="radio" class="radio" name="dsr" checked aria-label="r1"><input type="radio" class="radio" name="dsr" aria-label="r2"><input type="checkbox" class="toggle" checked aria-label="t1"><input type="checkbox" class="toggle" aria-label="t2"></div>`,
        ],
        ['کادر متن', `<textarea class="textarea" rows="2" id="ds-9">توضیحی اضافه کنید…</textarea>`],
        [
          'متن غنی',
          `<div class="rte" style="border-color:var(--border)"><div class="rte-tb" style="opacity:1;border-bottom-color:var(--divider)">${['bold', 'italic', 'list', 'list-ordered', 'heading', 'link'].map(i => `<span class="ibtn ibtn-xs">${ic(i, 13)}</span>`).join('')}</div><div class="rte-body" style="min-height:40px"><b>ضخیم</b>, <i>italic</i>, and lists.</div></div>`,
        ],
      ]
        .map(([n, h]) => `<div class="field" style="padding:14px"><span class="label">${n}</span>${h}</div>`)
        .join('')}</div></div>
    <div class="ds-sec"><h2>ناوبری</h2><div class="grid2" style="grid-template-columns:260px 1fr">
      <div class="side" style="border:1px solid var(--border);border-radius:var(--r-lg);padding:8px;height:auto">${sItem('home', 'خانه', 'house')}<button class="sitem on">${ic('inbox', 16)}<span>صندوق ورودی (فعال)</span><span class="ct dotc">3</span></button><button class="sitem state-hover">${ic('circle-check', 16)}<span>کارهای من (hover)</span></button><div class="sitem"><span class="pico" style="--c:${PCOLORS.indigo}">${ic('globe', 12)}</span><span>بازطراحی وب‌سایت</span><span class="sdot" style="background:var(--blue)"></span></div></div>
      <div class="col" style="gap:14px"><nav class="crumbs" style="border:1px solid var(--border);border-radius:var(--r);padding:6px"><button>Gr8r Studio</button><span class="sep">/</span><button>پروژه‌ها</button><span class="sep">/</span><button class="cur">بازطراحی وب‌سایت</button></nav>
      <div class="tabs">${['نمای کلی', 'تابلو', 'فهرست', 'جدول'].map((t, i) => `<button class="tab ${i === 1 ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="row"><div class="seg"><button class="on">${ic('layout-grid', 13)}شبکه</button><button>${ic('list', 13)}فهرست</button><button>${ic('table-2', 13)}جدول</button></div><span class="chip">${ic('circle-dot', 12)}<b>وضعیت</b> برابر است با <span>در حال انجام</span><span class="ibtn">${ic('x', 12)}</span></span></div></div></div></div>
    <div class="ds-sec"><h2>نمایش داده‌ها</h2><div class="grid2" style="grid-template-columns:300px 1fr">
      <div style="background:var(--sunken);padding:10px;border-radius:var(--r-lg)">${kcard(task('t3') || allTasks()[0])}</div>
      <div class="col" style="gap:12px"><div class="ds-row"><span class="lab">Avatar</span>${['m1', 'm2', 'm3'].map(i => av(i, 'sm')).join('')}${av('m4')}${av('m5', 'md')}${av('m6', 'lg')}${av(null)}${avStack(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], 4, 'md')}</div>
      <div class="ds-row"><span class="lab">Badge</span><span class="badge">پیش‌فرض</span><span class="badge accent">رنگ اصلی</span><span class="badge green"><span class="dot"></span>فعال</span><span class="badge amber"><span class="dot"></span>دعوت‌شده</span><span class="badge red">3 عقب‌افتاده</span>${pStatus('active')}${pStatus('risk')}</div>
      <div class="ds-row"><span class="lab">پیشرفت</span><span style="width:200px;display:flex">${progBar(64)}</span><span style="width:120px;display:flex">${progBar(100, 'green')}</span><span style="width:120px;display:flex">${progBar(30, 'red')}</span></div>
      <div class="panel" style="overflow:hidden">${allTasks()
        .slice(0, 2)
        .map(t => miniRow(t))
        .join('')}</div></div></div></div>
    <div class="ds-sec"><h2>Feedback</h2>
      <div class="col" style="gap:8px;margin-bottom:12px"><div class="alert info">${ic('info', 15)}<span><b>توجه کنید.</b> وابستگی‌های خارج از ترتیب در خط زمانی به‌صورت خط‌چین نمایش داده می‌شوند.</span></div><div class="alert ok">${ic('circle-check', 15)}<span>پروژه بایگانی شد. <button class="link">بازگردانی</button></span></div><div class="alert warn">${ic('triangle-alert', 15)}<span>۳ کار با مهلت این هفته هنوز شروع نشده‌اند.</span></div><div class="alert danger">${ic('circle-alert', 15)}<span>تغییرات شما ذخیره نشدند. <button class="link">تلاش دوباره</button></span></div></div>
      <div class="ds-row"><span class="lab">Triggers</span><button class="btn btn-secondary" data-a="demoToast" data-v="ok">Toast</button><button class="btn btn-secondary" data-a="demoToast" data-v="err">پیام خطا</button><button class="btn btn-secondary" data-tip="دکمه‌های آیکن‌دار همراه راهنمای شناور">Tooltip</button><button class="btn btn-secondary" data-a="newTask">Modal</button><button class="btn btn-secondary" data-a="openTask" data-id="t3">Drawer</button><button class="btn btn-secondary" data-a="demoConfirm">Confirmation</button><button class="btn btn-secondary" data-a="openPalette">فهرست فرمان‌ها</button></div></div>
    <div class="ds-sec"><h2>Iconography <span>Lucide · 1.8px stroke · 12–18px</span></h2><div class="panel" style="padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:6px;color:var(--text-2)">${['house', 'inbox', 'circle-check', 'star', 'search', 'bell', 'folder-kanban', 'list-checks', 'calendar', 'chart-gantt', 'users', 'activity', 'settings', 'plus', 'list-filter', 'arrow-up-down', 'rows-3', 'share-2', 'ellipsis', 'paperclip', 'message-square', 'tag', 'link', 'copy', 'pencil', 'trash-2', 'archive', 'upload', 'repeat', 'timer', 'git-branch', 'lock', 'eye', 'at-sign', 'sun', 'moon'].map(i => `<span style="height:36px;display:grid;place-items:center" title="${i}">${ic(i, 17)}</span>`).join('')}</div></div>
  </div>`;
}

/* ---------------- SYSTEM STATES GALLERY ---------------- */
export function pageStates() {
  const card = (cap, icon, inner) => `<div class="panel"><div class="cap">${ic(icon, 13)}${cap}</div>${inner}</div>`;
  return `<div class="page wide" style="max-width:1240px">
    <div class="ph"><div><h1>وضعیت‌های سیستم</h1><p>وضعیت‌های خالی، بارگذاری، خطا و تأیید در سراسر برنامه.</p></div><div class="acts"><button class="btn btn-secondary" data-a="toggleOffline">${ic(S.ui.offline ? 'wifi' : 'wifi-off', 14)}${S.ui.offline ? 'اتصال دوباره' : 'شبیه‌سازی قطع اتصال'}</button></div></div>
    <h2 class="sec" style="margin:8px 0 10px">وضعیت‌های خالی</h2>
    <div class="states-grid">
      ${card('پروژه‌ای وجود ندارد', 'folder-kanban', empty('folder-kanban', 'هنوز پروژه‌ای وجود ندارد', 'برای سامان‌دهی کارها، اولین پروژه‌تان را ایجاد کنید.', `<button class="btn btn-primary btn-sm" data-a="newProject">${ic('plus', 14)}ایجاد پروژه</button>`))}
      ${card('کاری وجود ندارد', 'list-checks', empty('list-checks', 'اینجا کاری وجود ندارد', 'برای شروع یک کار اضافه کنید.', `<button class="btn btn-primary btn-sm" data-a="newTask">${ic('plus', 14)}افزودن کار</button>`))}
      ${card('اعلانی وجود ندارد', 'bell', empty('bell-off', 'همه موارد را دیده‌اید.', 'اشاره‌ها و واگذاری‌های جدید اینجا نمایش داده می‌شوند.'))}
      ${card('نتیجه‌ای پیدا نشد', 'search', empty('search-x', 'نتیجه‌ای پیدا نشد', 'نتیجه‌ای برای «راهنمای برند» پیدا نشد. املا را بررسی کنید یا عبارت کلی‌تری بنویسید.', `<button class="btn btn-secondary btn-sm">پاک کردن جستجو</button>`))}
    </div>
    <h2 class="sec" style="margin:28px 0 10px">وضعیت‌های بارگذاری</h2>
    <div class="states-grid">
      ${card('ردیف‌های فهرست و جدول', 'rows-3', `<div style="padding:4px 10px">${skRows(5)}</div>`)}
      ${card('کارت‌ها', 'layout-grid', `<div style="padding:12px"><div class="pcard" style="cursor:default">${sk('28px', 28, 'border-radius:7px')}${sk('60%', 12)}${sk('90%', 9)}${sk('70%', 9)}${sk('100%', 4)}</div></div>`)}
      ${card('ستون تابلو', 'square-kanban', `<div style="padding:12px;background:var(--sunken)"><div class="col" style="gap:6px">${[0, 1].map(() => `<div class="kcard" style="cursor:default">${sk('40%', 14)}${sk('80%', 10)}<div class="row">${sk('40px', 9)}<span class="sp"></span>${sk('18px', 18, 'border-radius:50%')}</div></div>`).join('')}</div></div>`)}
      ${card('دکمه‌ها و صفحه', 'loader', `<div style="padding:18px;display:flex;flex-direction:column;gap:14px;align-items:flex-start"><div class="row"><button class="btn btn-primary is-loading">Saving</button><button class="btn btn-secondary is-loading">در حال بارگذاری</button><button class="btn btn-primary" data-a="demoLoad" id="demo-load">برای بارگذاری کلیک کنید</button></div><div class="row muted" style="font-size:13px">${`<span style="width:16px;height:16px;border-radius:50%;border:2px solid var(--border-strong);border-top-color:var(--accent);animation:spin .7s linear infinite;display:inline-block"></span>`}در حال بارگذاری پروژه…</div><button class="btn btn-ghost btn-sm" data-a="reloadPage">${ic('refresh-cw', 13)}نمایش دوباره حالت بارگذاری</button></div>`)}
    </div>
    <h2 class="sec" style="margin:28px 0 10px">وضعیت‌های خطا</h2>
    <div class="states-grid">
      ${card('خطای شبکه', 'wifi-off', `<div class="empty-state err sm"><div class="glyph">${ic('wifi-off', 20)}</div><h3 class="es-h">اتصال اینترنت شما قطع است</h3><p>اتصال را بررسی کنید. پس از اتصال دوباره، تغییرات همگام می‌شوند.</p><button class="btn btn-secondary btn-sm" data-a="demoToast" data-v="retry">${ic('refresh-cw', 13)}تلاش دوباره</button></div>`)}
      ${card('بارگذاری ناموفق بود', 'cloud-alert', `<div class="empty-state err sm"><div class="glyph">${ic('cloud-alert', 20)}</div><h3 class="es-h">مشکلی پیش آمد.</h3><p>این نما بارگذاری نشد. داده‌ها محفوظ‌اند.</p><button class="btn btn-secondary btn-sm" data-a="demoToast" data-v="retry">تلاش دوباره</button></div>`)}
      ${card('ذخیره ناموفق بود', 'circle-alert', `<div style="padding:18px" class="col"><div class="alert danger" style="margin-bottom:10px">${ic('circle-alert', 15)}<div><b>تغییرات شما ذخیره نشدند.</b><div class="muted">سرور در زمان مقرر پاسخ نداد.</div></div></div><button class="btn btn-secondary btn-sm" style="align-self:flex-start" data-a="demoToast" data-v="err">نمایش به‌صورت پیام</button></div>`)}
      ${card('دسترسی مجاز نیست', 'lock', `<div class="empty-state sm"><div class="glyph">${ic('lock', 20)}</div><h3 class="es-h">دسترسی ندارید</h3><p>پرتال مشتریان خصوصی است. از مارکوس لی درخواست دسترسی کنید.</p><button class="btn btn-secondary btn-sm" data-a="go" data-r="project" data-id="p6">باز کردن نمونه</button></div>`)}
      ${card('صفحه پیدا نشد', 'file-question', `<div class="empty-state sm"><div class="glyph">${ic('file-question', 20)}</div><h3 class="es-h">صفحه پیدا نشد</h3><p>این صفحه جابه‌جا یا حذف شده است، یا وجود ندارد.</p><button class="btn btn-secondary btn-sm" data-a="go" data-r="nowhere">باز کردن نمونه</button></div>`)}
      ${card('اعتبارسنجی فرم', 'text-cursor-input', `<div style="padding:18px" class="col"><div class="field"><label class="label" for="st-e">ایمیل</label><input class="input is-error" id="st-e" value="hello@gr8rstudio" aria-invalid="true"><span class="err">${ic('circle-alert', 12)}یک ایمیل معتبر مانند name@company.com وارد کنید</span></div></div>`)}
    </div>
    <h2 class="sec" style="margin:28px 0 10px">پنجره‌های تأیید</h2>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn btn-secondary" data-a="delProject" data-id="p5" data-demo="1">${ic('trash-2', 14)}حذف پروژه</button><button class="btn btn-secondary" data-a="delTask" data-id="t10" data-demo="1">${ic('trash-2', 14)}حذف کار</button><button class="btn btn-secondary" data-a="removeMember" data-id="m8" data-demo="1">${ic('user-minus', 14)}حذف عضو</button><button class="btn btn-secondary" data-a="archiveProject" data-id="p7" data-demo="1">${ic('archive', 14)}بایگانی پروژه</button></div>
    <p class="faint" style="font-size:12.5px;margin-top:8px">این دکمه‌ها پنجره‌های واقعی را باز می‌کنند. تأیید عملیات، داده‌های نمایشی را تغییر می‌دهد. برای بازنشانی از بخش راهنما استفاده کنید.</p>
  </div>`;
}
