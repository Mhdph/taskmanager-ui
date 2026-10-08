/* =====================================================================
   Router: legacy route names <-> SvelteKit URLs, plus navigation.
   Legacy `go(route, params)` from `src/shell/render.js` delegates here so
   every existing `data-a="go"` handler performs real client-side
   navigation (history, deep links, back/forward) instead of in-memory swaps.
   ===================================================================== */
import { goto } from '$app/navigation';
import { S } from '#lib/state.svelte.js';
import { ensureView } from '../shell/view-engine';
import type { RouteParams } from './types';

export const ROUTE_NAMES = {
  home: 'Home',
  inbox: 'Inbox',
  mytasks: 'My Tasks',
  favorites: 'Favorites',
  notifications: 'Notifications',
  search: 'Search',
  overview: 'Overview',
  projects: 'Projects',
  tasks: 'Tasks',
  calendar: 'Calendar',
  timeline: 'Timeline',
  members: 'Members',
  member: 'Member',
  teams: 'Teams',
  team: 'Team',
  activity: 'Activity',
  settings: 'Settings',
  system: 'Design system',
  states: 'System states',
  archive: 'Archive',
};

export const ROUTE_ICONS = {
  home: 'house',
  inbox: 'inbox',
  mytasks: 'circle-check',
  favorites: 'star',
  notifications: 'bell',
  search: 'search',
  overview: 'layout-dashboard',
  projects: 'folder-kanban',
  tasks: 'list-checks',
  calendar: 'calendar',
  timeline: 'chart-gantt',
  members: 'users',
  activity: 'activity',
  teams: 'users',
  settings: 'settings',
  system: 'component',
  states: 'layers',
  archive: 'archive',
};

/** Full slug list for sidebar "more" menus, palette, etc. */
export const ROUTE_SLUGS = {
  home: '/',
  inbox: '/inbox',
  mytasks: '/my-tasks',
  favorites: '/favorites',
  notifications: '/notifications',
  search: '/search',
  overview: '/overview',
  projects: '/projects',
  tasks: '/tasks',
  calendar: '/calendar',
  timeline: '/timeline',
  members: '/members',
  activity: '/activity',
  settings: '/settings',
  system: '/system',
  states: '/states',
  archive: '/archive',
};

const SLUG_ROUTES = Object.fromEntries(Object.entries(ROUTE_SLUGS).map(([r, s]) => [s, r]));

/** Legacy route+params -> real URL. */
export function urlFor(route, params: RouteParams = {}) {
  if (route === 'project') return `/projects/${params.id}/${params.tab || 'board'}`;
  if (route === 'member') return `/members/${params.id}`;
  if (route === 'team') return `/teams/${params.id}`;
  if (route === 'teams' && params.id) return `/teams/${params.id}`;
  if (route === 'settings' && params.sec) return `/settings?sec=${encodeURIComponent(params.sec)}`;
  if (route === 'search' && (params.q || params.cat)) {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.cat) sp.set('cat', params.cat);
    const s = sp.toString();
    return s ? `/search?${s}` : '/search';
  }
  return ROUTE_SLUGS[route] || '/';
}

/**
 * Parse a URL back into `{ route, params }` and sync it into the store.
 * Called centrally from `+layout.svelte` on every navigation (covers
 * back/forward and direct loads), so individual pages stay thin.
 */
