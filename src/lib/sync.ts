/* =====================================================================
   SYNC — server mutation wrappers. Actions apply changes optimistically
   in the local store (existing `mutate()` flow) and call these helpers
   right after; failures surface as toasts and never break rendering.

   `null` server id when an optimistic record isn't on the server yet
   (e.g. offline demo data) is ignored everywhere here.
   ===================================================================== */

import { api, ApiError } from './api';
import { dateToTs, estimateToSeconds, recurrenceToApi, statusIdFromCanon, statusMapFromApi, type StatusMap } from './adapter';
import { D, S, task, proj } from '../core/store';
import { toast } from '../ui/toast';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const smaps: Record<string, StatusMap> = {};

export function setStatusMap(projectId: string, smap: StatusMap) {
  smaps[projectId] = smap;
}

/** (Re)builds a canonical map from the project's statuses if missing. */
export function statusUuid(projectId: string, canonId: string): string | null {
  return smaps[projectId]?.byCanon?.[canonId]?.id || null;
}

function fail(label: string, e: unknown) {
  const msg = e instanceof ApiError && e.status === 0 ? e.message : 'ذخیره تغییرات ناموفق بود؛ دوباره تلاش کنید.';
  toast(msg + (e instanceof ApiError && e.status === 0 ? '' : ''), { kind: 'err', ms: 5000 });
  console.warn('[gr8r]', label, e);
}

/** Attachment upload with progress (actions handleFiles). */
function upload_impl(projectID: string, taskID: string, file: File, onProgress: (pct: number) => void) {
  return api.upload(projectID, taskID, file, onProgress);
}

/* ------------------------------------------------------------------ */
/* tasks                                                               */
/* ------------------------------------------------------------------ */

/** POST /projects/{pid}/tasks — mirrors a locally created task. */
async function createTask_impl(t: any, extra: Record<string, any> = {}) {
  if (!t?.project || !proj(t.project)) return;
  const body: Record<string, any> = {
    title: t.title,
    description: stripHtml(t.desc) || null,
    statusId: statusUuid(t.project, t.status),
    priority: t.priority === 'none' ? null : t.priority,
    assigneeUserId: t.assignee || null,
    startAt: dateToTs(t.start),
    dueAt: dateToTs(t.due),
    estimateSeconds: estimateToSeconds(t.estimate),
    recurrence: recurrenceToApi(t.recur),
    ...extra,
  };
  let id: string | undefined;
  try {
    const res = await api.post(`/projects/${t.project}/tasks`, body);
    id = res.id;
    if (id) swapTaskId(t.id, id);
  } catch (e) {
    fail('Task creation', e);
    return;
  }
  // Children: locally created subtasks become child tasks.
  for (const s of t.subtasks || []) {
    try {
      const c = await api.post(`/projects/${t.project}/tasks`, {
        title: s.title,
        statusId: statusUuid(t.project, s.done ? 'done' : 'todo'),
        priority: null,
        parentTaskId: id || t.id,
      });
      if (c.id) {
        const i = t.subtasks.indexOf(s);
        if (i >= 0) t.subtasks[i] = { ...s, id: c.id };
      }
    } catch (e) {
      console.warn('[gr8r] subtask creation', e);
    }
  }
}

/** PATCH /projects/{pid}/tasks/{id} — translates a UI patch. */
async function updateTask_impl(t: any, uiPatch: Record<string, any>) {
  if (!t?.project || !proj(t.project)) return;
  const body: Record<string, any> = {};
  if ('title' in uiPatch) body.title = uiPatch.title;
  if ('desc' in uiPatch) body.description = stripHtml(uiPatch.desc);
  if ('status' in uiPatch) body.statusId = statusIdFromCanon(smaps[t.project], uiPatch.status);
  if ('priority' in uiPatch) body.priority = uiPatch.priority || null;
  if ('assignee' in uiPatch) body.assigneeUserId = uiPatch.assignee || null;
  if ('due' in uiPatch) body.dueAt = dateToTs(uiPatch.due);
  if ('start' in uiPatch) body.startAt = dateToTs(uiPatch.start);
  if ('recur' in uiPatch) body.recurrence = recurrenceToApi(uiPatch.recur);
  if ('estimate' in uiPatch) body.estimateSeconds = estimateToSeconds(uiPatch.estimate);
  if (Object.keys(body).length === 0) return;
  try {
    const res = await api.patch(`/projects/${t.project}/tasks/${t.id}`, body);
    if (res.statusId) t._statusId = res.statusId;
  } catch (e) {
    fail('Task update', e);
  }
}

