<script lang="ts">
import { TODAY, diffD, parse } from '../../core/utils';
import { ic, wsLogo } from '../../core/icons';
import { PSTAT } from '../../core/constants';
import { D, S, allTasks, pColor, visibleProjects, teamsList } from '../../core/store';
  import { av } from '../../ui/helpers';
  import { go } from '#lib/router.js';
  import { A } from '../../actions/actions';
  import { popClick } from '#lib/events.js';

  interface SubTab {
    tab: string;
    label: string;
    icon: string;
  }

  const SUB_TABS: SubTab[] = [
    { tab: 'board', label: 'Board', icon: 'square-kanban' },
    { tab: 'list', label: 'List', icon: 'list' },
    { tab: 'timeline', label: 'Timeline', icon: 'chart-gantt' },
    { tab: 'files', label: 'Files', icon: 'paperclip' },
  ];

  let unreadInbox = $derived(D().notifs.filter(n => !n.read && n.type !== 'update').length);
  let unreadAll = $derived(D().notifs.filter(n => !n.read).length);
  let myOpen = $derived(
    allTasks().filter(t => t.assignee === D().me && t.status !== 'done' && t.due && diffD(parse(t.due), TODAY) <= 0).length,
  );
  let projs = $derived(visibleProjects().filter(p => p.status !== 'complete'));
  let inProj = $derived(S.ui.route === 'project' ? S.ui.params.id : null);
  let archiveCount = $derived(D().tasks.filter(t => t.archived).length + D().projects.filter(p => p.archived).length);

  function isOn(route: string, id?: string): boolean {
    return S.ui.route === route && (!id || S.ui.params.id === id);
  }

  function navKey(e: KeyboardEvent, fn: () => void): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  }

  function toggleExpand(id: string): void {
    S.ui.expanded[id] = !S.ui.expanded[id];
  }
</script>