export function syncRouteToStore(pathname, searchParams) {
  const sp = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
  const seg = pathname.split('/').filter(Boolean);
  let route = 'home';
  let params: RouteParams = {};
  if (seg.length === 0) route = 'home';
  else if (seg[0] === 'projects' && seg[1]) {
    route = 'project';
    params = { id: decodeURIComponent(seg[1]), tab: seg[2] || 'board' };
  } else if (seg[0] === 'members' && seg[1]) {
    route = 'member';
    params = { id: decodeURIComponent(seg[1]) };
  } else if (seg[0] === 'teams' && seg[1]) {
    route = 'team';
    params = { id: decodeURIComponent(seg[1]) };
  } else {
    route = SLUG_ROUTES['/' + seg[0]] || 'home';
    if (route === 'home' && seg[0]) route = seg[0]; // unknown -> 404 page via layout renderPage
  }
  if (route === 'settings' && sp.get('sec')) {
    params = { sec: sp.get('sec') };
  }
  if (route === 'search') {
    params = { q: sp.get('q') || '', cat: sp.get('cat') || 'all' };
    // Legacy search page reads S.ui.searchQ/searchCat; mirror deep-link queries in.
    if (sp.has('q')) S.ui.searchQ = sp.get('q') || '';
    if (sp.has('cat')) S.ui.searchCat = sp.get('cat') || 'all';
  }
  if (S.ui.route !== route || JSON.stringify(S.ui.params) !== JSON.stringify(params)) {
    S.ui.route = route;
    S.ui.params = params;
    ensureView('tasks');
    ensureView('mytasks');
    ensureView('tl');
    ensureView('cal');
    if (route === 'project' && params.id) ensureView('p:' + params.id);
    S.ui.mnav = false;
    if (S.ui.sel?.clear) S.ui.sel.clear();
    S.ui.pop = null;
    S.ui.composer = null;
    S.ui.editCell = null;
  }
  return { route, params };
}

/**
 * Set the active legacy route from a SvelteKit page component. Called
 * synchronously in `+page.svelte` scripts so the first render already sees
 * the right route (no flash), and reactively on param changes.
 */
export function setRoute(route, params: RouteParams = {}) {
  const same = S.ui.route === route && JSON.stringify(S.ui.params) === JSON.stringify(params);
  // Assign only on change: replacing `S.ui.params` with a new (deep-equal)
  // object would churn proxy identity and loop reactive effects forever.
  if (same) return;
  S.ui.route = route;
  S.ui.params = params;
  // Seed filter/sort/group views here (script context) so `$derived`
  // page templates never mutate state to create them.
  ensureView('tasks');
  ensureView('mytasks');
  ensureView('tl');
  ensureView('cal');
  if (route === 'project' && params.id) ensureView('p:' + params.id);
  if (!same) {
    S.ui.mnav = false;
    if (S.ui.sel?.clear) S.ui.sel.clear();
    S.ui.pop = null;
    S.ui.composer = null;
    S.ui.editCell = null;
  }
}

/**
 * Legacy-compatible navigation: updates ephemeral UI state, then performs
 * real SvelteKit navigation. Falls back to in-place state sync when the
 * URL is unchanged (tab switches inside overlays, etc.).
 */
export function go(route, params: RouteParams = {}, opt: Record<string, any> = {}) {
  if (route === 'project' && !params.tab) params.tab = 'board';
  if (!opt.back) S.ui.history.push({ route: S.ui.route, params: S.ui.params });
  const same = S.ui.route === route && JSON.stringify(S.ui.params) === JSON.stringify(params);
  // Assign identity only on change (see setRoute).
  if (!same) {
    S.ui.route = route;
    S.ui.params = params;
  }
  S.ui.mnav = false;
  if (S.ui.sel?.clear) S.ui.sel.clear();
  S.ui.pop = null;
  S.ui.composer = null;
  S.ui.editCell = null;
  if (!opt.keepDrawer && S.ui.drawer && typeof innerWidth !== 'undefined' && innerWidth < 900) S.ui.drawer = null;
  S.ui.loading = false;
  const url = urlFor(route, params);
  const cur = typeof location !== 'undefined' ? location.pathname + location.search : null;
  if (cur !== url) {
    goto(url).catch(e => console.error('[gr8r] goto failed', e));
  }
  if (typeof document !== 'undefined' && !same) {
    const c = document.querySelector('.content');
    if (c) c.scrollTop = 0;
  }
}
