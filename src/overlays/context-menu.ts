/* ---------------- CONTEXT MENUS ---------------- */
import { ic } from '../core/icons';
import { ST } from '../core/constants';
import { D, mem, proj, task, visibleProjects } from '../core/store';

export function ctxMenu(p) {
  const I = (act, icon, label, extra = '', r = '') =>
    `<button class="mi ${extra}" data-a="${act}" data-id="${p.id}" data-key="${p.key || ''}">${ic(icon, 15)}${label}${r ? `<span class="r">${r}</span>` : ''}</button>`;
  const sep = '<div class="msep"></div>';
  if (p.ctx === 'task') {
    const t = task(p.id);
    if (!t) return '';
    return (
      I('openTask', 'panel-right-open', 'باز') +
      I('editTask', 'pencil', 'ویرایش', '', 'E') +
      I('toggleDone', t.status === 'done' ? 'rotate-ccw' : 'circle-check', t.status === 'done' ? 'بازگشایی' : 'تکمیل کار') +
      sep +
      I('ctxStatus', 'circle-dot', 'وضعیت…') +
      I('ctxAssign', 'user', 'تعیین مسئول…') +
      I('ctxPrio', 'signal-high', 'اولویت…') +
      I('ctxMove', 'folder-input', 'انتقال به پروژه…') +
      sep +
      I('toggleFavTask', 'star', t.fav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها') +
      I('copyLink', 'link', 'کپی پیوند') +
      I('dupTask', 'copy', 'ساخت نسخه مشابه') +
      I('archiveTask', 'archive', 'بایگانی') +
      sep +
      I('delTask', 'trash-2', 'حذف', 'danger', 'Del')
    );
  }
  if (p.ctx === 'project') {
    const pr = proj(p.id);
    if (!pr) return '';
    return (
      I('openProject', 'arrow-up-right', 'باز') +
      I('toggleFavProj', 'star', pr.fav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها') +
      I('editProject', 'pencil', 'تغییر نام و ویرایش') +
      I('share', 'share-2', 'اشتراک‌گذاری') +
      I('copyLink', 'link', 'کپی پیوند') +
      I('dupProject', 'copy', 'ساخت نسخه مشابه') +
      sep +
      (visibleProjects().indexOf(pr) > 0 ? I('projUp', 'arrow-up', 'انتقال به بالا در نوار کناری') : '') +
      (visibleProjects().indexOf(pr) < visibleProjects().length - 1 ? I('projDown', 'arrow-down', 'انتقال به پایین در نوار کناری') : '') +
      sep +
      I('archiveProject', 'archive', pr.status === 'complete' ? 'بایگانی' : 'بایگانی پروژه') +
      I('delProject', 'trash-2', 'حذف پروژه', 'danger')
    );
  }
  if (p.ctx === 'column') {
    return (
      `<div class="mh">${ST[p.id].name}</div>` +
      I('colAdd', 'plus', 'افزودن کار') +
      I('colCollapse', 'fold-horizontal', 'جمع کردن ستون') +
      (p.id !== 'done' ? I('colDoneAll', 'check-check', 'تکمیل همه') : I('colArchive', 'archive', 'بایگانی موارد تکمیل‌شده')) +
      I('colSortPrio', 'arrow-down-wide-narrow', 'مرتب‌سازی بر اساس اولویت')
    );
  }
  if (p.ctx === 'member') {
    const m = mem(p.id);
    if (!m) return '';
    const canRm = m.role !== 'Owner' && m.id !== D().me;
    return (
      I('viewProfile', 'user', 'مشاهده پروفایل') +
      I('assignToMember', 'plus', 'تعیین مسئول یک کار') +
      I('copyEmail', 'mail', 'کپی ایمیل') +
      (canRm
        ? I('ctxRole', 'shield', 'تغییر نقش…') +
          (m.status === 'invited' ? I('resendInvite', 'send', 'ارسال دوباره دعوت‌نامه') : '') +
          sep +
          I('removeMember', 'user-minus', 'حذف از فضای کاری', 'danger')
        : '')
    );
  }
  if (p.ctx === 'file') {
    return (
      I('previewFile', 'eye', 'پیش‌نمایش') +
      I('renameFile', 'pencil', 'تغییر نام') +
      I('copyLink', 'link', 'کپی پیوند') +
      I('dupFile', 'copy', 'ساخت نسخه مشابه') +
      sep +
      I('delFile', 'trash-2', 'حذف', 'danger')
    );
  }
  if (p.ctx === 'savedview') {
    return `<button class="mi" data-a="renameView" data-id="${p.vid}">${ic('pencil', 15)}تغییر نام نما</button><button class="mi danger" data-a="delView" data-id="${p.vid}">${ic('trash-2', 15)}حذف نما</button>`;
  }
  return '';
}
