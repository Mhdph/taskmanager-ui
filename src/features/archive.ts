/* ---------- archive ---------- */
import { ago, esc } from '../core/utils';
import { ic } from '../core/icons';
import { PSTAT } from '../core/constants';
import { D, S, canSee, proj } from '../core/store';
import { empty, pIcon, stIcon } from '../ui/helpers';

export function pageArchive() {
  const tab = S.ui.archTab || 'tasks';
  const ts = D()
    .tasks.filter(t => t.archived && canSee(proj(t.project)) && !proj(t.project)?.archived)
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
  const ps = D().projects.filter(p => p.archived);
  const row = (lead, title, sub, when, restoreAct, delAct, id) =>
    `<div class="mini" style="min-height:52px;cursor:default;gap:12px">${lead}<div class="grow" style="min-width:0"><div class="trunc" style="font-weight:500">${title}</div><div class="faint trunc" style="font-size:12px">${sub}</div></div><span class="faint hide-m" style="font-size:12px;white-space:nowrap">${when}</span><button class="btn btn-secondary btn-sm" data-a="${restoreAct}" data-id="${id}">${ic('rotate-ccw', 13)}بازیابی</button><button class="ibtn ibtn-sm" data-a="${delAct}" data-id="${id}" data-tip="حذف دائمی" aria-label="حذف دائمی" style="color:var(--red)">${ic('trash-2', 15)}</button></div>`;
  const body =
    tab === 'tasks'
      ? ts.length
        ? `<div class="panel" style="overflow:hidden">${ts
            .map(t => {
              const p = proj(t.project);
              return row(
                stIcon(t.status, 15),
                esc(t.title),
                `<span class="mono">${t.key}</span> · ${esc(p.name)}`,
                t.archivedAt ? 'بایگانی شد ' + ago(t.archivedAt) : 'بایگانی شد',
                'restoreTask',
                'purgeTask',
                t.id,
              );
            })
            .join('')}</div>`
        : `<div class="panel">${empty('archive', 'کار بایگانی‌شده‌ای وجود ندارد', 'کارهای تمام‌شده یا کنارگذاشته‌شده را بایگانی کنید تا تابلوها مرتب بمانند. تا زمان بازیابی در اینجا می‌مانند.', '')}</div>`
      : ps.length
        ? `<div class="panel" style="overflow:hidden">${ps.map(p => row(pIcon(p, '', 14), esc(p.name), `${D().tasks.filter(t => t.project === p.id).length} کار · ${PSTAT[p.status].name}`, p.archivedAt ? 'بایگانی شد ' + ago(p.archivedAt) : 'بایگانی شد', 'restoreProject', 'delProject', p.id)).join('')}</div>`
        : `<div class="panel">${empty('archive', 'پروژه بایگانی‌شده‌ای وجود ندارد', 'پروژه‌های بایگانی‌شده از فهرست‌ها پنهان می‌شوند، اما کارها، فایل‌ها و دیدگاه‌هایشان محفوظ‌اند.', '')}</div>`;
  return `<div class="page" style="max-width:900px">
    <div class="ph"><div><h1>بایگانی</h1><p>موارد بایگانی‌شده در سایر بخش‌ها پنهان‌اند. هر زمان می‌توانید آن‌ها را بازیابی یا برای همیشه حذف کنید.</p></div></div>
    <div class="tabs" style="margin-bottom:14px" role="tablist" aria-label="بایگانی">${[
      ['tasks', 'کارها', ts.length],
      ['projects', 'پروژه‌ها', ps.length],
    ]
      .map(
        ([k, n, c]) =>
          `<button role="tab" aria-selected="${tab === k}" class="tab ${tab === k ? 'on' : ''}" data-a="set" data-k="archTab" data-v="${k}">${n}<span class="cnt">${c}</span></button>`,
      )
      .join('')}</div>
    ${body}
  </div>`;
}