/** PUT /projects/{pid}/tasks/{id}/labels — full label set for a task. */
async function setLabels_impl(t: any, labelIds: string[]) {
  if (!t?.project) return;
  try {
    await api.put(`/projects/${t.project}/tasks/${t.id}/labels`, { labelIds: labelIds.filter(Boolean) });
  } catch (e) {
    fail('Label update', e);
  }
}

/** labels are often a UI patch → route to the labels endpoint. */
async function labelsFromPatch_impl(t: any, uiPatch: Record<string, any>) {
  if ('labels' in uiPatch) await setLabels_impl(t, uiPatch.labels);
}

/** Archive/restore. `hard` deletes the local copy as the UI's delete does. */
async function setArchived_impl(t: any, archived: boolean) {
  if (!t?.project) return;
  try {
    await (archived ? api.del(`/projects/${t.project}/tasks/${t.id}`) : api.post(`/projects/${t.project}/tasks/${t.id}/restore`));
  } catch (e) {
    fail(archived ? 'Archive' : 'Restore', e);
  }
}

/* reorder: one call per status column with [{taskId, position}] */
async function reorder_impl(projectId: string, canonStatus: string, orderedIds: string[]) {
  const statusId = statusUuid(projectId, canonStatus);
  const tasks = orderedIds.map((id, i) => ({ taskId: id, position: (i + 1) * 1024 })).filter(x => task(x.taskId));
  if (!tasks.length) return;
  try {
    await api.put(`/projects/${projectId}/tasks/reorder`, { tasks });
    void statusId;
  } catch (e) {
    fail('Reorder', e);
  }
}

/** POST /tasks/bulk (tenant-wide; status accepts a uuid or name). */
async function bulk_impl(ids: string[], patch: { status?: string | null; priority?: string | null; assignee?: string | null; archive?: boolean }) {
  const tasks = ids
    .map(task)
    .filter(Boolean)
    .filter((t: any) => !t.archived);
  if (!tasks.length) return;
  const body: Record<string, any> = { taskIds: tasks.map((t: any) => t.id) };
  // Bulk may span projects; the API resolves a status name per task's
  // project, while a uuid only fits its own project.
  const pids = new Set(tasks.map((t: any) => t.project));
  if (patch.status) {
    body.status = pids.size === 1 ? statusUuid(tasks[0].project, patch.status) : CANON_NAMES[patch.status] || patch.status;
  }
  if (patch.priority) body.priority = patch.priority;
  if ('assignee' in patch) body.assignee = patch.assignee || 'none';
  if (patch.archive) body.archive = true;
  try {
    await api.post('/tasks/bulk', body);
  } catch (e) {
    fail('Bulk update', e);
  }
}

const CANON_NAMES: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

/* ------------------------------------------------------------------ */
/* subtasks (child tasks via parentTaskId)                             */
/* ------------------------------------------------------------------ */

async function addSubtask_impl(parent: any, sub: any) {
  if (!parent?.project) return;
  try {
    const res = await api.post(`/projects/${parent.project}/tasks`, {
      title: sub.title,
      statusId: statusUuid(parent.project, sub.done ? 'done' : 'todo'),
      priority: null,
      parentTaskId: parent.id,
    });
    if (res.id) {
      const i = parent.subtasks.findIndex((s: any) => s === sub);
      if (i >= 0) parent.subtasks[i] = { ...sub, id: res.id };
    }
  } catch (e) {
    fail('Subtask', e);
  }
}

async function removeSubtask_impl(parent: any, sub: any) {
  if (!parent?.project || !sub?.id) return;
  try {
    await api.del(`/projects/${parent.project}/tasks/${sub.id}`);
  } catch (e) {
    // A locally created child may not exist server-side yet (404 is fine).
    if (!(e instanceof ApiError && e.status === 404)) fail('Subtask removal', e);
  }
}

