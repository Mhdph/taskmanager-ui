import { faNumber } from './locale';
/* =====================================================================
   QUIRE — core: utils, icons, seed data, store, render loop, events
   ===================================================================== */
// Web fonts load without blocking first paint (the link starts as media=print).
// Guarded: this module is also imported during TanStack Start builds/SSR.
if (typeof document !== 'undefined') {
  document.querySelectorAll<HTMLLinkElement>('link[data-font]').forEach(l => {
    l.media = 'all';
  });
}
/* `$` intentionally returns `any`: call sites query inputs, selects,
   textareas and plain containers alike. Use `$$<T>()` or explicit casts
   where element-specific props matter. */
export const $ = (s: string, r: ParentNode = document): any => r.querySelector(s);
export const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document): T[] => [...r.querySelectorAll(s)] as T[];
/** Null-safe typed `closest()` for delegated event targets. */
export const closestEl = (t: EventTarget | null | undefined, sel: string): HTMLElement | null =>
  (t as HTMLElement | null)?.closest?.(sel) as HTMLElement | null;
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? '⌘' : 'Ctrl';

/* ---------- dates ---------- */
export const DAY = 864e5;
export const sod = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const TODAY = sod(new Date());
export const iso = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const parse = s => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addD = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dOff = n => iso(addD(TODAY, n));
export const diffD = (a: Date | null, b: Date | null) => (a && b ? Math.round((sod(a).getTime() - sod(b).getTime()) / DAY) : NaN);
export const MON = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
export const MONL = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
export const WD = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
export const WDL = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
/* Set from preferences on every render (core/theme.js), so utils never depends on the store. */
export let dateFormat = 'MMM d';
export function setDateFormat(f) {
  dateFormat = f || 'MMM d';
}
const persianParts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
export function calendarParts(date: Date) {
  const parts = Object.fromEntries(persianParts.formatToParts(date).map(p => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}
export const calendarDay = (date: Date) => new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(date);
export const calendarMonth = (date: Date) => new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(date);
export const calendarMonthKey = (date: Date) => {
  const p = calendarParts(date);
  return `${p.year}-${p.month}`;
};
export const calendarMonthStart = (date: Date) => addD(sod(date), 1 - calendarParts(date).day);
/** Move by Persian months while keeping API/date-input values as Gregorian ISO dates. */
export function shiftCalendarMonth(date: Date, delta: number) {
  let start = calendarMonthStart(date);
  for (let i = 0; i < Math.abs(delta); i++) {
    start = delta > 0 ? calendarMonthStart(addD(start, 32)) : calendarMonthStart(addD(start, -1));
  }
  return start;
}
export function fmtDate(s: string | Date | null | undefined, long?: boolean) {
  const d = typeof s === 'string' ? parse(s) : s;
  if (!d || Number.isNaN(d.getTime())) return '';
  const fmt = dateFormat;
  const numeric = ['d/M', 'M/d', 'yyyy-MM-dd'].includes(fmt);
  const parts = calendarParts(d);
  const year = long || parts.year !== calendarParts(TODAY).year || fmt === 'yyyy-MM-dd';
  if (numeric) {
    const n = (v: number) => new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(v);
    if (fmt === 'yyyy-MM-dd') return `${n(parts.year)}/${n(parts.month).padStart(2, '۰')}/${n(parts.day).padStart(2, '۰')}`;
    return (fmt === 'M/d' ? `${n(parts.month)}/${n(parts.day)}` : `${n(parts.day)}/${n(parts.month)}`) + (year ? `/${n(parts.year)}` : '');
  }
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}) }).format(d);
}
export function relDate(s) {
  if (!s) return '';
  const n = diffD(parse(s), TODAY);
  if (n === 0) return 'امروز';
  if (n === 1) return 'فردا';
  if (n === -1) return 'دیروز';
  if (n > 1 && n < 7) return WD[parse(s)!.getDay()];
  return fmtDate(s);
}
export function ago(ts) {
  const m = Math.round((Date.now() - ts) / 6e4);
  if (m < 1) return 'همین حالا';
  if (m < 60) return faNumber(m) + ' دقیقه پیش';
  const h = Math.round(m / 60);
  if (h < 24) return faNumber(h) + ' ساعت پیش';
  const d = Math.round(h / 24);
  if (d < 7) return faNumber(d) + ' روز پیش';
  return fmtDate(iso(new Date(ts)));
}
export const minsAgo = m => Date.now() - m * 6e4;
export function dayBucket(ts) {
  const n = diffD(new Date(ts), TODAY);
  if (n === 0) return 'امروز';
  if (n === -1) return 'دیروز';
  if (n > -7) return 'این هفته';
  return 'قدیمی‌تر';
}
