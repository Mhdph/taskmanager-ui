/* =====================================================================
   EVENT WIRING
   ===================================================================== */
import { $$, closestEl } from '../core/utils';
import { S } from '../core/store';
import { render } from '../shell/render';
import { A, BLUR, DBL, IN } from './actions';
/* SSR_GUARD: TanStack Start may import this module during builds; DOM listeners attach in browsers only. */
const SSR_GUARD = typeof document !== 'undefined';

SSR_GUARD &&
  document.addEventListener(
    'click',
    e => {
      if (S.ui.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const el = closestEl(e.target, '[data-a]');
      const inPop = closestEl(e.target, '[data-pop-root]');
      if (S.ui.pop && !inPop) {
        const trig = el && (el.dataset.a === 'pop' || el.dataset.a === 'ctxBtn' || el.dataset.a === 'addFilter');
        if (!trig) {
          S.ui.pop = null;
          if (!el) {
            render();
            return;
          }
        }
      }
      if (S.ui.mention && !closestEl(e.target, '.cbox') && !(el && el.dataset.a === 'pickMention')) {
        S.ui.mention = null;
        if (!el) render();
      }
      if (!el) return;
      if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox' && el.dataset.a)) e.preventDefault();
      const fn = A[el.dataset.a || ''];
      if (fn) {
        e.stopPropagation();
        fn(el, e);
      }
    },
    false,
  );
SSR_GUARD &&
  document.addEventListener('dblclick', e => {
    const el = closestEl(e.target, '[data-dbl]');
    if (el && DBL[el.dataset.dbl || '']) DBL[el.dataset.dbl || ''](el, e);
  });
SSR_GUARD &&
  document.addEventListener('contextmenu', e => {
    const el = closestEl(e.target, '[data-ctx]');
    if (!el || closestEl(e.target, 'input,textarea,[contenteditable]')) return;
    e.preventDefault();
    S.ui.pop = { type: 'ctx', ctx: el.dataset.ctx, id: el.dataset.id, key: el.dataset.key, vid: el.dataset.vid, x: e.clientX, y: e.clientY, top: e.clientY };
    if (el.dataset.ctx === 'column') S.ui.pop.key = el.dataset.key;
    render();
  });
export const isChangeEl = el => el.matches('select, input[type=checkbox], input[type=radio], input[type=file], input[type=date]');
SSR_GUARD &&
  document.addEventListener('input', e => {
    const el = e.target as HTMLElement;
    if (!el.dataset || !el.dataset.in || isChangeEl(el)) return;
    IN[el.dataset.in]?.(el, e);
  });
SSR_GUARD &&
  document.addEventListener('change', e => {
    const el = e.target as HTMLElement;
    if (!el.dataset || !el.dataset.in || !isChangeEl(el)) return;
    IN[el.dataset.in]?.(el, e);
  });
SSR_GUARD &&
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target as HTMLElement;
    const n = f.dataset.submit;
    if (n && A[n]) A[n](f, e);
  });
SSR_GUARD &&
  document.addEventListener('focusout', e => {
    const el = e.target as HTMLElement;
    if (el?.dataset?.blur && BLUR[el.dataset.blur]) BLUR[el.dataset.blur](el);
  });
SSR_GUARD &&
  document.addEventListener('mouseover', e => {
    const el = closestEl(e.target, '[data-hover-i]');
    if (!el || !S.ui.palette) return;
    const i = Number(el.dataset.hoverI);
    if (S.ui.palette.hl === i) return;
    S.ui.palette.hl = i;
    $$('.pi.hl').forEach(x => x.classList.remove('hl'));
    el.classList.add('hl');
  });
SSR_GUARD &&
  addEventListener('resize', () => {
    if (S.ui.pop) {
      S.ui.pop = null;
      render();
    }
  });
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (S.prefs.theme === 'system') render();
  });
} catch {
  /* not supported here; safe to skip */
}