async function updateSubtask_impl(parent: any, sub: any, patch: Record<string, any>) {
  if (!parent?.project || !sub?.id) return;
  const body: Record<string, any> = {};
  if ('done' in patch) body.statusId = statusUuid(parent.project, patch.done ? 'done' : 'todo');
  if ('title' in patch) body.title = patch.title;
  if ('assignee' in patch) body.assigneeUserId = patch.assignee || null;
  if ('due' in patch) body.dueAt = dateToTs(patch.due);
  try {
    await api.patch(`/projects/${parent.project}/tasks/${sub.id}`, body);
  } catch (e) {
    fail('Subtask update', e);
  }
}

/* ------------------------------------------------------------------ */
/* comments                                                            */
/* ------------------------------------------------------------------ */

async function addComment_impl(taskId: string, text: string) {
  const t = task(taskId);
  if (!t?.project) return;
  try {
    const res = await api.post(`/projects/${t.project}/tasks/${t.id}/comments`, { body: text });
    const c = D().comments.find((x: any) => x.task === taskId);
    if (c && res.id) {
      // Attach a synthetic swap target so later delete hits the server.
      c._serverId = res.id;
    }
  } catch (e) {
    fail('Comment', e);
  }
}

async function deleteComment_impl(taskId: string, localId: string) {
  const t = task(taskId);
  if (!t?.project) return;
  try {
    await api.del(`/projects/${t.project}/tasks/${t.id}/comments/${localId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return; // optimistic ids never posted
    fail('Comment delete', e);
  }
}

/* ------------------------------------------------------------------ */
/* dependencies                                                        */
/* ------------------------------------------------------------------ */

async function addDependency_impl(taskId: string, dependsOn: string) {
  const t = task(taskId);
  if (!t?.project) return;
  try {
    await api.post(`/projects/${t.project}/tasks/${t.id}/dependencies`, { dependsOnTaskId: dependsOn });
  } catch (e) {
    fail('Dependency', e);
  }
}

async function removeDependency_impl(taskId: string, dependsOn: string) {
  const t = task(taskId);
  if (!t?.project) return;
  try {
    await api.del(`/projects/${t.project}/tasks/${t.id}/dependencies/${dependsOn}`);
  } catch (e) {
    fail('Dependency delete', e);
  }
}

/* ------------------------------------------------------------------ */
/* attachments                                                         */
/* ------------------------------------------------------------------ */

async function deleteAttachment_impl(t: any, attachmentId: string) {
  if (!t?.project) return;
  try {
    await api.del(`/projects/${t.project}/tasks/${t.id}/attachments/${attachmentId}`);
  } catch (e) {
    fail('Attachment delete', e);
  }
}

/* ------------------------------------------------------------------ */
/* favorites                                                           */
/* ------------------------------------------------------------------ */

function favorite_impl(kind: 'task' | 'project', id: string, fav: boolean) {
  const req = fav
    ? api.put(kind === 'task' ? `/favorites/tasks/${id}` : `/favorites/projects/${id}`)
    : api.del(kind === 'task' ? `/favorites/tasks/${id}` : `/favorites/projects/${id}`);
  req.catch((e: unknown) => fail('Favorite', e));
  return req;
}

/* ------------------------------------------------------------------ */
/* views                                                               */
/* ------------------------------------------------------------------ */

async function createView_impl(pid: string, view: { name: string; type: string; filters: any[] }): Promise<string | null> {
  try {
    const res = await api.post(`/projects/${pid}/views`, view);
    return res.id;
  } catch (e) {
    fail('View save', e);
    return null;
  }
}

async function renameView_impl(pid: string, viewId: string, name: string) {
  try {
    await api.patch(`/projects/${pid}/views/${viewId}`, { name });
  } catch (e) {
    fail('View rename', e);
  }
}

async function deleteView_impl(pid: string, viewId: string) {
  try {
    await api.del(`/projects/${pid}/views/${viewId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return;
    fail('View delete', e);
  }
}

/* ------------------------------------------------------------------ */
/* projects                                                            */
/* ------------------------------------------------------------------ */

async function createProject_impl(p: any) {
  try {
    const res = await api.post('/projects', {
      name: p.name,
      description: p.desc && p.desc !== 'No description yet.' ? p.desc : null,
      teamId: p.team || null,
    });
    if (res.id && res.id !== p.id) swapProjectId(p.id, res.id);
    refreshStatusMap(p.id);
  } catch (e) {
    fail('Project creation', e);
  }
}

async function updateProject_impl(p: any, patch: { name?: string; desc?: string; team?: string | null }) {
  if (!p?._stars) {
    return;
  }
  // Team slugs are UUIDs once hydrated; masks for demo/seed teams.
  const teamId = patch.team !== undefined ? (patch.team && lookUuid(patch.team) ? patch.team : null) : undefined;
  const body: Record<string, any> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.desc !== undefined) body.description = patch.desc || null;
  if (teamId !== undefined) body.teamId = teamId;
  if (!Object.keys(body).length) return;
  try {
    await api.patch(`/projects/${p.id}`, body);
  } catch (e) {
    fail('Project update', e);
  }
}

async function archiveProject_impl(p: any, archived: boolean) {
  if (!p?._stars) return;
  try {
    await (archived ? api.del(`/projects/${p.id}`) : api.post(`/projects/${p.id}/restore`));
    if (!archived) refreshStatusMap(p.id);
  } catch (e) {
    fail(archived ? 'Project archive' : 'Project restore', e);
  }
}

async function refreshStatusMap_impl(pid: string): Promise<StatusMap | null> {
  try {
    const statuses = await api.get(`/projects/${pid}/statuses`);
    const smap = statusMapFromApi(statuses.items || statuses);
    setStatusMap(pid, smap);
    return smap;
  } catch {
    return null;
  }
}

async function addProjectMember_impl(pid: string, userId: string) {
  try {
    await api.post(`/projects/${pid}/members`, { userId, role: 'member' });
  } catch (e) {
    fail('Member added', e);
  }
}

async function setProjectMemberRole_impl(pid: string, userId: string, role: string) {
  try {
    await api.patch(`/projects/${pid}/members/${userId}`, { role: role.toLowerCase() });
  } catch (e) {
    fail('Role change', e);
  }
}

async function removeProjectMember_impl(pid: string, userId: string) {
  try {
    await api.del(`/projects/${pid}/members/${userId}`);
  } catch (e) {
    fail('Member removal', e);
  }
}

/* ------------------------------------------------------------------ */
/* workspace members & teams                                           */
/* ------------------------------------------------------------------ */

async function setMemberTitle_impl(userId: string, title: string) {
  try {
    await api.patch(`/members/${userId}`, { title });
  } catch (e) {
    fail('Profile update', e);
  }
}

async function setMemberRole_impl(userId: string, role: string) {
  try {
    await api.patch(`/members/${userId}`, { role: role.toLowerCase() });
  } catch (e) {
    fail('Role change', e);
  }
}

async function removeMember_impl(userId: string) {
  try {
    await api.del(`/members/${userId}`);
  } catch (e) {
    fail('Member removal', e);
  }
}

async function createTeam_impl(t: any, memberIds: string[]) {
  try {
    const res = await api.post('/teams', { name: t.name, icon: t.icon, color: t.c, description: t.desc });
    if (res.id && res.id !== t.id) swapTeamId(t.id, res.id);
    await setTeamMembers(t.id, memberIds, []);
    return res.id;
  } catch (e) {
    fail('Team creation', e);
    return null;
  }
}

async function updateTeam_impl(t: any, memberIds: string[], prevMemberIds: string[]) {
  try {
    await api.patch(`/teams/${t.id}`, { name: t.name, icon: t.icon, color: t.c, description: t.desc });
    if (prevMemberIds.join() !== memberIds.join()) await setTeamMembers(t.id, memberIds, prevMemberIds);
  } catch (e) {
    fail('Team update', e);
  }
}

async function setTeamMembers(teamId: string, memberIds: string[], _prev: string[]) {
  try {
    await api.put(`/teams/${teamId}/members`, { userIds: memberIds });
  } catch (e) {
    fail('Team members', e);
  }
}

async function deleteTeam_impl(teamId: string) {
  try {
    await api.del(`/teams/${teamId}`);
  } catch (e) {
    fail('Team delete', e);
  }
}

/* ------------------------------------------------------------------ */
/* id swaps (optimistic ids → server ids)                              */
/* ------------------------------------------------------------------ */

function swapTaskId(oldId: string, newId: string) {
  if (!oldId || !newId || oldId === newId) return;
  const d = D();
  for (const t of d.tasks) {
    if (t.id === oldId) t.id = newId;
    t.deps = (t.deps || []).map((x: string) => (x === oldId ? newId : x));
  }
  for (const c of d.comments) if (c.task === oldId) c.task = newId;
  for (const a of d.activity || []) if (a.task === oldId) a.task = newId;
  for (const f of d.files || []) if (f.task === oldId) f.task = newId;
  if (S.ui.drawer === oldId) S.ui.drawer = newId;
}

function swapProjectId(oldId: string, newId: string) {
  if (!oldId || !newId || oldId === newId) return;
  const d = D();
  const p = (d.projects || []).find((x: any) => x.id === oldId);
  if (p) p.id = newId;
  d.projOrder = (d.projOrder || []).map((x: string) => (x === oldId ? newId : x));
  for (const t of d.tasks) if (t.project === oldId) t.project = newId;
  for (const a of d.activity || []) if (a.project === oldId) a.project = newId;
  for (const s of d.savedViews || []) if (s.project === oldId) s.project = newId;
  for (const f of d.files || []) if (f.project === oldId) f.project = newId;
}

function swapTeamId(oldId: string, newId: string) {
  if (!oldId || !newId || oldId === newId) return;
  const d = D();
  const t = (d.teams || []).find((x: any) => x.id === oldId);
  if (t) t.id = newId;
  for (const m of d.members || []) if (m.team === oldId) m.team = newId;
  for (const p of d.projects || []) if (p.team === oldId) p.team = newId;
}

/* ------------------------------------------------------------------ */
/* utils                                                               */
/* ------------------------------------------------------------------ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lookUuid(v: string | null | undefined): boolean {
  return !!v && UUID_RE.test(v);
}

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/* ---------- live gate -------------------------------------------------------------------------- */

let LIVE = false;

/** Hydrate flips this on: wrappers become no-ops in demo/seed mode. */
export function setLive(v: boolean) {
  LIVE = v;
}

/** Run `fn` only when the workspace is actually backed by the API. */
function live<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => (LIVE ? fn(...args) : Promise.resolve(undefined))) as T;
}

