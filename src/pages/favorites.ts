import { faNumber } from '../core/locale';
/* ---------- FAVORITES ---------- */
import { allTasks, canSee, visibleProjects } from '../core/store';
import { empty } from '../ui/helpers';
import { miniRow } from '../components/task-list';
import { projectCard } from './projects';

export function pageFavorites() {
  const ps = visibleProjects().filter(p => p.fav && canSee(p));
  const ts = allTasks().filter(t => t.fav);
  return `<div class="page wide">
    <div class="ph"><div><h1>علاقه‌مندی‌ها</h1><p>پروژه‌ها و کارهایی که برای دسترسی سریع به علاقه‌مندی‌ها اضافه کرده‌اید.</p></div></div>
    ${
      !ps.length && !ts.length
        ? `<div class="panel">${empty('star', 'هنوز علاقه‌مندی‌ای ندارید', 'یک پروژه یا کار را به علاقه‌مندی‌ها اضافه کنید تا اینجا نمایش داده شود.', `<button class="btn btn-secondary btn-sm" data-a="go" data-r="projects">مشاهده پروژه‌ها</button>`)}</div>`
        : `
    <h2 class="sec" style="margin-bottom:10px">پروژه‌ها <span class="faint" style="font-weight:500">${faNumber(ps.length)}</span></h2>
    ${ps.length ? `<div class="pgrid" style="margin-bottom:28px">${ps.map(projectCard).join('')}</div>` : '<p class="faint" style="margin-bottom:28px">پروژه موردعلاقه‌ای وجود ندارد.</p>'}
    <h2 class="sec" style="margin-bottom:6px">کارها <span class="faint" style="font-weight:500">${faNumber(ts.length)}</span></h2>
    ${ts.length ? `<div class="panel" style="overflow:hidden">${ts.map(t => miniRow(t)).join('')}</div>` : '<p class="faint">یک کار را باز کنید و برای افزودن به اینجا روی ستاره کلیک کنید.</p>'}`
    }
  </div>`;
}
