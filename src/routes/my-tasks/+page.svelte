<script lang="ts">
  import { TODAY, dOff, diffD, parse } from '../../core/utils';
  import { ic } from '../../core/icons';
  import { D, S, allTasks, isOver } from '../../core/store';
  import { applyView, viewOf, viewToolbar } from '../../shell/view-engine';
  import { calendarHtml } from '../../views/calendar';
  import { setRoute } from '#lib/router.js';
  import { A } from '../../actions/actions';
  import TaskList from '#lib/components/TaskList.svelte';
  import type { TaskGroup } from '#lib/types.js';

  setRoute('mytasks');

  const key = 'mytasks';
  let v = $derived(viewOf(key));
  let mine = $derived(
    applyView(
      allTasks().filter(t => t.assignee === D().me),
      v.sort.f === 'manual' ? { ...v, sort: { f: 'due', dir: 1 } } : v,
    ),
  );
  let groups = $derived<TaskGroup[]>([
    {
      key: 'overdue',
      name: 'Overdue',
      html: `<span style="color:var(--red)">${ic('clock-alert', 14)}</span>`,
      tasks: mine.filter(isOver),
      set: {},
    },
    {
      key: 'today',
      name: 'Today',
      html: ic('sun', 14),
      tasks: mine.filter(t => t.status !== 'done' && t.due && diffD(parse(t.due), TODAY) === 0),
      set: { due: dOff(0) },
    },
    {
      key: 'upcoming',
      name: 'Upcoming',
      html: ic('calendar-days', 14),
      tasks: mine.filter(t => t.status !== 'done' && (!t.due || diffD(parse(t.due), TODAY) > 0)),
      set: { due: dOff(3) },
    },
    {
      key: 'completed',
      name: 'Completed',
      html: `<span style="color:var(--green)">${ic('circle-check', 14)}</span>`,
      tasks: mine.filter(t => t.status === 'done'),
      set: { status: 'done' },
      collapsed: true,
    },
  ]);
  let toolbar = $derived(viewToolbar(key, { group: false }));
  let calendar = $derived(calendarHtml(mine, { key: 'my' }));

  const MODES = [
    { k: 'list', n: 'List', i: 'list' },
    { k: 'calendar', n: 'Calendar', i: 'calendar' },
  ] as const;

  function setMyView(mode: 'list' | 'calendar'): void {
    S.ui.myView = mode;
  }
</script>

<div class="page flush">
  <div class="ph">
    <div>
      <h1>My Tasks</h1>
      <p>{groups[1].tasks.length} due today · {groups[0].tasks.length} overdue · {groups[2].tasks.length} upcoming</p>
    </div>
    <div class="acts">
      <div class="seg" role="tablist" aria-label="View">
        {#each MODES as m (m.k)}
          <button role="tab" aria-selected={S.ui.myView === m.k} class={S.ui.myView === m.k ? 'on' : ''} onclick={() => setMyView(m.k)}>{@html ic(m.i, 13)}{m.n}</button>
        {/each}
      </div>
      <button class="btn btn-primary" onclick={(e) => A.newTask(e.currentTarget as HTMLElement)} data-assignee={D().me}>{@html ic('plus', 14)}New task</button>
    </div>
  </div>
  {@html toolbar}
  {#if S.ui.myView === 'calendar'}
    {@html calendar}
  {:else}
    <div class="list-wrap">
      <TaskList {groups} listKey={key} cols={['project', 'status', 'priority', 'due']} complete drag={false} keepEmpty />
    </div>
  {/if}
</div>