export const createTask = live(createTask_impl);
export const updateTask = live(updateTask_impl);
export const setLabels = live(setLabels_impl);
export const labelsFromPatch = live(labelsFromPatch_impl);
export const setArchived = live(setArchived_impl);
export const reorder = live(reorder_impl);
export const bulk = live(bulk_impl);
export const addSubtask = live(addSubtask_impl);
export const removeSubtask = live(removeSubtask_impl);
export const updateSubtask = live(updateSubtask_impl);
export const addComment = live(addComment_impl);
export const deleteComment = live(deleteComment_impl);
export const addDependency = live(addDependency_impl);
export const removeDependency = live(removeDependency_impl);
export const deleteAttachment = live(deleteAttachment_impl);
export const favorite = live(favorite_impl);
export const createView = live(createView_impl);
export const renameView = live(renameView_impl);
export const deleteView = live(deleteView_impl);
export const createProject = live(createProject_impl);
export const updateProject = live(updateProject_impl);
export const archiveProject = live(archiveProject_impl);
export const refreshStatusMap = live(refreshStatusMap_impl);
export const addProjectMember = live(addProjectMember_impl);
export const setProjectMemberRole = live(setProjectMemberRole_impl);
export const removeProjectMember = live(removeProjectMember_impl);
export const setMemberTitle = live(setMemberTitle_impl);
export const setMemberRole = live(setMemberRole_impl);
export const removeMember = live(removeMember_impl);
export const createTeam = live(createTeam_impl);
export const updateTeam = live(updateTeam_impl);
export const deleteTeam = live(deleteTeam_impl);
export const upload = live(upload_impl);
