import { faNumber } from '../core/locale';
/* ---------------- AUTH ---------------- */
import { esc } from '../core/utils';
import { LOGO, ic } from '../core/icons';
import { D, S } from '../core/store';
import { effectiveDark } from '../core/theme';
import { TEMPLATES } from '../overlays/modals';
import { strengthMeter } from './settings';

export function authShell(inner, topRight = '') {
  return `<div class="auth"><div class="auth-top"><span class="brand">${LOGO(22)}</span><div class="row">${topRight}<button class="ibtn" data-a="toggleDark" data-tip="تغییر پوسته" aria-label="تغییر پوسته">${ic(effectiveDark() ? 'sun' : 'moon', 16)}</button></div></div>
    <div class="auth-c">${inner}</div>
    <div class="auth-foot" style="padding:18px;font-size:12px" ><span class="faint">© ۲۰۲۶ Gr8r Studio · شرایط استفاده · حریم خصوصی</span></div></div>`;
}
export const socialBtns = () => `<div class="social">
  <button class="btn btn-secondary btn-lg" data-a="socialAuth" data-v="Google"><svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>ادامه با گوگل</button>
  <button class="btn btn-secondary btn-lg" data-a="socialAuth" data-v="Microsoft"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="6.4" height="6.4" fill="#F25022"/><rect x="7.6" width="6.4" height="6.4" fill="#7FBA00"/><rect y="7.6" width="6.4" height="6.4" fill="#00A4EF"/><rect x="7.6" y="7.6" width="6.4" height="6.4" fill="#FFB900"/></svg>ادامه با مایکروسافت</button>
  <button class="btn btn-secondary btn-lg" data-a="socialAuth" data-v="Apple">${ic('apple', 15)}ادامه با اپل</button></div>`;
