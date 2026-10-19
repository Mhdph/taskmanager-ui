import { faNumber } from '../core/locale';
/* Shared navigation and DOM enhancements for the React workspace.
   render() notifies TanStack Store after legacy actions; Workspace applies
   enhancements after React commits the HTML view updates. */
import { browser } from '#lib/environment';
import { D, S, mem, proj, team } from '#lib/state';
import { notifyWorkspace as bump } from '#lib/state';
import { applyPrefs } from '../core/theme';
import { enhanceSelects, selectMenu } from '../ui/select';
import { PTABS } from '../pages/project';
import { tlAfter } from '../views/timeline';
import { placePop } from '../overlays/popovers';
import { go as navGo, ROUTE_NAMES, ROUTE_ICONS } from '#lib/router';

export { ROUTE_NAMES, ROUTE_ICONS };
export { renderPage } from './layout';

export function go(route, params: Record<string, any> = {}, opt: Record<string, any> = {}) {
  const same = S.ui.route === route && JSON.stringify(S.ui.params) === JSON.stringify(params);
  if (!same) fxSet(opt.tab ? { tab: true, tabs: true } : { route: true, tabs: true });
  navGo(route, params, opt);
  render();
}

/* One-shot motion flags: read by templates during the next render, then cleared. */
export const reduceMotion = () =>
  !browser || S.prefs.motion === 'reduce' || (S.prefs.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
export function fxSet(o) {
  S.ui.fx = Object.assign(S.ui.fx || {}, o);
}
export const fxc = (kind, id) => (S.ui.fx && S.ui.fx[kind] === id ? ' fx-' + kind : '');
/* Focus survives re-renders: every control is addressable by its data-* identity. */
export const FKEYS = ['a', 'id', 'r', 'tab', 'pop', 'ctx', 'k', 'v', 'sec', 'i', 'field', 'sid', 'key', 'e', 'f', 'dragCard', 'taskRow'];
export function focusKey(el) {
  if (!browser || !el || el === document.body || !el.tagName) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  const d = el.dataset || {};
  const parts = FKEYS.filter(k => d[k] != null).map(k => `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(d[k])}"]`);
  return parts.length ? el.tagName.toLowerCase() + parts.join('') : null;
}
export function tryFocus(key) {
  if (!browser || !key) return false;
  let el;
  try {
    el = document.querySelector(key);
  } catch {
    return false;
  }
  if (el && el.offsetParent !== null) {
    el.focus({ preventScroll: true });
    return document.activeElement === el;
  }
  return false;
}
export function pageTitle() {
  const u = S.ui;
  if (u.auth) return 'هم‌کار';
  let t = ROUTE_NAMES[u.route] || 'پیدا نشد';
  if (u.route === 'project' && proj(u.params.id)) t = `${(PTABS.find(x => x[0] === u.params.tab) || [0, 'نمای ذخیره‌شده'])[1]} · ${proj(u.params.id).name}`;
  if (u.route === 'member' && mem(u.params.id)) t = mem(u.params.id).name;
  if (u.route === 'team' && team(u.params.id)) t = team(u.params.id).name;
  try {
    return `${t} · ${D().ws.name}`;
  } catch {
    return t;
  }
}
/* Anything clickable is keyboard-reachable: non-native [data-a] controls get a role and a tab stop. */
export function makeFocusable(root = browser ? document : null) {
  if (!root) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-a]:not(button):not(a):not(input):not(label):not(select):not(textarea):not([tabindex])')) {
    if (el.matches('.scrim,.modal-wrap,.drawer-scrim,.side-scrim')) continue;
    el.tabIndex = 0;
    if (!el.hasAttribute('role')) el.setAttribute('role', el.dataset.a === 'go' ? 'link' : 'button');
  }
}
/** Notify React subscribers and synchronize browser preferences and title. */
export function render() {
  if (!browser) return;
  applyPrefs();
  // One-shot S.ui.fx flags are cleared post-paint by Workspace.tsx
  // (not here) so enter/count-up animations survive until first paint.
  const title = pageTitle();
  if (document.title !== title) {
    document.title = title;
    const live = document.getElementById('sr-live');
    if (live && !S.ui.loading) live.textContent = title.split(' · ').slice(0, -1).join(', ');
  }
  bump();
  afterRender();
}
export function afterRender() {
  if (!browser) return;
  // Enhancements also run centrally in Workspace's layout effect (which
  // covers renders triggered outside legacy callers). Keep this direct path
  // for legacy callers that run between effects.
  selectMenu.close();
  enhanceSelects();
  placePop();
  try {
    document.querySelectorAll('textarea[data-autosize]').forEach(autosize);
  } catch {
    /* noop */
  }
  const pal = document.getElementById('pal-in');
  if (pal && document.activeElement !== pal && !S.ui.pop) pal.focus();
  if ((S.ui.route === 'project' && S.ui.params.tab === 'timeline') || S.ui.route === 'timeline') {
    tlAfter();
  }
}
/* Headline numbers count up once when a dashboard is entered. */
export function countUp() {
  if (!browser) return;
  for (const el of document.querySelectorAll('.fx-route .stat .v')) {
    const m = el.textContent.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).match(/^(\d+)(%?)$/);
    if (!m) continue;
    const to = +m[1],
      suf = m[2];
    if (to < 2) continue;
    const t0 = performance.now(),
      dur = 520;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      if (!el.isConnected) return;
      el.textContent = faNumber(Math.round(to * e)) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '۰' + suf;
    requestAnimationFrame(step);
  }
}
export function autosize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
