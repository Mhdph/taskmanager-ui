import { faNumber } from '../core/locale';
/* ---------- SEARCH RESULTS ---------- */
import { ago, esc } from '../core/utils';
import { ic } from '../core/icons';
import { D, S, allTasks, canSee, mem, pColor, proj, task, visibleProjects } from '../core/store';
import { FT, av, empty, hl, pIcon, pStatus, stIcon } from '../ui/helpers';

export function searchAll(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return { tasks: [], projects: [], people: [], files: [], comments: [] };
  const has = s => (s || '').toLowerCase().includes(q);
  return {
    tasks: allTasks()
      .filter(t => has(t.title) || has(t.key) || has(t.desc.replace(/<[^>]+>/g, '')))
      .slice(0, 30),
    projects: visibleProjects().filter(p => has(p.name) || has(p.desc)),
    people: D().members.filter(m => has(m.name) || has(m.email) || has(m.title)),
    files: D().files.filter(f => has(f.name) && canSee(proj(f.project))),
    comments: D().comments.filter(c => has(c.text) && task(c.task) && canSee(proj(task(c.task).project))),
  };
}
export function pageSearch() {
  const q = S.ui.searchQ;
  const r = searchAll(q);
  const cat = S.ui.searchCat;
  const cats = [
    ['all', 'همه'],
    ['tasks', 'کارها'],
    ['projects', 'پروژه‌ها'],
    ['people', 'افراد'],
    ['files', 'فایل‌ها'],
    ['comments', 'دیدگاه‌ها'],
  ];
  const total = Object.values(r).reduce((a, b) => a + b.length, 0);
  const sec = (k, title, html) =>
    (cat === 'all' || cat === k) && r[k].length
      ? `<section style="margin-bottom:22px"><div class="eyebrow" style="margin-bottom:6px">${title} · ${faNumber(r[k].length)}</div><div class="panel" style="overflow:hidden">${html}</div></section>`
      : '';
  return `<div class="page" style="max-width:860px">
    <div class="inwrap" style="margin-bottom:14px">${ic('search', 16)}<input class="input input-lg" id="search-page-q" data-in="searchQ" placeholder="جستجوی کارها، پروژه‌ها، افراد، فایل‌ها و دیدگاه‌ها" value="${esc(q)}" style="padding-inline-start:34px;font-size:15px" aria-label="جستجو"></div>
    <div class="tabs" style="margin-bottom:18px">${cats.map(([k, n]) => `<button class="tab ${cat === k ? 'on' : ''}" data-a="set" data-k="searchCat" data-v="${k}">${n}<span class="cnt">${faNumber(k === 'all' ? total : r[k].length)}</span></button>`).join('')}</div>
    ${
      !q
        ? `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="faint" style="font-size:12.5px">اخیر:</span>${D()
            .recentSearches.map(s => `<button class="badge" data-a="setSearch" data-q="${esc(s)}">${ic('history', 11)}${esc(s)}</button>`)
            .join('')}</div>`
        : total
          ? sec(
              'tasks',
              'کارها',
              r.tasks
                .map(
                  t =>
                    `<div class="mini" data-a="openTask" data-id="${t.id}">${stIcon(t.status)}<span class="mono faint" style="font-size:11px">${t.key}</span><span class="tt">${hl(t.title, q)}</span><span class="pj"><span class="pdot" style="--c:${pColor(proj(t.project))}"></span>${esc(proj(t.project).name)}</span>${av(t.assignee, 'sm')}</div>`,
                )
                .join(''),
            ) +
            sec(
              'projects',
              'پروژه‌ها',
              r.projects
                .map(
                  p =>
                    `<div class="mini" data-a="go" data-r="project" data-id="${p.id}">${pIcon(p, '', 13)}<span class="tt">${hl(p.name, q)} <span class="faint" style="font-size:12px">— ${esc(p.desc.slice(0, 70))}…</span></span>${pStatus(p.status)}</div>`,
                )
                .join(''),
            ) +
            sec(
              'people',
              'افراد',
              r.people
                .map(
                  m =>
                    `<div class="mini" data-a="go" data-r="member" data-id="${m.id}">${av(m.id, 'md', false)}<span class="tt">${hl(m.name, q)} <span class="faint" style="font-size:12px">${esc(m.title)}</span></span><span class="faint" style="font-size:12px">${esc(m.email)}</span></div>`,
                )
                .join(''),
            ) +
            sec(
              'files',
              'فایل‌ها',
              r.files
                .map(
                  f =>
                    `<div class="mini" data-a="go" data-r="project" data-id="${f.project}" data-tab="files"><span class="ftype" style="--c:${FT[f.type].c}">${ic(FT[f.type].i, 14)}</span><span class="tt">${hl(f.name, q)}</span><span class="faint" style="font-size:12px">${f.size} · ${esc(proj(f.project).name)}</span></div>`,
                )
                .join(''),
            ) +
            sec(
              'comments',
              'دیدگاه‌ها',
              r.comments
                .map(
                  c =>
                    `<div class="mini" style="align-items:flex-start;padding-top:10px;padding-bottom:10px" data-a="openTask" data-id="${c.task}">${av(c.by, 'sm')}<div class="grow" style="min-width:0"><div style="font-size:12px" class="muted"><b style="color:var(--text);font-weight:500">${esc(mem(c.by).name)}</b> on ${esc(task(c.task).title)} · ${ago(c.at)}</div><div style="font-size:13px">${hl(c.text, q)}</div></div></div>`,
                )
                .join(''),
            )
          : `<div class="panel">${empty('search-x', 'نتیجه‌ای پیدا نشد', `نتیجه‌ای پیدا نشد برای «${q}». املا را بررسی کنید یا عبارت کلی‌تری بنویسید.`, `<button class="btn btn-secondary btn-sm" data-a="setSearch" data-q="">پاک کردن جستجو</button>`)}</div>`
    }
  </div>`;
}