export const ferr = k => (S.ui.errors[k] ? `<span class="err" id="${k}-err">${ic('circle-alert', 12)}${S.ui.errors[k]}</span>` : '');
export const icls = k => (S.ui.errors[k] ? 'is-error' : '');
export function renderAuth() {
  const s = S.ui.auth;
  const e = S.ui.errors;
  const f = S.ui.af || (S.ui.af = { email: 'hello@gr8rstudio.com', name: '' });
  if (s === 'onboarding') return renderOnboarding();
  if (s === 'login')
    return authShell(
      `<form class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}" data-submit="doLogin" novalidate>
    <div style="display:flex;justify-content:center">${LOGO(30)}</div><h1>خوش آمدید</h1><p class="sub">ورود به ${esc(D().ws.name)}</p>
    ${e.login ? `<div class="alert danger" role="alert">${ic('circle-alert', 15)}<span>${e.login}</span></div>` : ''}
    <div class="field"><label class="label" for="l-email">ایمیل</label><input class="input input-lg ${icls('email')}" id="l-email" type="email" value="${esc(f.email)}" autocomplete="email" aria-invalid="${!!e.email}" aria-describedby="email-err">${ferr('email')}</div>
    <div class="field"><div class="row"><label class="label" for="l-pw">رمز عبور</label><span class="sp"></span><button type="button" class="link" style="font-size:12.5px" data-a="auth" data-v="forgot">رمز عبور را فراموش کرده‌اید؟</button></div>
      <div class="inwrap"><input class="input input-lg ${icls('pw')}" id="l-pw" type="${S.ui.showPw ? 'text' : 'password'}" autocomplete="current-password" style="padding-inline-end:38px" aria-invalid="${!!e.pw}"><button type="button" class="ibtn ibtn-sm" style="position:absolute;right:5px" data-a="toggleShowPw" aria-label="${S.ui.showPw ? 'پنهان کردن' : 'نمایش'} password">${ic(S.ui.showPw ? 'eye-off' : 'eye', 15)}</button></div>${ferr('pw')}</div>
    <label class="row" style="font-size:13px;gap:8px;cursor:pointer"><input type="checkbox" class="check" id="l-rem" checked>مرا برای ۳۰ روز به خاطر بسپار</label>
    <button class="btn btn-primary btn-lg btn-block" data-a="doLogin" id="login-btn">ورود</button>
    <div class="or">or</div>${socialBtns()}
    <p class="auth-foot">حساب ندارید؟ <button type="button" class="link" data-a="auth" data-v="signup">ثبت‌نام</button></p></form>`,
      `<button class="btn btn-ghost btn-sm" data-a="auth" data-v="signup">ثبت‌نام</button>`,
    );
  if (s === 'signup')
    return authShell(
      `<form class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}" data-submit="doSignup" novalidate>
    <div style="display:flex;justify-content:center">${LOGO(30)}</div><h1>حساب خود را ایجاد کنید</h1><p class="sub">رایگان برای حداکثر ۳ عضو. نیازی به کارت بانکی نیست.</p>
    ${socialBtns()}<div class="or">یا با ایمیل ثبت‌نام کنید</div>
    <div class="field"><label class="label" for="s-name">نام و نام خانوادگی</label><input class="input input-lg ${icls('name')}" id="s-name" value="${esc(f.name)}" autocomplete="name" placeholder="Tanjim Islam">${ferr('name')}</div>
    <div class="field"><label class="label" for="s-email">ایمیل کاری</label><input class="input input-lg ${icls('email')}" id="s-email" type="email" value="" autocomplete="email" placeholder="you@company.com">${ferr('email')}</div>
    <div class="field"><label class="label" for="s-pw">رمز عبور</label><input class="input input-lg ${icls('pw')}" id="s-pw" type="password" data-in="pwStrength" value="${esc(S.ui.pwNew || '')}" autocomplete="new-password">${strengthMeter(S.ui.pwNew || '')}${ferr('pw') || '<span class="hint">حداقل ۱۰ نویسه شامل یک عدد یا نماد.</span>'}</div>
    <button class="btn btn-primary btn-lg btn-block" data-a="doSignup" id="signup-btn">ایجاد حساب</button>
    <p class="hint" style="text-align:center">با ایجاد حساب، شرایط استفاده و سیاست حریم خصوصی را می‌پذیرید.</p>
    <p class="auth-foot">از قبل حساب دارید؟ <button type="button" class="link" data-a="auth" data-v="login">ورود</button></p></form>`,
      `<button class="btn btn-ghost btn-sm" data-a="auth" data-v="login">ورود</button>`,
    );
  if (s === 'forgot')
    return authShell(`<form class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}" data-submit="doForgot" novalidate>
    <div style="display:flex;justify-content:center"><span class="ftype" style="--c:var(--accent);width:44px;height:44px;border-radius:11px">${ic('key-round', 20)}</span></div><h1>رمز عبور خود را بازنشانی کنید</h1><p class="sub">ایمیل حساب خود را وارد کنید تا پیوند بازنشانی را ارسال کنیم.</p>
    <div class="field"><label class="label" for="f-email">ایمیل</label><input class="input input-lg ${icls('email')}" id="f-email" type="email" value="${esc(f.email)}" autocomplete="email">${ferr('email')}</div>
    <button class="btn btn-primary btn-lg btn-block" data-a="doForgot" id="forgot-btn">ارسال پیوند بازنشانی</button>
    <p class="auth-foot"><button type="button" class="link row" style="display:inline-flex;gap:6px" data-a="auth" data-v="login">${ic('arrow-left', 14)}بازگشت به ورود</button></p></form>`);
  if (s === 'forgot-sent')
    return authShell(`<div class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}"><div style="display:flex;justify-content:center"><span class="ftype" style="--c:var(--green);width:44px;height:44px;border-radius:11px">${ic('mail-check', 20)}</span></div><h1>ایمیل خود را بررسی کنید</h1><p class="sub">پیوند بازنشانی ارسال شد به <b style="color:var(--text)">${esc(f.email)}</b>. It expires in 30 minutes.</p>
    <button class="btn btn-primary btn-lg btn-block" data-a="auth" data-v="reset">باز کردن پیوند بازنشانی</button><div class="alert info">${ic('info', 14)}<span>در این نسخه نمایشی، دکمه بالا جایگزین پیوند ایمیل شماست.</span></div>
    <p class="auth-foot">ایمیل را دریافت نکردید؟ <button class="link" data-a="resend" data-v="reset">ارسال دوباره ایمیل</button></p><p class="auth-foot"><button class="link row" style="display:inline-flex;gap:6px" data-a="auth" data-v="login">${ic('arrow-left', 14)}بازگشت به ورود</button></p></div>`);
  if (s === 'reset')
    return authShell(`<form class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}" data-submit="doReset" novalidate><div style="display:flex;justify-content:center">${LOGO(30)}</div><h1>یک رمز عبور جدید انتخاب کنید</h1><p class="sub">for ${esc(f.email)}</p>
    <div class="field"><label class="label" for="r-pw">رمز عبور جدید</label><input class="input input-lg ${icls('pw')}" id="r-pw" type="password" data-in="pwStrength" value="${esc(S.ui.pwNew || '')}" autocomplete="new-password">${strengthMeter(S.ui.pwNew || '')}${ferr('pw')}</div>
    <div class="field"><label class="label" for="r-pw2">تکرار رمز عبور</label><input class="input input-lg ${icls('pw2')}" id="r-pw2" type="password" autocomplete="new-password">${ferr('pw2')}</div>
    <button class="btn btn-primary btn-lg btn-block" data-a="doReset" id="reset-btn">بازنشانی رمز عبور</button></form>`);
  if (s === 'reset-done')
    return authShell(
      `<div class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}"><div style="display:flex;justify-content:center"><span class="ftype" style="--c:var(--green);width:44px;height:44px;border-radius:11px">${ic('circle-check', 20)}</span></div><h1>رمز عبور به‌روز شد</h1><p class="sub">اکنون می‌توانید با رمز عبور جدید وارد شوید.</p><button class="btn btn-primary btn-lg btn-block" data-a="auth" data-v="login">ورود</button></div>`,
    );
  if (s === 'verify')
    return authShell(`<div class="auth-card${S.ui.fx.auth ? ' fx-auth' : ''}"><div style="display:flex;justify-content:center"><span class="ftype" style="--c:var(--accent);width:44px;height:44px;border-radius:11px">${ic('mail', 20)}</span></div><h1>ایمیل خود را تأیید کنید</h1><p class="sub">پیوند تأیید ارسال شد به <b style="color:var(--text)">${esc(f.email)}</b>. Click it to activate your account.</p>
    <div class="panel" style="padding:12px 14px;display:flex;gap:10px;align-items:center"><span class="sk" style="width:8px;height:8px;border-radius:50%;animation-duration:1.1s"></span><span class="muted" style="font-size:13px">در انتظار تأیید…</span></div>
    <button class="btn btn-primary btn-lg btn-block" data-a="verified">I've verified my email</button>
    <button class="btn btn-secondary btn-lg btn-block" data-a="resend" data-v="verify" id="resend-btn" ${S.ui.resendT > 0 ? 'disabled' : ''}>${S.ui.resendT > 0 ? `ارسال دوباره ایمیل in <span class="num" id="resend-t">${S.ui.resendT}</span>s` : 'ارسال دوباره ایمیل'}</button>
    <p class="auth-foot">ایمیل اشتباه است؟ <button class="link" data-a="auth" data-v="signup">تغییر ایمیل</button></p></div>`);
  return '';
}