{#snippet item(route: string, label: string, icon: string, opts: { id?: string; count?: number | string; dot?: boolean; kbd?: string } = {})}
  {@const on = isOn(route, opts.id)}
  <button
    class="sitem {on ? 'on' : ''}"
    onclick={() => (opts.id ? go(route, { id: opts.id }) : go(route))}
    aria-current={on ? 'page' : undefined}
    {...S.ui.collapsed ? { 'data-tip': label, 'data-tip-pos': 'right' } : {}}
  >
    {@html ic(icon, 16)}<span class="trunc">{label}</span>{#if opts.count}<span class="ct {opts.dot ? 'dotc' : ''}">{opts.count}</span>{/if}{#if opts.kbd}<span class="ct hide-m"><kbd>{opts.kbd}</kbd></span>{/if}
  </button>
{/snippet}

<nav class="side" aria-label="Main">
  <div class="side-top">
    <div class="row" style="gap:2px">
      <button class="ws grow" onclick={popClick(A.pop)} data-pop="ws" aria-haspopup="menu" aria-label="Switch workspace">
        {@html wsLogo(D().ws, 22)}
        <span class="ws-name trunc">{D().ws.name}</span>
        <span class="chev-d faint">{@html ic('chevrons-up-down', 13)}</span>
      </button>
      {#if !S.ui.collapsed}
        <button class="ibtn ibtn-sm hide-m" onclick={() => A.toggleSide()} data-tip="Collapse sidebar  [" aria-label="Collapse sidebar">{@html ic('panel-left', 15)}</button>
      {/if}
    </div>
  </div>
  <div class="side-scroll" data-keep="side">
    {#if S.ui.collapsed}
      <button class="sitem" onclick={() => A.toggleSide()} data-tip="Expand sidebar" data-tip-pos="right" aria-label="Expand sidebar">{@html ic('panel-left', 16)}</button>
    {/if}
    {@render item('home', 'Home', 'house')}
    {@render item('inbox', 'Inbox', 'inbox', { count: unreadInbox || '', dot: true })}
    {@render item('mytasks', 'My Tasks', 'circle-check', { count: myOpen || '' })}
    {@render item('favorites', 'Favorites', 'star')}
    {@render item('notifications', 'Notifications', 'bell', { count: unreadAll || '' })}
    <div class="sgroup">
      <div class="sgroup-h">Workspace</div>
      {@render item('overview', 'Overview', 'layout-dashboard')}
      {@render item('projects', 'Projects', 'folder-kanban')}
      {@render item('tasks', 'Tasks', 'list-checks')}
      {@render item('calendar', 'Calendar', 'calendar')}
      {@render item('timeline', 'Timeline', 'chart-gantt')}
      {@render item('members', 'Members', 'users')}
      {@render item('activity', 'Activity', 'activity')}
    </div>
    <div class="sgroup" id="side-projects">
      <div class="sgroup-h"><span>Projects</span><span class="sp"></span><button class="ibtn ibtn-xs" onclick={() => A.newProject()} data-tip="New project  P" aria-label="New project">{@html ic('plus', 14)}</button></div>
      {#each projs as p (p.id)}
        {@const open = !!S.ui.expanded[p.id]}
        {@const on = inProj === p.id}
        <div class="sproj" data-proj-drop={p.id}>
          <div
            class="sitem {on ? 'on' : ''}"
            draggable="true"
            data-drag-proj={p.id}
            data-ctx="project"
            role="link"
            tabindex="0"
            onclick={() => go('project', { id: p.id })}
            onkeydown={(e) => navKey(e, () => go('project', { id: p.id }))}
            {...S.ui.collapsed ? { 'data-tip': p.name, 'data-tip-pos': 'right' } : {}}
          >
            <span class="pico" style="--c:{pColor(p)}" role="button" tabindex="0" onclick={(e) => { e.stopPropagation(); toggleExpand(p.id); }} onkeydown={(e) => { e.stopPropagation(); navKey(e, () => toggleExpand(p.id)); }} aria-label="Toggle sub-pages">{@html ic(p.icon, 12)}</span>
            <span class="trunc">{p.name}</span>
            {#if p.fav}<span class="fav">{@html ic('star', 11)}</span>{/if}
            {#if p.private}<span class="faint" style="margin-left:4px">{@html ic('lock', 11)}</span>{/if}
            <span class="sdot" style="background:{PSTAT[p.status].c}" title={PSTAT[p.status].name}></span>
            <span class="hov">
              <span class="ibtn ibtn-xs" role="button" tabindex="0" onclick={(e) => { e.stopPropagation(); A.ctxBtn(e.currentTarget as HTMLElement); }} onkeydown={(e) => { e.stopPropagation(); navKey(e, () => A.ctxBtn(e.currentTarget as HTMLElement)); }} data-ctx="project" aria-label="Project options">{@html ic('ellipsis', 14)}</span>
              <span class="ibtn ibtn-xs" role="button" tabindex="0" onclick={(e) => { e.stopPropagation(); toggleExpand(p.id); }} onkeydown={(e) => { e.stopPropagation(); navKey(e, () => toggleExpand(p.id)); }} aria-label="Expand">{@html ic('chevron-right', 13, 'chev ' + (open ? 'open' : ''))}</span>
            </span>
          </div>
          <div class="sub {open && !S.ui.collapsed ? 'open' : ''}">
            {#each SUB_TABS as t (t.tab)}
              <button class="sitem {on && S.ui.params.tab === t.tab ? 'on' : ''}" onclick={() => go('project', { id: p.id, tab: t.tab })}>{@html ic(t.icon, 14)}<span>{t.label}</span></button>
            {/each}
          </div>
        </div>
      {/each}
      {@render item('archive', 'Archive', 'archive', { count: archiveCount || '' })}
    </div>
    <div class="sgroup">
      <div class="sgroup-h"><span>Teams</span><span class="sp"></span><button class="ibtn ibtn-xs" onclick={() => A.newTeam()} data-tip="New team" aria-label="New team">{@html ic('plus', 14)}</button></div>
      {#each teamsList() as t (t.id)}
        {@render item('team', t.name, t.icon, { id: t.id })}
      {/each}
    </div>
  </div>
  <div class="side-bot">
    <button class="sitem" onclick={popClick(A.pop)} data-pop="help" {...S.ui.collapsed ? { 'data-tip': 'Help', 'data-tip-pos': 'right' } : ''}>{@html ic('circle-help', 16)}<span>Help &amp; resources</span></button>
    {@render item('settings', 'Settings', 'settings')}
    <button class="sitem" onclick={popClick(A.pop)} data-pop="user" style="height:36px" {...S.ui.collapsed ? { 'data-tip': 'Profile', 'data-tip-pos': 'right' } : ''}>{@html av(D().me, 'presence', false)}<span class="trunc" style="color:var(--text);font-weight:500">{S.prefs.name}</span><span class="ct">{@html ic('chevrons-up-down', 13)}</span></button>
  </div>
</nav>
