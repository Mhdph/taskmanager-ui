/* ---------- icons: inlined Lucide subset (src/00-icons.js), rendered to inline svg ---------- */
import { ICONS } from 'virtual:icons';
import { esc } from './utils';

export const _icCache: Record<string, any> = {};
export function ic(name, size = 16, cls = '') {
  if (['chevron-left', 'chevron-right', 'arrow-left', 'arrow-right', 'arrow-up-right', 'panel-left', 'panel-right', 'log-out'].includes(name))
    cls = (cls + ' rtl-flip').trim();
  const k = name + '|' + size + '|' + cls;
  if (_icCache[k]) return _icCache[k];
  const inner = ICONS[name] || '<rect x="5" y="5" width="14" height="14" rx="3"/>';
  return (_icCache[k] =
    `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`);
}
/* Persian identity shared by authentication and workspace surfaces. */
export const LOGO = (h = 22) => `<span class="hamkar-wordmark" style="font-size:${h}px">${MARK(h + 8)}<b>هم‌کار</b></span>`;
export const MARK = (px = 22) =>
  `<svg width="${px}" height="${px}" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#7352d6"/><path d="m11 15 9-5 9 5-9 5-9-5Zm0 6 9 5 9-5M11 27l9 5 9-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export function wsLogo(w, px = 22) {
  return w && w.brand
    ? `<span class="ws-logo brand" style="width:${px}px;height:${px}px">${MARK(px)}</span>`
    : `<span class="ws-logo" style="--c:${w.c};width:${px}px;height:${px}px;font-size:${Math.max(9, Math.round(px * 0.46))}px">${esc(w.name[0])}</span>`;
}
