<script lang="ts">
import { relDate } from '../../core/utils';
import { ic } from '../../core/icons';
import { ST } from '../../core/constants';
  import { S, commentsOf, isOver, mem, pColor, proj } from '../../core/store';
  import { av, lbl, prPill, stPill } from '../../ui/helpers';
  import { fxc } from '../../shell/render';
  import { A, DBL } from '../../actions/actions';
  import type { Task } from '#lib/types.js';
  import { popClick } from '#lib/events.js';

  interface Props {
    t: Task;
    cols: string[];
    group?: string;
    lkey?: string;
    complete?: boolean;
    drag?: boolean;
  }

  let { t, cols, group = '', lkey = '', complete = false, drag = true }: Props = $props();

  let selected = $derived(S.ui.sel.has(t.id));
  let open = $derived(!!S.ui.openTasks[t.id]);
  let editing = $derived(S.ui.editCell != null && S.ui.editCell.id === t.id && S.ui.editCell.f === 'title');
  let commentCount = $derived(commentsOf(t.id).length);
  let doneSubs = $derived(t.subtasks.filter(s => s.done).length);

  function el(dataset: Record<string, string>): HTMLElement {
    // Action-table handlers only read `dataset`; pass a light stand-in.
    return { dataset } as unknown as HTMLElement;
  }
</script>

<div
  class="trow {t.status === 'done' ? 'done' : ''} {selected ? 'sel' : ''}{fxc('done', t.id)}{fxc('added', t.id)}"
  data-task-row={t.id}
  data-group={group}
  data-lkey={lkey}
  data-ctx="task"
  data-id={t.id}
>
  <div class="handle" draggable={drag} data-drag-row={drag ? t.id : undefined} aria-hidden="true">
    {#if drag}{@html ic('grip-vertical', 14)}{/if}
  </div>
  <div class="c-check">
    {#if complete}
      <input
        type="checkbox"
        class="check round"
        checked={t.status === 'done'}
        onclick={() => A.toggleDone(el({ id: t.id }))}
        aria-label="Mark {t.title} complete"
      />
    {:else}
      <input
        type="checkbox"
        class="check"
        checked={selected}
        onclick={() => A.selRow(el({ id: t.id }))}
        aria-label="Select {t.title}"
      />
    {/if}
  </div>
  <div
    class="ttl"
    role="button"
    tabindex="0"
    onclick={() => {
      if (!editing) A.openTask(el({ id: t.id }));
    }}
    onkeydown={(e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !editing) {
        e.preventDefault();
        A.openTask(el({ id: t.id }));
      }
    }}
    ondblclick={(e) => DBL.editTitle(e.currentTarget as HTMLElement)}
  >
    {#if t.subtasks.length}
      <button
        class="ibtn ibtn-xs"
        onclick={(e) => {
          e.stopPropagation();
          A.expandRow(el({ id: t.id }));
        }}
        aria-label="{open ? 'Hide' : 'Show'} subtasks"
        aria-expanded={open}
        style="margin-left:-4px">{@html ic(open ? 'chevron-down' : 'chevron-right', 13)}</button
      >
    {:else}
      <span style="width:18px;flex-shrink:0"></span>
    {/if}
    <span class="key">{t.key}</span>
    {#if editing}
      <input
        class="inline-in"
        id="edit-title"
        data-in="noop"
        data-blur="commitTitle"
        data-key-enter="commitTitle"
        data-id={t.id}
        value={t.title}
        aria-label="Task title"
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="tt">{t.title}</span>
    {/if}
    {#if t.recur}<span class="meta-mini" data-tip="Repeats {t.recur.toLowerCase()}">{@html ic('repeat', 11)}</span>{/if}
    {#if t.subtasks.length}<span class="meta-mini">{@html ic('list-checks', 11)}{doneSubs}/{t.subtasks.length}</span>{/if}
    {#if commentCount}<span class="meta-mini">{@html ic('message-square', 11)}{commentCount}</span>{/if}
  </div>
  {#each cols as c (c)}
    <div class="c-meta c-{c === 'labels' ? 'lbl' : c}">
      {#if c === 'status'}
        <button class="pillbtn" onclick={popClick(A.pop)} data-pop="status" data-id={t.id} aria-label="Status: {ST[t.status].name}">{@html stPill(t.status)}</button>
      {:else if c === 'assignee'}
        {@const m = mem(t.assignee)}
        <button class="pillbtn {m ? '' : 'empty'}" onclick={popClick(A.pop)} data-pop="assignee" data-id={t.id} aria-label="Assignee">{@html av(t.assignee, 'sm', false)}<span class="trunc">{m ? m.name : 'Unassigned'}</span></button>
      {:else if c === 'priority'}
        <button class="pillbtn {t.priority === 'none' ? 'empty' : ''}" onclick={popClick(A.pop)} data-pop="priority" data-id={t.id} aria-label="Priority">{@html prPill(t.priority)}</button>
      {:else if c === 'due'}
        <button class="pillbtn {t.due ? (isOver(t) ? 'over' : '') : 'empty'}" onclick={popClick(A.pop)} data-pop="date" data-field="due" data-id={t.id} aria-label="Due date">
          {#if t.due}{@html ic('calendar', 13)}<span class="num">{relDate(t.due)}</span>{:else}{@html ic('calendar', 13)}<span>Set date</span>{/if}
        </button>
      {:else if c === 'labels'}
        <button class="pillbtn {t.labels.length ? '' : 'empty'}" onclick={popClick(A.pop)} data-pop="labels" data-id={t.id} aria-label="Labels" style="gap:4px;overflow:hidden">
          {#if t.labels.length}
            {#each t.labels.slice(0, 2) as l (l)}{@html lbl(l)}{/each}
            {#if t.labels.length > 2}<span class="faint" style="font-size:11px">+{t.labels.length - 2}</span>{/if}
          {:else}
            {@html ic('tag', 13)}<span>Add</span>
          {/if}
        </button>
      {:else if c === 'project'}
        {@const p = proj(t.project)}
        <button class="pillbtn" onclick={popClick(A.pop)} data-pop="project" data-id={t.id} aria-label="Project"><span class="pdot" style="--c:{pColor(p)}"></span><span class="trunc">{p?.name}</span></button>
      {/if}
    </div>
  {/each}
  <div class="c-more">
    <button class="ibtn ibtn-sm" onclick={popClick(A.ctxBtn)} data-ctx="task" data-id={t.id} aria-label="More actions">{@html ic('ellipsis', 15)}</button>
  </div>
</div>
{#if open}
  <div class="subrows">
    {#each t.subtasks as s (s.id)}
      <div class="subrow {s.done ? 'done' : ''}">
        <input type="checkbox" class="check" checked={s.done} onclick={() => A.toggleSub(el({ id: t.id, sid: s.id }))} aria-label="Complete subtask" />
        <span>{s.title}</span>
      </div>
    {/each}
  </div>
{/if}
