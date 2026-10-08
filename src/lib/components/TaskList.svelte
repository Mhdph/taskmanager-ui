<script lang="ts">
  import { ic } from '../../core/icons';
  import { S } from '../../core/store';
import { empty } from '../../ui/helpers';
import { viewOf } from '../../shell/view-engine';
  import { A } from '../../actions/actions';
  import TaskRow from './TaskRow.svelte';
  import type { TaskGroup } from '#lib/types.js';
  import { popClick } from '#lib/events.js';

  interface Props {
    groups: TaskGroup[];
    listKey: string;
    cols?: string[];
    complete?: boolean;
    drag?: boolean;
    keepEmpty?: boolean;
    noAdd?: boolean;
    emptyHtml?: string;
    project?: string;
  }

  let {
    groups,
    listKey: key,
    cols = ['status', 'assignee', 'priority', 'due', 'labels'],
    complete = false,
    drag = true,
    keepEmpty = false,
    noAdd = false,
    emptyHtml = '',
    project,
  }: Props = $props();

  const LCOLS: Record<string, [string, string]> = {
    status: ['Status', '126px'],
    assignee: ['Assignee', '150px'],
    priority: ['Priority', '108px'],
    due: ['Due date', '104px'],
    labels: ['Labels', '168px'],
    project: ['Project', '160px'],
  };

  let tpl = $derived(`18px 30px minmax(220px,1fr) ${cols.map(c => LCOLS[c][1]).join(' ')} 40px`);
  let all = $derived(groups.flatMap(g => g.tasks.map(t => t.id)));
  let nSel = $derived(all.filter(id => S.ui.sel.has(id)).length);
  let total = $derived(all.length);
  let v = $derived(viewOf(key));

  function groupKey(g: TaskGroup): string {
    return key + ':' + g.key;
  }

  function isCollapsed(g: TaskGroup): boolean {
    return S.ui.collapsedGroups[groupKey(g)] ?? (g.collapsed || false);
  }

  function toggleGroup(g: TaskGroup): void {
    const gk = groupKey(g);
    S.ui.collapsedGroups[gk] = !(S.ui.collapsedGroups[gk] ?? (g.collapsed || false));
  }

  function isComposing(g: TaskGroup): boolean {
    return !!S.ui.composer && S.ui.composer.ctx === key && S.ui.composer.group === g.key;
  }
</script>

{#if !total && !keepEmpty}
  {@html emptyHtml ||
    empty(
      'list-checks',
      'No tasks here',
      'Add a task to get things moving.',
      `<button class="btn btn-primary btn-sm" data-a="newTask"${project ? ` data-project="${project}"` : ''}>${ic('plus', 14)}New task</button>`,
    )}
{:else}
  <div class="tlist" role="table" aria-label="Tasks">
    <div class="thead" style="--cols:{tpl}" role="row">
      <div></div>
      <div>
        {#if !complete}
          {@const selAll = nSel > 0 && nSel === total}
          <input
            type="checkbox"
            class="check"
            checked={selAll}
            data-indet={nSel > 0 && nSel < total ? '1' : undefined}
            onclick={(e) => A.selAll(e.currentTarget as HTMLElement)}
            data-key={key}
            aria-label="Select all"
          />
        {/if}
      </div>
      <div role="button" tabindex="0" onclick={(e) => A.sortBy(e.currentTarget as HTMLElement)} onkeydown={(e) => { if (e.key === 'Enter') A.sortBy(e.currentTarget as HTMLElement); }} data-key={key} data-f="title" style="cursor:pointer">
        Task {#if v?.sort.f === 'title'}{@html ic(v.sort.dir > 0 ? 'arrow-up' : 'arrow-down', 11)}{/if}
      </div>
      {#each cols as c (c)}
        <div
          role="button"
          tabindex="0"
          onclick={(e) => A.sortBy(e.currentTarget as HTMLElement)}
          onkeydown={(e) => { if (e.key === 'Enter') A.sortBy(e.currentTarget as HTMLElement); }}
          data-key={key}
          data-f={c === 'labels' ? 'manual' : c}
          style="cursor:pointer"
        >
          {LCOLS[c][0]} {#if v?.sort.f === c}{@html ic(v.sort.dir > 0 ? 'arrow-up' : 'arrow-down', 11)}{/if}
        </div>
      {/each}
      <div></div>
    </div>
    {#each groups as g (g.key)}
      {@const coll = isCollapsed(g)}
      {@const comp = isComposing(g)}
      {#if groups.length > 1 || g.key !== 'all'}
        <div class="grp" data-grp-drop={g.key} data-key={key}>
          <button class="ibtn ibtn-xs" onclick={() => toggleGroup(g)} aria-expanded={!coll} aria-label="Toggle group">{@html ic(coll ? 'chevron-right' : 'chevron-down', 13)}</button>
          {@html g.html || ''}<span>{g.name}</span><span class="cnt">{g.tasks.length}</span>
          {#if !noAdd}
            <button
              class="ibtn ibtn-xs"
              onclick={(e) => A.startComposer(e.currentTarget as HTMLElement)}
              data-ctx={key}
              data-group={g.key}
              data-gb={JSON.stringify(g.set || {})}
              aria-label="Add task to {g.name}">{@html ic('plus', 13)}</button
            >
          {/if}
        </div>
      {/if}
      {#if !coll}
        {#each g.tasks as t (t.id)}
          <TaskRow {t} {cols} group={g.key} lkey={key} {complete} {drag} />
        {/each}
      {/if}
      {#if !coll && !noAdd}
        {#if comp}
          <div class="addrow" style="background:var(--surface-2)">
            {@html ic('plus', 14)}<input class="inline-in" id="composer-in" data-key-enter="commitComposer" placeholder="Task name — press Enter to add, Esc to cancel" aria-label="New task name" />
          </div>
        {:else}
          <button
            class="addrow"
            onclick={(e) => A.startComposer(e.currentTarget as HTMLElement)}
            data-ctx={key}
            data-group={g.key}
            data-gb={JSON.stringify(g.set || {})}
          >{@html ic('plus', 14)}Add task</button>
        {/if}
      {/if}
    {/each}
  </div>
{/if}
{#if nSel > 0}
  <div class="bulkbar{S.ui.fx.bulk ? ' enter' : ''}" role="toolbar" aria-label="Bulk actions">
    <b style="font-weight:600">{nSel} selected</b><span class="sep"></span>
    <button class="btn btn-sm" onclick={popClick(A.pop)} data-pop="bulk-status">{@html ic('circle-dot', 14)}Status</button>
    <button class="btn btn-sm" onclick={popClick(A.pop)} data-pop="bulk-assignee">{@html ic('user', 14)}Assignee</button>
    <button class="btn btn-sm" onclick={popClick(A.pop)} data-pop="bulk-priority">{@html ic('signal-high', 14)}Priority</button>
    <button class="btn btn-sm" onclick={() => A.bulkDelete()}>{@html ic('trash-2', 14)}Delete</button><span class="sep"></span>
    <button class="btn btn-sm" onclick={() => A.clearSel()} aria-label="Clear selection">{@html ic('x', 14)}</button>
  </div>
{/if}
