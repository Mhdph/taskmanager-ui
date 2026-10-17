/* =====================================================================
   HYDRATE — load the workspace from taskmanager-api into the UI store.

   Flow (browser only):
     +layout.svelte onMount → hydrateWorkspace()
       1. identity: GET /me
       2. workspace: /members /teams /labels /favorites /activity
       3. projects (+ archived); per project: statuses, members, tasks
          (open + archived), saved views
       4. per task: comments, attachments, dependencies (concurrency-limited)

   All UI shapes come from #lib/adapter — the view layer is untouched.
   On failure there is NO fallback to the demo seed: `S.ui.bootFailed`
   puts the layout in a blocking "backend unreachable" takeover and the
   skeleton stays empty until a retry succeeds.
   ===================================================================== */

import { api, ApiError, getIdentity } from './api';
import {
  activityFromApi,
  attachmentFromApi,
  commentFromApi,
  labelFromApi,
  memberFromApi,
  projectFromApi,
  savedViewFromApi,
  statusMapFromApi,
  subtaskFromApi,
  taskFromApi,
  teamFromApi,
  type StatusMap,
} from './adapter';
import { S, save } from './state.svelte';
import { setStatusMap, setLive } from './sync';
import { LB, PCOLORS } from '../core/constants';

const CONC = 8;

async function pool(items: any[], limit: number, fn: (item: any) => Promise<any>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.max(Math.min(limit, items.length), 1) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        await fn(items[idx]);
      } catch (e) {
        console.warn('[gr8r] hydrate item failed', e);
      }
    }
  });
  await Promise.all(workers);
}

/** GET with page-following cursors ({items,nextCursor}). */
async function paginate(path: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await api.get(path + (cursor ? `${sep}cursor=${encodeURIComponent(cursor)}` : ''));
    out.push(...(data.items || []));
    cursor = data.nextCursor ?? null;
    if (!cursor) break;
  }
  return out;
}

/**
 * Load the whole workspace from the API and swap the store's data.
 * Resolves `true` when real data was loaded. On failure the store keeps
 * its empty skeleton and the layout enters the boot-failed takeover.
 */
export async function hydrateWorkspace(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!getIdentity().userId) return false;

  try {
    const me = await api.get('/me');

    const [membersRaw, teamsRaw, labelsRaw, favs, activityRaw] = await Promise.all([
      paginate('/members'),
      api.get('/teams').catch(() => ({ items: [] })),
      api.get('/labels').catch(() => ({ items: [] })),
      api.get('/favorites').catch(() => ({ taskIds: [], projectIds: [] })),
      api.get('/activity?limit=100').catch(() => ({ items: [] })),
    ]);

    const teams = (teamsRaw.items || []).map(teamFromApi);
    const favTaskIds = new Set(favs.taskIds || []);
    const favProjectIds = new Set(favs.projectIds || []);

    // Projects (open + archived).
    const [openRaw, archivedRaw] = await Promise.all([paginate('/projects'), paginate('/projects?archived=true').catch(() => [])]);
    const projectsRaw = [...openRaw, ...archivedRaw];

    // Per-project context: statuses, members, saved views. Tasks come from
    // the tenant-wide listing below — it carries labels and status
    // name/category in one paginated query.
    const smaps = new Map<string, StatusMap>();
    const projectMembers = new Map<string, string[]>();
    const savedViews: any[] = [];

    await pool(projectsRaw, CONC, async (p: any) => {
      const pid = p.id;
      const [statuses, pmembers, views] = await Promise.all([
        api.get(`/projects/${pid}/statuses`),
        api.get(`/projects/${pid}/members`).catch(() => ({ items: [] })),
        api.get(`/projects/${pid}/views`).catch(() => ({ items: [] })),
      ]);
      smaps.set(pid, statusMapFromApi(statuses.items || statuses));
      projectMembers.set(
        pid,
        (pmembers.items || []).map((m: any) => m.userId),
      );
      savedViews.push(...(views.items || []).map(savedViewFromApi));
    });

    // Tasks: tenant-wide listing (labels + status context included),
    // open and archived in two paginated queries.
    const [tasksOpen, tasksArchived] = await Promise.all([paginate('/tasks'), paginate('/tasks?archived=true').catch(() => [])]);
    const tasksRaw: any[] = [...tasksOpen, ...tasksArchived];

    // Split parent tasks from subtasks (children become {title, done}).
    const parents = tasksRaw.filter(t => !t.parentTaskId);
    const subtasksByParent = new Map<string, any[]>();
    for (const t of tasksRaw) {
      if (t.parentTaskId) {
        const list = subtasksByParent.get(t.parentTaskId) || [];
        list.push(subtaskFromApi(t));
        subtasksByParent.set(t.parentTaskId, list);
      }
    }

    const members = membersRaw.map(m => memberFromApi(m, teams));

    const projects = projectsRaw.map(p =>
      projectFromApi(p, {
        members: projectMembers.get(p.id) || [],
        fav: favProjectIds.has(p.id),
      }),
    );

    const uiTasks = parents.map(t =>
      taskFromApi(t, {
        smap: smaps.get(t.projectId),
        fav: favTaskIds.has(t.id),
        subtasks: subtasksByParent.get(t.id) || [],
      }),
    );

    // Extend the UI's label color lookup with the API label directory.
    for (const l of (labelsRaw.items || []).map(labelFromApi)) {
      LB[l.id] = { id: l.id, name: l.name, c: l.c || PCOLORS.slate } as any;
    }

    // Swap data in before detail fetches so task()/proj() resolve.
    applyData(me, { teams, members, projects, uiTasks, savedViews, activity: (activityRaw.items || []).map(activityFromApi) });
    // From here on the sync layer is authorized to write to the API, and
    // every project's status uuid map (canonical ↔ server) is in place.
    setLive(true);
    for (const [pid, smap] of smaps) setStatusMap(pid, smap);

    // Per-task detail: comments, attachments, dependencies.
    await pool(uiTasks, 10, async (t: any) => {
      await fillTaskDetail(t);
    });

    save();
    console.info(`[gr8r] live workspace: ${projects.length} projects · ${uiTasks.length} tasks · ${members.length} members`);
    S.ui.bootFailed = false;
    S.ui.bootError = '';
    return true;
  } catch (e) {
    // No demo fallback: when the backend is unreachable the user must not
    // see made-up workspace data. The empty skeleton stays in memory and
    // the layout shows the blocking boot-failed takeover (retry re-runs
    // hydration). Nothing is persisted here — a previous good snapshot in
    // localStorage is untouched but is also never rendered, so stale ids
    // can't leak into an empty workspace.
    console.warn('[gr8r] hydrate failed — backend unreachable', e);
    const stage = e instanceof Error ? e.message : String(e);
    const status = (e as any)?.status ? ` (HTTP ${(e as any).status})` : '';
    S.ui.bootFailed = true;
    S.ui.bootError = `${stage}${status}`;
    S.ui.loading = false;
    S.ui.offline = false;
    S.ui.demo = false;
    return false;
  }
}

