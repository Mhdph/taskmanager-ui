<script>
  import '../styles/index.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { S } from '#lib/state.svelte';
  import { tick } from '#lib/tick.svelte';
  import { syncRouteToStore } from '#lib/router';
  import { applyPrefs } from '../core/theme';
  import { pageTitle, makeFocusable, focusKey, tryFocus, countUp } from '../shell/render';
  import { ic } from '../core/icons';
  import Sidebar from '#lib/components/Sidebar.svelte';
  import Topbar from '#lib/components/Topbar.svelte';
  import BottomNav from '#lib/components/BottomNav.svelte';
  import OverlayLayer from '#lib/components/OverlayLayer.svelte';
  import AuthView from '#lib/components/AuthView.svelte';

  let { children } = $props();

  // Legacy action/event wiring (data-a delegation, keyboard shortcuts,
  // drag & drop, custom selects). Modules are SSR-guarded; they attach
  // listeners on import. Static imports keep the action tables (A/IN/KEY)
  // in the client bundle next to the templates that reference them.
  import '../actions/actions';
  import '../actions/events';
  import '../actions/keyboard';
  import '../actions/drag-drop';
  import '../actions/teams';
  import '../actions/subtasks';
  import '../actions/archive';
  import { enhanceSelects } from '../ui/select';
  import { placePop } from '../overlays/popovers';
  import { tlAfter } from '../views/timeline';
  import { skeleton } from '../shell/skeletons';

  let title = $derived(pageTitle());
  // Auth takeover shows for auth URLs even before the route script's
  // `S.ui.auth` write settles (child setup runs inside the first render).
  const AUTH_ROUTES = ['login', 'signup', 'forgot', 'reset', 'verify', 'onboarding'];
  let pathSeg = $derived(page.url.pathname.split('/').filter(Boolean)[0] || '');
  let showAuth = $derived(S.ui.auth || AUTH_ROUTES.includes(pathSeg));
  // Seed auth from the URL before first render: route scripts run inside
  // the first render (too late for the takeover branch above), and without
  // this `renderAuth()` sees `auth: null` and renders nothing.
  if (typeof window !== 'undefined' && !S.ui.auth && AUTH_ROUTES.includes(page.url.pathname.split('/').filter(Boolean)[0] || '')) {
    S.ui.auth = page.url.pathname.split('/').filter(Boolean)[0];
  }
  let shellClass = $derived(`shell ${S.ui.collapsed ? 'collapsed' : ''} ${S.ui.mnav ? 'mnav' : ''} ${S.ui.fx.tabs ? 'fx-tabs' : ''}`);
  let contentClass = $derived(`content ${S.ui.fx.route ? 'fx-route' : ''}`);

  // URL -> store sync (deep links, back/forward). Runs on every navigation.
  $effect(() => {
    const url = page.url;
    syncRouteToStore(url.pathname, url.searchParams);
    applyPrefs();
  });

  // Focus preservation across reactive re-renders.
  let pendingFocus = null;
  $effect.pre(() => {
    tick.n;
    if (typeof document === 'undefined') return;
    pendingFocus = focusKey(document.activeElement);
  });

  // Post-render enhancements after every state change.
  let lastPath = '';
  $effect(() => {
    tick.n;
    const url = page.url;
    const isRouteChange = url.pathname + url.search !== lastPath;
    lastPath = url.pathname + url.search;
    if (typeof document === 'undefined') return;
    makeFocusable();
    enhanceSelects();
    placePop();
    for (const el of document.querySelectorAll('textarea[data-autosize]')) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
    if ((S.ui.route === 'project' && S.ui.params.tab === 'timeline') || S.ui.route === 'timeline') tlAfter();
    const pal = document.getElementById('pal-in');
    if (pal && document.activeElement !== pal && !S.ui.pop) pal.focus();
    if (S.ui.fx.route) countUp();
    if (isRouteChange) {
      const c = document.querySelector('.content');
      if (c) c.scrollTop = 0;
    }
    // Restore focus if the focused node was replaced.
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lost && pendingFocus) {
      tryFocus(pendingFocus);
      pendingFocus = null;
    }
    // Clear one-shot motion flags after paint so they never replay.
    if (Object.keys(S.ui.fx).length) {
      requestAnimationFrame(() => {
        S.ui.fx = {};
      });
    }
  });

  onMount(() => {
    applyPrefs();
    document.documentElement.lang = 'en';
    if (!document.getElementById('sr-live')) {
      const l = document.createElement('div');
      l.id = 'sr-live';
      l.className = 'sr';
      l.setAttribute('aria-live', 'polite');
      document.body.appendChild(l);
    }
    // Expose the same dev handle the vanilla entry point provided.
    if (import.meta.env.DEV) {
      import('../actions/actions').then(m => {
        import('#lib/router').then(r => {
          window.__gr8r = { S, A: m.A, go: r.go, render: () => tick.n++ };
        });
      });
    }
  });
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<button class="skip" data-a="skipToContent">Skip to content</button>
{#if showAuth}
  <AuthView />
{:else}
  <div class={shellClass}>
    <Sidebar />
    {#if S.ui.mnav}<div class="side-scrim" data-a="closeMnav"></div>{/if}
    <main class="main" id="main">
      <Topbar />
      {#if S.ui.offline}
        <div class="offline-bar" role="alert">
          {@html ic('wifi-off', 15)}<span><b>You're offline.</b> Changes won't be saved until your connection is back.</span><span class="sp"></span><button
            class="btn btn-sm btn-secondary"
            data-a="retryOnline">Try again</button>
        </div>
      {/if}
      <div class={contentClass} id="main-content" tabindex="-1">
        {#if S.ui.loading}
          {@html skeleton()}
        {:else}
          {@render children()}
        {/if}
      </div>
    </main>
    <BottomNav />
  </div>
{/if}
<OverlayLayer />
<div id="toasts" aria-live="polite"></div>
