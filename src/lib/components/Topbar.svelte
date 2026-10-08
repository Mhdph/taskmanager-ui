<script lang="ts">
  import { MOD } from '../../core/utils';
  import { ic } from '../../core/icons';
  import { D, S, mem, pColor, proj, team } from '../../core/store';
  import { av } from '../../ui/helpers';
  import { ROUTE_NAMES, go } from '#lib/router.js';
  import { A } from '../../actions/actions';
  import { popClick } from '#lib/events.js';

  let unread = $derived(D().notifs.some(n => !n.read && n.type !== 'update'));
</script>

<header class="topbar">
  <button class="ibtn" onclick={() => A.openMnav()} aria-label="Open navigation" style="display:none" id="mnav-btn">{@html ic('menu', 17)}</button>
  <style>@media(max-width:900px){#mnav-btn{display:inline-flex!important}}</style>
  <nav class="crumbs trunc" aria-label="Breadcrumb">
    {#if S.ui.route === 'project'}
      <button onclick={() => go('projects')}>Projects</button><span class="sep">/</span>
      {#if proj(S.ui.params.id)}
        {@const p = proj(S.ui.params.id)!}
        <button class="cur" onclick={() => go('project', { id: p.id, tab: 'overview' })}><span class="pico" style="--c:{pColor(p)};width:16px;height:16px;border-radius:4px;display:grid;place-items:center;color:{pColor(p)}">{@html ic(p.icon, 11)}</span>{p.name}</button>
      {/if}
    {:else if S.ui.route === 'member'}
      <button onclick={() => go('members')}>Members</button><span class="sep">/</span>
      <button class="cur">{mem(S.ui.params.id)?.name || 'Member'}</button>
    {:else if S.ui.route === 'team'}
      <button onclick={() => go('teams')}>Teams</button><span class="sep">/</span>
      <button class="cur">{team(S.ui.params.id)?.name || 'Team'}</button>
    {:else if S.ui.route === 'settings'}
      <button class="cur">Settings</button>
    {:else}
      <button class="cur">{ROUTE_NAMES[S.ui.route] || 'Not found'}</button>
    {/if}
  </nav>
  <span class="sp"></span>
  <button class="topsearch" onclick={() => A.openPalette()} aria-label="Search and commands">{@html ic('search', 14)}<span class="lbltxt">Search or jump to…</span><span class="kbd">{MOD}K</span></button>
  <button class="ibtn" onclick={() => go('notifications')} data-tip="Notifications" aria-label="Notifications">
    {@html ic('bell', 16)}{#if unread}<span style="position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--surface)"></span>{/if}
  </button>
  <button class="btn btn-secondary btn-sm" onclick={popClick(A.pop)} data-pop="create" aria-haspopup="menu" aria-label="Create new">{@html ic('plus', 14)}<span class="hide-m">New</span>{@html ic('chevron-down', 12, 'hide-m')}</button>
  <button class="ibtn hide-m" onclick={popClick(A.pop)} data-pop="user" aria-label="Account menu" style="width:auto;padding:0 2px">{@html av(D().me, 'md', false)}</button>
</header>
