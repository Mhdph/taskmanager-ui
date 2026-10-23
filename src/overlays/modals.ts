import { displayLabel } from '../core/locale';
/* ---------------- MODALS ---------------- */
import { $$, MOD, ago, esc, fmtDate } from '../core/utils';
import { ic } from '../core/icons';
import { PCOLORS, PICONS } from '../core/constants';
import { D, S, mem, pColor, proj, task, teamsList } from '../core/store';
import { FT, av, filePrev, lbl, prPill, stPill } from '../ui/helpers';
import { focusKey, render } from '../shell/render';
import { teamModal } from '../features/teams';

export function openModal(m) {
  S.ui.modalOpeners = S.ui.modalOpeners || [];
  S.ui.modalOpeners[S.ui.modals.length] = S.ui.popOpener && S.ui.pop ? S.ui.popOpener : focusKey(document.activeElement);
  S.ui.modals.push(m);
  S.ui.pop = null;
  render();
  setTimeout(() => {
    const all = $$('.modal');
    const last = all[all.length - 1];
    const af = last?.querySelector('[autofocus]');
    ((af || last?.querySelector('input,textarea,button')) as HTMLElement | null)?.focus();
  }, 30);
}
export function closeModal() {
  S.ui.modals.pop();
  S.ui.pop = null;
  render();
}
export function modalHtml(m) {
  const H = (title, sub = '') =>
    `<div class="modal-h"><div><h2 id="mt-${m.type}">${title}</h2>${sub ? `<div class="muted" style="font-size:12.5px;margin-top:2px">${sub}</div>` : ''}</div><button class="ibtn ibtn-sm" data-a="closeModal" aria-label="بستن">${ic('x', 16)}</button></div>`;
  const wrap = (cls, inner) => `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="mt-${m.type}">${inner}</div>`;
  switch (m.type) {
    case 'task':
      return wrap('', taskModal(m, H));
    case 'project':
      return wrap('', projectModal(m, H));
    case 'share':
      return wrap('', shareModal(m, H));
    case 'invite':
      return wrap('', inviteModal(m, H));
    case 'confirm':
      return wrap('sm', confirmModal(m));
    case 'prompt':
      return wrap(
        'sm',
        `${H(m.title)}<form class="modal-b" data-submit="promptSubmit"><div class="field"><label class="label" for="prompt-in">${esc(m.label)}</label><input class="input" id="prompt-in" value="${esc(m.value || '')}" autofocus></div></form><div class="modal-f"><span class="sp"></span><button class="btn btn-secondary" data-a="closeModal">انصراف</button><button class="btn btn-primary" data-a="promptSubmit">${esc(m.ok || 'ذخیره')}</button></div>`,
      );
    case 'shortcuts':
      return wrap('lg', shortcutsModal(H));
    case 'team':
      return wrap('', teamModal(m, H));
    case 'filePreview':
      return wrap('lg', filePreviewModal(m, H));
    case 'saveView':
      return wrap(
        'sm',
        `${H('ذخیره نما', 'فیلترهای فعلی را به‌عنوان یک زبانه در این پروژه ذخیره کنید.')}<form class="modal-b" data-submit="saveViewSubmit"><div class="field"><label class="label" for="sv-name">نام نما</label><input class="input" id="sv-name" placeholder="مثلاً صف بررسی طراحی" autofocus></div><div class="field"><label class="label" for="sv-type">چیدمان</label><select class="select" id="sv-type"><option value="list">فهرست</option><option value="board">تابلو</option><option value="table">جدول</option></select></div>${m.nf ? `<div class="hint">${m.nf} فیلتر با این نما ذخیره می‌شود.</div>` : '<div class="alert info">' + ic('info', 14) + '<span>فیلتری فعال نیست؛ همه کارها نمایش داده می‌شوند. پس از ذخیره می‌توانید فیلتر اضافه کنید.</span></div>'}</form><div class="modal-f"><span class="sp"></span><button class="btn btn-secondary" data-a="closeModal">انصراف</button><button class="btn btn-primary" data-a="saveViewSubmit">ذخیره نما</button></div>`,
      );
  }
  return '';
}
export function formChip(pop, html, label) {
  return `<button class="pillbtn bordered" data-a="pop" data-pop="${pop}" data-id="__form" ${pop === 'date' ? `data-field="${label}"` : ''} aria-label="${esc(displayLabel(label))}">${html}</button>`;
}
export function taskModal(m, H) {
  const f = S.ui.form;
  const p = proj(f.project);
  const err = S.ui.errors.title;
  return `${H(m.edit ? 'ویرایش کار' : 'کار جدید', m.edit ? `<span class="mono">${task(m.edit)?.key}</span>` : '')}
  <form class="modal-b" data-submit="submitTask" style="gap:12px">
    <div class="field"><label class="sr" for="f-title">نام کار</label><input class="input input-lg ${err ? 'is-error' : ''}" id="f-title" data-in="form" data-f="title" value="${esc(f.title)}" placeholder="نام کار" autofocus aria-invalid="${!!err}" aria-describedby="f-title-err" style="font-size:15px;font-weight:500">${err ? `<span class="err" id="f-title-err">${ic('circle-alert', 12)}${esc(err)}</span>` : ''}</div>
    <div class="field"><label class="sr" for="f-desc">توضیحات</label><textarea class="textarea" id="f-desc" data-in="form" data-f="desc" placeholder="توضیحی اضافه کنید… (اختیاری)" rows="3">${esc(f.desc)}</textarea></div>
    <div class="row" style="flex-wrap:wrap;gap:6px">
      ${formChip('project', `<span class="pdot" style="--c:${pColor(p)}"></span>${esc(p?.name || 'پروژه')}`, 'پروژه')}
      ${formChip('status', stPill(f.status), 'وضعیت')}
      ${formChip('assignee', `${av(f.assignee, 'sm', false)}${esc(mem(f.assignee)?.name || 'مسئول')}`, 'مسئول')}
      ${formChip('priority', prPill(f.priority), 'اولویت')}
      ${formChip('date', `${ic('calendar', 13)}${f.due ? 'مهلت ' + fmtDate(f.due) : 'مهلت انجام'}`, 'due')}
      ${formChip('date', `${ic('calendar-arrow-up', 13)}${f.start ? 'شروع ' + fmtDate(f.start) : 'تاریخ شروع'}`, 'start')}
      ${formChip('labels', f.labels.length ? f.labels.map(lbl).join('') : `${ic('tag', 13)}برچسب‌ها`, 'برچسب‌ها')}
      ${formChip('recur', `${ic('repeat', 13)}${displayLabel(f.recur) || 'تکرار'}`, 'تکرار')}
    </div>
    <div class="field"><span class="label">زیرکارها</span>
      ${f.subtasks.map((s, i) => `<div class="subt" style="padding:0 4px">${ic('circle', 13)}<span class="s">${esc(s.title)}</span><button type="button" class="ibtn ibtn-xs x" style="opacity:1" data-a="formRmSub" data-i="${i}" aria-label="حذف">${ic('x', 12)}</button></div>`).join('')}
      <div class="inwrap">${ic('plus', 14)}<input class="input" id="f-sub" data-key-enter="formAddSub" placeholder="یک زیرکار بنویسید و Enter بزنید"></div></div>
    <div class="field"><span class="label">پیوست‌ها</span>
      ${f.files.length ? `<div class="col" style="gap:4px">${f.files.map((x, i) => `<div class="upl" style="padding:6px 10px"><span class="ftype" style="--c:${FT[x.type].c};width:22px;height:22px">${ic(FT[x.type].i, 12)}</span><span class="grow trunc">${esc(x.name)}</span><span class="faint" style="font-size:11.5px">${x.size}</span><button type="button" class="ibtn ibtn-xs" data-a="formRmFile" data-i="${i}" aria-label="حذف">${ic('x', 12)}</button></div>`).join('')}</div>` : ''}
      <label class="dropzone" style="padding:10px">${ic('paperclip', 14)}<span>پیوست فایل‌ها</span><input type="file" multiple hidden data-in="formFiles"></label></div>
  </form>
  <div class="modal-f">${m.edit ? '' : `<label class="row" style="gap:8px;font-size:12.5px;color:var(--text-2);cursor:pointer"><input type="checkbox" class="toggle" id="f-more" data-in="formMore" ${f.more ? 'checked' : ''}>ایجاد موارد بیشتر</label>`}<span class="sp"></span>
    <span class="faint hide-m" style="font-size:11.5px"><kbd>${MOD}</kbd> <kbd>↵</kbd></span>
    <button class="btn btn-secondary" data-a="closeModal">انصراف</button><button class="btn btn-primary" data-a="submitTask" id="f-submit">${m.edit ? 'ذخیره تغییرات' : 'ایجاد کار'}</button></div>`;
}
export const TEMPLATES = [
  { id: 'blank', name: 'پروژه خالی', icon: 'file', desc: 'شروع از صفر', tasks: [] },
  {
    id: 'product',
    name: 'توسعه محصول',
    icon: 'target',
    desc: 'از بررسی تا عرضه',
    tasks: ['تعریف مسئله', 'برنامه پژوهش کاربران', 'نوشتن سند نیازمندی محصول', 'بررسی گزینه‌های طراحی', 'ساخت محصول اولیه', 'عرضه آزمایشی'],
  },
  {
    id: 'web',
    name: 'وب‌سایت',
    icon: 'globe',
    desc: 'IA, design, build, launch',
    tasks: ['نقشه سایت و معماری اطلاعات', 'وایرفریم‌ها', 'طراحی بصری', 'ساخت قالب‌های صفحه', 'انتقال محتوا', 'QA & launch'],
  },
  {
    id: 'mkt',
    name: 'کمپین بازاریابی',
    icon: 'megaphone',
    desc: 'شرح، فایل‌ها و کانال‌ها',
    tasks: ['شرح کمپین', 'پژوهش مخاطبان', 'فایل‌های خلاقه', 'برنامه کانال‌ها', 'کمپین عرضه', 'گزارش عملکرد'],
  },
  {
    id: 'design',
    name: 'پروژه طراحی',
    icon: 'palette',
    desc: 'از بررسی تا تحویل',
    tasks: ['کارگاه شناخت', 'تابلوی الهام', 'مسیرهای مفهومی', 'بهبود جزئیات', 'تحویل به توسعه‌دهنده'],
  },
  {
    id: 'software',
    name: 'توسعه نرم‌افزار',
    icon: 'code',
    desc: 'تعریف، ساخت، انتشار',
    tasks: ['مشخصات فنی', 'راه‌اندازی مخزن و CI', 'پیاده‌سازی API اصلی', 'نوشتن تست‌ها', 'بررسی کد', 'استقرار در محیط آزمایشی'],
  },
  {
    id: 'personal',
    name: 'پروژه شخصی',
    icon: 'heart',
    desc: 'هدف‌های خود را برنامه‌ریزی کنید',
    tasks: ['ثبت ایده‌ها', 'انتخاب ۳ اولویت اصلی', 'برنامه‌ریزی زمان تمرکز', 'مرور هفتگی'],
  },
];
export function projectModal(m, H) {
  const f = S.ui.pform;
  const err = S.ui.errors.pname;
  return `${H(m.edit ? 'تنظیمات پروژه' : 'پروژه جدید', m.edit ? '' : 'پروژه‌ها کارها، فایل‌ها و گفتگوهای مرتبط را کنار هم نگه می‌دارند.')}
  <form class="modal-b" data-submit="submitProject">
    <div class="row" style="gap:10px;align-items:flex-start">
      <button type="button" class="picon lg" style="--c:${PCOLORS[f.color]};cursor:default;flex-shrink:0;margin-top:22px" aria-hidden="true" tabindex="-1">${ic(f.icon, 18)}</button>
      <div class="field grow"><label class="label" for="p-name">نام پروژه</label><input class="input ${err ? 'is-error' : ''}" id="p-name" data-in="pform" data-f="name" value="${esc(f.name)}" placeholder="e.g. بازطراحی وب‌سایت" autofocus aria-invalid="${!!err}">${err ? `<span class="err">${ic('circle-alert', 12)}${esc(err)}</span>` : ''}</div>
    </div>
    <div class="field"><label class="label" for="p-desc">توضیحات</label><textarea class="textarea" id="p-desc" data-in="pform" data-f="desc" rows="2" placeholder="موضوع این پروژه چیست؟">${esc(f.desc)}</textarea></div>
    <div class="row" style="gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div class="field" style="flex:1;min-width:220px"><span class="label">آیکن</span><div class="iconpick" role="radiogroup" aria-label="آیکن">${PICONS.map(i => `<button type="button" role="radio" aria-checked="${f.icon === i}" class="${f.icon === i ? 'on' : ''}" data-a="pformSet" data-f="icon" data-v="${i}" aria-label="${i}">${ic(i, 15)}</button>`).join('')}</div></div>
      <div class="field"><span class="label">رنگ</span><div class="swatches" role="radiogroup" aria-label="رنگ" style="max-width:140px">${Object.entries(
        PCOLORS,
      )
        .map(
          ([k, v]) =>
            `<button type="button" role="radio" aria-checked="${f.color === k}" class="sw ${f.color === k ? 'on' : ''}" style="--c:${v};width:22px;height:22px" data-a="pformSet" data-f="color" data-v="${k}" aria-label="${k}">${f.color === k ? ic('check', 12) : ''}</button>`,
        )
        .join('')}</div></div>
    </div>
    <div class="row" style="gap:12px;flex-wrap:wrap">
      <div class="field" style="flex:1;min-width:150px"><label class="label" for="p-team">تیم</label><select class="select" id="p-team" data-in="pform" data-f="team">${teamsList()
        .map(t => `<option value="${t.id}" ${f.team === t.id ? 'selected' : ''}>${esc(t.name)}</option>`)
        .join('')}</select></div>
      <div class="field" style="flex:1;min-width:150px"><label class="label" for="p-lead">سرپرست</label><select class="select" id="p-lead" data-in="pform" data-f="lead">${D()
        .members.filter(x => x.status === 'active')
        .map(x => `<option value="${x.id}" ${f.lead === x.id ? 'selected' : ''}>${esc(x.name)}</option>`)
        .join('')}</select></div>
      <div class="field" style="flex:1;min-width:150px"><label class="label" for="p-due">تاریخ هدف</label><input type="date" class="input" id="p-due" data-in="pform" data-f="due" value="${f.due || ''}"></div>
    </div>
    ${m.edit ? '' : `<div class="field"><span class="label">قالب</span><div class="tmpls" role="radiogroup">${TEMPLATES.map(t => `<button type="button" role="radio" aria-checked="${f.tmpl === t.id}" class="opt ${f.tmpl === t.id ? 'on' : ''}" data-a="pformSet" data-f="tmpl" data-v="${t.id}" style="padding:10px">${ic(t.icon, 16)}<b style="font-size:12.5px">${t.name}</b><span>${t.tasks.length ? t.tasks.length + ' کار اولیه' : t.desc}</span></button>`).join('')}</div></div>`}
  </form>
  <div class="modal-f"><span class="sp"></span><button class="btn btn-secondary" data-a="closeModal">انصراف</button><button class="btn btn-primary" data-a="submitProject">${m.edit ? 'ذخیره تغییرات' : 'ایجاد پروژه'}</button></div>`;
}
export const PERMS = ['Can view', 'Can comment', 'Can edit', 'Full access'];
export function shareModal(m, H) {
  const p = proj(m.id);
  p.perms = p.perms || {};
  p.access = p.access || 'workspace';
  return `${H(`اشتراک‌گذاری “${esc(p.name)}”`)}
  <div class="modal-b">
    <form class="row" style="gap:6px" data-submit="shareInvite"><div class="grow"><label class="sr" for="share-in">دعوت با ایمیل</label><input class="input" id="share-in" placeholder="افزودن افراد با نام یا ایمیل" value="${esc(S.ui.shareQ || '')}" data-in="shareQ" autofocus></div>
      <select class="select" id="share-perm" style="width:132px" aria-label="دسترسی">${PERMS.map(x => `<option value="${x}" ${x === 'Can edit' ? 'selected' : ''}>${displayLabel(x)}</option>`).join('')}</select>
      <button class="btn btn-primary" data-a="shareInvite" type="button">دعوت</button></form>
    ${
      S.ui.shareQ
        ? `<div class="panel" style="padding:4px">${
            D()
              .members.filter(
                x => !p.members.includes(x.id) && (x.name.toLowerCase().includes(S.ui.shareQ.toLowerCase()) || x.email.includes(S.ui.shareQ.toLowerCase())),
              )
              .map(
                x =>
                  `<button class="mi" data-a="shareAdd" data-id="${p.id}" data-mid="${x.id}">${av(x.id, 'sm', false)}${esc(x.name)}<span class="r">${esc(x.email)}</span></button>`,
              )
              .join('') ||
            `<div class="mi faint" style="cursor:default">${S.ui.shareQ.includes('@') ? `برای ارسال دعوت‌نامه، دکمه دعوت را بزنید: ${esc(S.ui.shareQ)}` : 'عضوی پیدا نشد؛ برای دعوت فرد جدید ایمیل او را وارد کنید'}</div>`
          }</div>`
        : ''
    }
    <div><div class="eyebrow" style="margin-bottom:4px">افراد دارای دسترسی</div>
      ${p.members
        .map(id => {
          const x = mem(id);
          if (!x) return '';
          const perm = id === p.lead ? 'Full access' : p.perms[id] || (x.role === 'Guest' ? 'Can comment' : 'Can edit');
          return `<div class="row" style="height:44px">${av(id, 'md', false)}<div class="grow"><div style="font-weight:500;font-size:13px">${esc(x.name)}${id === D().me ? ' <span class="faint" style="font-weight:400">(شما)</span>' : ''}</div><div class="faint" style="font-size:11.5px">${esc(x.email)}${id === p.lead ? ' · سرپرست پروژه' : ''}</div></div>
          ${id === p.lead ? `<span class="muted" style="font-size:12.5px;padding-inline-end:8px">دسترسی کامل</span>` : `<select class="select" style="width:auto;height:26px;font-size:12px;border-color:transparent;background-color:transparent" data-in="sharePerm" data-id="${p.id}" data-mid="${id}" aria-label="دسترسی برای ${esc(x.name)}">${PERMS.map(q => `<option value="${q}" ${q === perm ? 'selected' : ''}>${displayLabel(q)}</option>`).join('')}<option value="__remove">لغو دسترسی</option></select>`}</div>`;
        })
        .join('')}
    </div>
    <div style="border-top:1px solid var(--divider);padding-top:12px"><div class="eyebrow" style="margin-bottom:8px">دسترسی عمومی</div>
      <div class="row" style="gap:10px"><span class="ftype" style="--c:var(--text-2)">${ic(p.access === 'private' ? 'lock' : 'building-2', 14)}</span><div class="grow"><select class="select" style="height:28px;width:auto;border-color:transparent;padding-inline-start:4px;font-weight:500" data-in="shareAccess" data-id="${p.id}" aria-label="دسترسی عمومی"><option value="private" ${p.access === 'private' ? 'selected' : ''}>فقط افراد دعوت‌شده</option><option value="workspace" ${p.access === 'workspace' ? 'selected' : ''}>همه اعضای ${esc(D().ws.name)}</option></select><div class="faint" style="font-size:11.5px;padding-inline-start:4px">${p.access === 'private' ? 'فقط افراد فهرست بالا می‌توانند این پروژه را باز کنند.' : 'همه اعضای فضای کاری می‌توانند مشاهده کنند و دیدگاه بنویسند.'}</div></div></div></div>
  </div>
  <div class="modal-f"><button class="btn btn-secondary" data-a="copyLink" data-pid="${p.id}">${ic('link', 14)}کپی پیوند</button><span class="sp"></span><button class="btn btn-primary" data-a="closeModal">انجام‌شده</button></div>`;
}
export function inviteModal(m, H) {
  const err = S.ui.errors.invite;
  return `${H('دعوت به ' + esc(D().ws.name), 'برای افراد دعوت‌شده، ایمیلی با پیوند عضویت ارسال می‌شود.')}
  <form class="modal-b" data-submit="submitInvite">
    <div class="field"><label class="label" for="inv-emails">نشانی‌های ایمیل</label><textarea class="textarea ${err ? 'is-error' : ''}" id="inv-emails" placeholder="name@company.com, another@company.com" rows="3" autofocus>${esc(S.ui.inviteDraft || '')}</textarea>${err ? `<span class="err">${ic('circle-alert', 12)}${esc(err)}</span>` : '<span class="hint">نشانی‌های متعدد را با ویرگول جدا کنید.</span>'}</div>
    <div class="row" style="gap:12px"><div class="field grow"><label class="label" for="inv-role">نقش</label><select class="select" id="inv-role">${['Member', 'Admin', 'Guest'].map(r => `<option value="${r}">${displayLabel(r)}</option>`).join('')}</select></div>
    <div class="field grow"><label class="label" for="inv-team">تیم</label><select class="select" id="inv-team">${teamsList()
      .map(t => `<option value="${t.id}">${esc(t.name)}</option>`)
      .join('')}</select></div></div>
    <div class="alert info">${ic('info', 14)}<span><b>Guests</b> فقط پروژه‌هایی را می‌بینند که به آن‌ها اضافه شده‌اند و نمی‌توانند پروژه بسازند.</span></div>
  </form>
  <div class="modal-f"><button class="btn btn-ghost" data-a="copyInviteLink">${ic('link', 14)}کپی پیوند دعوت</button><span class="sp"></span><button class="btn btn-secondary" data-a="closeModal">انصراف</button><button class="btn btn-primary" data-a="submitInvite" id="inv-submit">ارسال دعوت‌نامه‌ها</button></div>`;
}
export function confirmModal(m) {
  const needs = m.typeName;
  const ok = !needs || (S.ui.confirmText || '') === needs;
  return `<div class="modal-b" style="padding-top:18px;gap:10px">
    <div class="row" style="gap:12px;align-items:flex-start"><span class="ftype" style="--c:${m.danger ? 'var(--red)' : 'var(--amber)'};width:34px;height:34px;border-radius:9px">${ic(m.icon || (m.danger ? 'trash-2' : 'archive'), 17)}</span>
    <div class="grow"><h2 id="mt-confirm" style="font-size:15px;font-weight:600;margin:4px 0 6px">${esc(m.title)}</h2><p class="muted" style="margin:0;font-size:13px;line-height:1.55">${m.body}</p></div></div>
    ${needs ? `<div class="field" style="margin-top:6px"><label class="label" for="confirm-in" style="font-weight:400;color:var(--text-2)">نوع <b style="color:var(--text);font-weight:600">${esc(needs)}</b> برای تأیید</label><input class="input" id="confirm-in" data-in="confirmText" autocomplete="off" autofocus value="${esc(S.ui.confirmText || '')}"></div>` : ''}
  </div>
  <div class="modal-f"><span class="sp"></span><button class="btn btn-secondary" data-a="closeModal" ${needs ? '' : 'autofocus'}>انصراف</button><button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" data-a="confirmOk" ${ok ? '' : 'disabled'}>${esc(m.ok)}</button></div>`;
}
export const SHORTCUTS: Array<[string, Array<[string, string[]]>]> = [
  [
    'عمومی',
    [
      ['فهرست فرمان‌ها', [MOD, 'K']],
      ['جستجو', ['/']],
      ['میانبرهای صفحه‌کلید', ['?']],
      ['تغییر نمایش نوار کناری', ['[']],
      ['تغییر حالت تیره', [MOD, 'Shift', 'L']],
      ['بستن پنل یا پنجره', ['Esc']],
    ],
  ],
  [
    'ایجاد',
    [
      ['کار جدید', ['N']],
      ['پروژه جدید', ['P']],
      ['ارسال فرم', [MOD, '↵']],
      ['ارسال دیدگاه', [MOD, '↵']],
    ],
  ],
  [
    'جابه‌جایی',
    [
      ['رفتن به خانه', ['G', 'H']],
      ['رفتن به کارهای من', ['G', 'T']],
      ['رفتن به پروژه‌ها', ['G', 'P']],
      ['رفتن به صندوق ورودی', ['G', 'I']],
      ['رفتن به تقویم', ['G', 'C']],
      ['رفتن به تنظیمات', ['G', 'S']],
    ],
  ],
  [
    'فهرست فرمان‌ها',
    [
      ['جابه‌جایی انتخاب', ['↑', '↓']],
      ['اجرای فرمان', ['↵']],
      ['حالت جستجو', ['Tab']],
    ],
  ],
];
export function shortcutsModal(H) {
  return `${H('میانبرهای صفحه‌کلید')}<div class="modal-b" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px">${SHORTCUTS.map(([g, list]) => `<div><div class="eyebrow" style="margin-bottom:6px">${g}</div>${list.map(([n, k]) => `<div class="row" style="height:30px;font-size:13px;border-bottom:1px solid var(--divider)"><span class="grow">${n}</span>${k.map((x, i) => `${i && k[0] === 'G' ? '<span class="faint" style="font-size:11px">then</span>' : ''}<kbd>${x}</kbd>`).join('')}</div>`).join('')}</div>`).join('')}</div>`;
}
export function filePreviewModal(m, H) {
  const f = m.file;
  const t = FT[f.type] || FT.other;
  return `${H(esc(f.name), `${t.n} · ${f.size} · بارگذاری‌شده توسط ${esc(mem(f.by)?.name || 'you')} ${ago(f.at)}`)}
  <div class="modal-b"><div style="border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden">${filePrev(f).replace('class="fprev"', 'class="fprev" style="aspect-ratio:16/9"')}</div>
  ${m.tid ? `<div class="row faint" style="font-size:12.5px">${ic('link', 13)}پیوست‌شده به <button class="link" data-a="openTask" data-id="${m.tid}">${esc(task(m.tid)?.title)}</button></div>` : ''}</div>
  <div class="modal-f"><button class="btn btn-secondary" data-a="copyLink" data-fid="${f.id}">${ic('link', 14)}کپی پیوند</button><span class="sp"></span><button class="btn btn-primary" data-a="closeModal">بستن</button></div>`;
}
