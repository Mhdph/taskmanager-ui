/* ---------- store (legacy shim) ----------
   Canonical state lives in `#lib/state` (TanStack Store).
   This module re-exports it so every existing importer keeps working
   while gaining reactivity for free. */
export {
  STORE_KEY,
  DEFAULT_PREFS,
  load,
  S,
  _saveT,
  save,
  resetWorkspace,
  D,
  me,
  mem,
  proj,
  task,
  pColor,
  visibleProjects,
  canSee,
  tasksOf,
  allTasks,
  isOver,
  commentsOf,
  progressOf,
  taskProg,
  logAct,
  NO_TEAM,
  teamsList,
  team,
  TM,
} from '#lib/state';

/* `saved` was the raw localStorage snapshot; kept for compat (null on server). */
export const saved = null;
