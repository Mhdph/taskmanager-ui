/* ---------- theme ---------- */
import { setDateFormat } from './utils';
import { S } from './store';

export function applyPrefs() {
  if (typeof document === 'undefined') return;
  const r = document.documentElement,
    p = S.prefs;
  setDateFormat(p.dateFmt);
  if (p.theme === 'system') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', p.theme);
  if (p.accent === 'indigo') r.removeAttribute('data-accent');
  else r.setAttribute('data-accent', p.accent);
  r.setAttribute('data-side', p.side);
  r.setAttribute('data-density', p.density);
  if (p.motion === 'reduce') r.setAttribute('data-motion', 'reduce');
  else r.removeAttribute('data-motion');
}
export function effectiveDark() {
  if (S.prefs.theme === 'dark') return true;
  if (S.prefs.theme === 'light') return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