/** comments/attachments/deps for one task (idempotent via `_detail`). */
export async function fillTaskDetail(t: any): Promise<boolean> {
  if (!t || t._detail) return true;
  const pid = t.project;
  try {
    const [comments, attachments, deps] = await Promise.all([
      api.get(`/projects/${pid}/tasks/${t.id}/comments`),
      api.get(`/projects/${pid}/tasks/${t.id}/attachments`),
      api.get(`/projects/${pid}/tasks/${t.id}/dependencies`),
    ]);
    const items = Array.isArray(comments) ? comments : comments.items || [];
    const existing = D().comments.filter((c: any) => c.task !== t.id);
    D().comments = [...existing, ...items.map(commentFromApi)];
    t.attachments = (attachments || []).map((a: any) => attachmentFromApi(a, pid));
    t.deps = (deps || []).map((d: any) => d.dependsOnTaskId);
    t._detail = true;
    // files page: rebuild the global list from task attachments lazily.
    rebuildFiles();
    return true;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) t._detail = true;
    return false;
  }
}

function rebuildFiles() {
  const files: any[] = [];
  for (const t of D().tasks) {
    for (const a of t.attachments || []) {
      if (!files.some((f: any) => f.id === a.id)) files.push({ ...a, project: t.project, task: t.id });
    }
  }
  D().files = files;
}

/**
 * Rebuild the global files list from every task's attachments (after an
 * upload or delete so the Files page stays in sync).
 */
export { rebuildFiles };

/* ---------- apply ---------- */

/** Replace the API-owned domains in the store; keep seed-only ones. */
function applyData(me: Record<string, any>, part: { teams: any[]; members: any[]; projects: any[]; uiTasks: any[]; savedViews: any[]; activity: any[] }) {
  const d = D();
  d.projects = part.projects;
  d.tasks = part.uiTasks;
  d.members = part.members;
  d.teams = part.teams;
  d.savedViews = part.savedViews;
  d.activity = part.activity;
  d.comments = [];
  d.files = [];
  d.projOrder = part.projects.map((p: any) => p.id);
  d.me = me?.userId || d.me;
}

function D(): any {
  return S.data;
}
