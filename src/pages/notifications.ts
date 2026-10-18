/* ---------- NOTIFICATIONS ---------- */
import { ago, dayBucket, esc } from '../core/utils';
import { ic } from '../core/icons';
import { D, S, proj, task } from '../core/store';
import { empty, fmtComment } from '../ui/helpers';
import { notifIcon, notifText } from './inbox';

export function pageNotifications() {
  const f = S.ui.notifFilter;
  let ns = D()
    .notifs.slice()
    .sort((a, b) => b.at - a.at);
  const unread = ns.filter(n => !n.read).length;
  if (f === 'unread') ns = ns.filter(n => !n.read);
  const buckets: Record<string, any> = {};
  ns.forEach(n => (buckets[dayBucket(n.at)] ||= []).push(n));
  return `<div class="page" style="max-width:820px">
    <div class="ph"><div><h1 class="row" style="gap:10px">اعلان‌ها ${unread ? `<span class="badge accent">${unread} خوانده‌نشده</span>` : ''}</h1><p>به‌روزرسانی کارها و پروژه‌هایی که دنبال می‌کنید.</p></div>
      <div class="acts"><div class="seg">${[
        ['all', 'همه'],
        ['unread', 'خوانده‌نشده'],
      ]
        .map(([k, n]) => `<button class="${f === k ? 'on' : ''}" data-a="set" data-k="notifFilter" data-v="${k}">${n}</button>`)
        .join('')}</div>
      <button class="btn btn-secondary" data-a="markAllRead" ${unread ? '' : 'disabled'}>${ic('check-check', 14)}علامت‌گذاری همه به‌عنوان خوانده‌شده</button>
      <button class="ibtn" data-a="go" data-r="settings" data-sec="notif-email" data-tip="ترجیحات اعلان‌ها" aria-label="ترجیحات اعلان‌ها">${ic('settings-2', 16)}</button></div></div>
    ${
      ns.length
        ? Object.entries(buckets)
            .map(
              ([b, list]) =>
                `<div class="day-h">${b}</div><div class="panel" style="overflow:hidden">${list
                  .map(n => {
                    const t = n.task ? task(n.task) : null;
                    const p = n.project ? proj(n.project) : t ? proj(t.project) : null;
                    return `<div class="nrow ${n.read ? '' : 'unread'}" data-a="openNotif" data-id="${n.id}" role="button" tabindex="0">
        ${notifIcon(n)}<div class="grow" style="font-size:13px"><div>${notifText(n)}</div><div class="muted trunc" style="font-size:12.5px;margin-top:2px">${fmtComment(n.snippet)}</div><div class="faint" style="font-size:11.5px;margin-top:4px">${p ? esc(p.name) + ' · ' : ''}${ago(n.at)}</div></div>
        ${n.read ? '' : '<span style="width:7px;height:7px;border-radius:50%;background:var(--accent);margin-top:8px" aria-label="خوانده‌نشده"></span>'}
        <button class="ibtn ibtn-sm" data-a="toggleRead" data-id="${n.id}" data-tip="${n.read ? 'علامت‌گذاری به‌عنوان خوانده‌نشده' : 'علامت‌گذاری به‌عنوان خوانده‌شده'}" aria-label="تغییر وضعیت خوانده‌شدن">${ic(n.read ? 'mail' : 'check', 14)}</button></div>`;
                  })
                  .join('')}</div>`,
            )
            .join('')
        : `<div class="panel">${empty('bell-off', 'همه موارد را دیده‌اید.', 'اعلان خوانده‌نشده‌ای ندارید. هر زمان لازم باشد به شما اطلاع می‌دهیم.', `<button class="btn btn-secondary btn-sm" data-a="set" data-k="notifFilter" data-v="all">نمایش همه</button>`)}</div>`
    }
  </div>`;
}
