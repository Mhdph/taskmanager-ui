import { api } from './api';
import { allPages, projectPath } from './features-api';

export interface Sprint {
  id: string;
  name: string;
  goal?: string | null;
  state: 'planned' | 'active' | 'completed';
  plannedStartAt?: string | null;
  plannedEndAt: string;
}
export interface SprintTask {
  id: string;
  title: string;
  sprintId: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  statusCategory?: string;
}
export interface SprintReport {
  frozen: boolean;
  commitmentTaskCount: number;
  commitmentEstimatedSeconds: number;
  addedTaskCount: number;
  addedEstimatedSeconds: number;
  removedTaskCount: number;
  removedEstimatedSeconds: number;
  completedTaskCount: number;
  completedEstimatedSeconds: number;
  carryoverTaskCount: number;
  carryoverEstimatedSeconds: number;
  archivedTaskCount: number;
  unestimatedTaskCount: number;
  tasks: { taskId: string; title: string; completed: boolean; archived: boolean; carriedOver: boolean; estimateSeconds: number | null }[];
}
export const sprintPath = (projectId: string, sprintId?: string) => `${projectPath(projectId)}/sprints${sprintId ? `/${encodeURIComponent(sprintId)}` : ''}`;
export const getSprints = (projectId: string) => allPages<Sprint>(`${sprintPath(projectId)}?limit=100`);
export const getSprintTasks = (projectId: string) => allPages<SprintTask>(`${projectPath(projectId)}/tasks?limit=100`);
export function sprintInput(name: string, goal: string, start: string, end: string, active = false) {
  if (!name.trim() || !end) throw new Error('نام و تاریخ پایان الزامی است.');
  const finish = new Date(end);
  if (Number.isNaN(finish.getTime()) || (!active && start && finish <= new Date(start))) throw new Error('پایان باید بعد از شروع باشد.');
  return {
    name: name.trim(),
    goal: goal.trim() || null,
    plannedEndAt: finish.toISOString(),
    ...(!active ? { plannedStartAt: start ? new Date(start).toISOString() : null } : {}),
  };
}
export const assignSprint = (projectId: string, taskId: string, sprintId: string | null) =>
  api.put(`${projectPath(projectId)}/tasks/${encodeURIComponent(taskId)}/sprint`, { sprintId });
