<script lang="ts">
  import { D, S } from '../../core/store';
  import { ic } from '../../core/icons';
  import { go } from '#lib/router.js';
  import { A } from '../../actions/actions';

  let unread = $derived(D().notifs.some(n => !n.read && n.type !== 'update'));

  interface Tab {
    route: string;
    label: string;
    icon: string;
  }

  const TABS: Tab[] = [
    { route: 'home', label: 'Home', icon: 'house' },
    { route: 'mytasks', label: 'My Tasks', icon: 'circle-check' },
    { route: 'projects', label: 'Projects', icon: 'folder-kanban' },
    { route: 'inbox', label: 'Inbox', icon: 'inbox' },
  ];
</script>

<nav class="bottomnav" aria-label="Primary">
  {#each TABS as t (t.route)}
    <button class={S.ui.route === t.route ? 'on' : ''} onclick={() => go(t.route)}>
      {@html ic(t.icon, 19)}<span>{t.label}</span>{#if t.route === 'inbox' && unread}<span class="bdot"></span>{/if}
    </button>
  {/each}
  <button onclick={() => A.openMnav()}>{@html ic('ellipsis', 19)}<span>More</span></button>
</nav>