/* ---------------- ONBOARDING ---------------- */
export function renderOnboarding() {
  const st = S.ui.onb;
  const o = S.ui.onbData;
  const N = 6;
  const nav = (next = 'ادامه', skip = false) =>
    `<div class="row" style="margin-top:6px">${st > 0 && st < 5 ? `<button class="btn btn-ghost" data-a="onbBack">${ic('arrow-left', 14)}بازگشت</button>` : ''}<span class="sp"></span>${skip ? `<button class="btn btn-ghost" data-a="onbNext" data-skip="1">فعلاً رد شدن</button>` : ''}<button class="btn btn-primary btn-lg" data-a="onbNext" id="onb-next">${next}${ic('arrow-right', 15)}</button></div>`;
  const opt = (k: string, v: string, icon: string, n: string, s?: string) =>
    `<button class="opt ${o[k] === v ? 'on' : ''}" role="radio" aria-checked="${o[k] === v}" data-a="onbSet" data-k="${k}" data-v="${v}">${ic(icon, 18)}<b>${n}</b>${s ? `<span>${s}</span>` : ''}</button>`;
  let body;
  if (st === 0)
    body = `<h1>روی چه چیزی کار می‌کنید؟</h1><p class="sub">قالب‌ها و نماها را متناسب با کار شما تنظیم می‌کنیم. بعداً می‌توانید آن‌ها را تغییر دهید.</p><div class="opts" role="radiogroup">${[
      ['product', 'target', 'محصول', 'نقشه راه و عرضه‌ها'],
      ['design', 'palette', 'طراحی', 'بررسی و تحویل'],
      ['marketing', 'megaphone', 'بازاریابی', 'کمپین‌ها و محتوا'],
      ['engineering', 'code', 'مهندسی', 'اسپرینت‌ها و انتشارها'],
      ['personal', 'user', 'شخصی', 'هدف‌ها و پروژه‌های جانبی'],
      ['other', 'sparkles', 'سایر', 'موضوعی دیگر'],
    ]
      .map((x: [string, string, string, string]) => opt('use', ...x))
      .join('')}</div>${nav()}`;
  if (st === 1) {
    const e = S.ui.errors.ws;
    body = `<h1>فضای کاری خود را ایجاد کنید</h1><p class="sub">فضای کاری محل پروژه‌های تیم شماست.</p>
    <div class="field"><label class="label" for="o-ws">نام فضای کاری</label><input class="input input-lg ${e ? 'is-error' : ''}" id="o-ws" data-in="onbWs" value="${esc(o.ws)}" placeholder="مثلاً استودیوی طراحی" autofocus>${e ? `<span class="err">${ic('circle-alert', 12)}${e}</span>` : ''}</div>
    <div class="field"><label class="label" for="o-url">نشانی فضای کاری</label><div class="row" style="gap:0"><span class="input input-lg" style="width:auto;background:var(--surface-2);border-inline-end:0;border-radius:6px 0 0 6px;display:flex;align-items:center;color:var(--text-2)">gr8rstudio.com/</span><input class="input input-lg" id="o-url" value="${esc(o.url || '')}" data-in="onbUrl" style="border-radius:0 6px 6px 0" placeholder="gr8rstudio"></div>${o.url ? `<span class="hint" style="color:var(--green);display:flex;gap:4px;align-items:center">${ic('check', 12)}gr8rstudio.com/${esc(o.url)} برابر است با available</span>` : ''}</div>${nav()}`;
  }
  if (st === 2)
    body = `<h1>تیم شما چگونه کار می‌کند؟</h1><p class="sub">نمای پیش‌فرض پروژه شما را تنظیم می‌کنیم.</p><div class="opts" role="radiogroup" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[
      ['kanban', 'square-kanban', 'تابلوها', 'کارت‌ها را بین مراحل جابه‌جا کنید'],
      ['list', 'list-checks', 'فهرست‌ها', 'چک‌لیست‌ها و اولویت‌ها'],
      ['timeline', 'chart-gantt', 'خط‌های زمانی', 'برنامه‌ریزی با تاریخ و وابستگی'],
      ['table', 'table-2', 'جدول‌ها', 'پیگیری به سبک صفحه‌گسترده'],
    ]
      .map((x: [string, string, string, string]) => opt('team', ...x))
      .join('')}</div>
    <div class="field"><span class="label">اندازه تیم</span><div class="seg" style="width:fit-content">${['فقط من', '2-10', '11-50', '51-200', '200+'].map(s => `<button class="${o.size === s ? 'on' : ''}" data-a="onbSet" data-k="size" data-v="${s}">${s}</button>`).join('')}</div></div>${nav()}`;
  if (st === 3)
    body = `<h1>اولین پروژه‌تان را ایجاد کنید</h1><p class="sub">با یک قالب یا یک پروژه خالی شروع کنید.</p><div class="field"><label class="label" for="o-proj">نام پروژه</label><input class="input input-lg" id="o-proj" data-in="onbProj" value="${esc(o.proj)}" autofocus></div><div class="tmpls" role="radiogroup">${TEMPLATES.filter(
      t => t.id !== 'blank',
    )
      .map(t => opt('tmpl', t.id, t.icon, t.name, t.tasks.length + ' کار اولیه'))
      .join('')}</div>${nav()}`;
  if (st === 4)
    body = `<h1>تیم خود را دعوت کنید</h1><p class="sub">همکاران خود را دعوت کنید تا با هم کار کنید. دعوت‌نامه برایشان ایمیل می‌شود.</p><div class="col" style="gap:8px">${[0, 1, 2].map(i => `<input class="input input-lg" id="o-inv-${i}" placeholder="teammate@company.com" type="email" value="${esc((o.invites || '').split(',')[i] || '')}" data-in="onbInv" data-i="${i}" aria-label="Teammate email ${i + 1}">`).join('')}</div><button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-a="copyInviteLink">${ic('link', 13)}کپی پیوند دعوت</button>${nav('ارسال دعوت‌نامه‌ها', true)}`;
  if (st === 5) {
    const n = (o.invites || '').split(',').filter(x => x.includes('@')).length;
    body = `<div style="display:flex;justify-content:center"><span class="ftype ready-badge" style="--c:var(--green);width:48px;height:48px;border-radius:12px">${ic('circle-check', 22)}</span></div><h1>فضای کاری شما آماده است</h1><p class="sub">این موارد را برای شما آماده کرده‌ایم.</p>
    <div class="panel">${[
      ['building-2', `فضای کاری “${esc(o.ws || 'فضای کاری من')}”`, 'gr8rstudio.com/' + esc(o.url || 'workspace')],
      [
        TEMPLATES.find(t => t.id === o.tmpl)?.icon || 'folder',
        `پروژه “${esc(o.proj)}”`,
        `${TEMPLATES.find(t => t.id === o.tmpl)?.tasks.length || 0} کارهای اولیه · ${{ kanban: 'تابلو', list: 'فهرست', timeline: 'خط زمانی', table: 'جدول' }[o.team]} view`,
      ],
      [
        'user-plus',
        n ? `${n} دعوت‌نامه ارسال شد` : 'هنوز دعوت‌نامه‌ای ارسال نشده',
        n ? 'پس از پذیرش دعوت، در بخش اعضا نمایش داده می‌شوند' : 'هر زمان از نوار کناری افراد را دعوت کنید',
      ],
    ]
      .map(
        ([i, t, s]) =>
          `<div class="row ready-row" style="padding:12px 14px;border-top:1px solid var(--divider);gap:12px"><span class="ftype" style="--c:var(--accent)">${ic(i, 14)}</span><div class="grow"><div style="font-weight:500">${t}</div><div class="faint" style="font-size:12px">${s}</div></div><span class="ok" style="color:var(--green);display:inline-flex">${ic('check', 15)}</span></div>`,
      )
      .join('')}</div>
    <button class="btn btn-primary btn-lg btn-block" data-a="onbFinish">باز کردن فضای کاری${ic('arrow-right', 15)}</button>`;
  }
  return authShell(
    `<div class="auth-card onb${S.ui.fx.step ? ' fx-step' : ''}" style="max-width:${st === 5 ? 440 : 560}px">
    <div class="steps" aria-label="Step ${st + 1} of ${N}">${Array.from({ length: N }, (_, i) => `<i class="${i <= st ? 'on' : ''} ${i === st ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="faint" style="text-align:center;font-size:12px">Step ${faNumber(st + 1)} of ${faNumber(N)}</div>
    ${body}</div>`,
    `<button class="btn btn-ghost btn-sm" data-a="onbExit">خروج از راه‌اندازی</button>`,
  );
}
