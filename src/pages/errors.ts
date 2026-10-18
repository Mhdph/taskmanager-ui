/* ---------- 404 / DENIED / FAILED ---------- */
import { esc } from '../core/utils';
import { ic } from '../core/icons';
import { mem } from '../core/store';

export function page404() {
  return `<div class="fullstate"><div class="box"><div class="empty-state" style="padding:0"><div class="glyph">${ic('file-question', 20)}</div></div><span class="code">ERROR 404</span><h1>صفحه پیدا نشد</h1><p>صفحه موردنظر جابه‌جا یا حذف شده است، یا وجود ندارد. پیوند را بررسی کنید یا به خانه برگردید.</p><div class="row"><button class="btn btn-secondary" data-a="back">${ic('arrow-left', 14)}بازگشت</button><button class="btn btn-primary" data-a="go" data-r="home">رفتن به خانه</button></div></div></div>`;
}
export function stateDenied(p) {
  const lead = mem(p?.lead);
  return `<div class="fullstate"><div class="box"><div class="empty-state" style="padding:0"><div class="glyph">${ic('lock', 20)}</div></div><span class="code">ERROR 403</span><h1>دسترسی ندارید</h1><p>${p ? `<b>${esc(p.name)}</b> یک پروژه خصوصی است. ` : ''}درخواست از ${lead ? esc(lead.name) : 'مالک پروژه'} to add you, or request access and we'll let them know.</p><div class="row"><button class="btn btn-secondary" data-a="go" data-r="projects">بازگشت به پروژه‌ها</button><button class="btn btn-primary" data-a="requestAccess" data-id="${p?.id || ''}">درخواست دسترسی</button></div></div></div>`;
}
export function stateFailed() {
  return `<div class="fullstate"><div class="box"><div class="empty-state err" style="padding:0"><div class="glyph">${ic('cloud-alert', 20)}</div></div><h1>مشکلی پیش آمد.</h1><p>صفحه بارگذاری نشد. داده‌ها محفوظ‌اند؛ کمی بعد دوباره تلاش کنید.</p><div class="row"><button class="btn btn-secondary" data-a="go" data-r="home">رفتن به خانه</button><button class="btn btn-primary" data-a="reload">${ic('refresh-cw', 14)}تلاش دوباره</button></div></div></div>`;
}
