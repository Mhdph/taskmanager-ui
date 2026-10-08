/* Shared element/action types for the legacy action-delegation layer. */

import type { S } from './state.svelte.js';

/** Any element carrying `data-a` / `data-in` / `data-*` wire-up attributes. */
export type ActionEl = HTMLElement & {
  dataset: DOMStringMap & Record<string, string | undefined>;
  value?: string;
  checked?: boolean;
  files?: FileList | null;
  form?: HTMLFormElement | null;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  setSelectionRange?: (start: number, end: number) => void;
};

/** Loose handler signature used by the `A` / `IN` / `KEY` / `DBL` / `BLUR` tables. */
export type ActionFn = (el?: any, e?: any) => unknown;
export type ActionTable = Record<string, ActionFn>;

/** Route params bag (project id/tab, member id, settings section, …). */
export type RouteParams = Record<string, string>;

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

/** Task domain object (subset of fields used by list rendering). */
export interface Task {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  project: string;
  due: string | null;
  start?: string | null;
  labels: string[];
  subtasks: Subtask[];
  order: number;
  archived?: boolean;
  recur?: string | null;
  updated: number;
  completedAt?: number | null;
  [key: string]: any;
}

export interface TaskGroup {
  key: string;
  name: string;
  html?: string;
  tasks: Task[];
  collapsed?: boolean;
  set?: Record<string, any>;
}

export type Store = typeof S;
