/* ---------- vocab ---------- */
export const STATUSES = [
  { id: 'backlog', name: 'در انتظار' },
  { id: 'todo', name: 'برای انجام' },
  { id: 'progress', name: 'در حال انجام' },
  { id: 'review', name: 'در حال بررسی' },
  { id: 'done', name: 'انجام‌شده' },
];
export const ST = Object.fromEntries(STATUSES.map(s => [s.id, s]));
export const PRIOS = [
  { id: 'urgent', name: 'فوری', w: 4 },
  { id: 'high', name: 'زیاد', w: 3 },
  { id: 'medium', name: 'متوسط', w: 2 },
  { id: 'low', name: 'کم', w: 1 },
  { id: 'none', name: 'بدون اولویت', w: 0 },
];
export const PR = Object.fromEntries(PRIOS.map(p => [p.id, p]));
export const LABELS = [
  { id: 'design', name: 'طراحی', c: 'var(--violet)' },
  { id: 'frontend', name: 'فرانت‌اند', c: 'var(--blue)' },
  { id: 'backend', name: 'بک‌اند', c: 'var(--teal)' },
  { id: 'research', name: 'پژوهش', c: 'var(--amber)' },
  { id: 'content', name: 'محتوا', c: 'var(--rose)' },
  { id: 'bug', name: 'اشکال', c: 'var(--red)' },
  { id: 'qa', name: 'تضمین کیفیت', c: 'var(--green)' },
  { id: 'growth', name: 'رشد', c: 'var(--orange)' },
];
export const LB = Object.fromEntries(LABELS.map(l => [l.id, l]));
export const PSTAT = {
  planning: { name: 'در حال برنامه‌ریزی', c: 'var(--gray)' },
  active: { name: 'در حال انجام', c: 'var(--blue)' },
  risk: { name: 'در معرض خطر', c: 'var(--red)' },
  hold: { name: 'متوقف‌شده', c: 'var(--amber)' },
  complete: { name: 'تکمیل‌شده', c: 'var(--green)' },
};
export const PCOLORS = {
  indigo: '#5A67D8',
  blue: '#3B82C4',
  violet: '#8662C9',
  teal: '#23918A',
  rose: '#C54B78',
  amber: '#C48A1E',
  green: '#3D8E5F',
  slate: '#6B7280',
};
export const PICONS = [
  'globe',
  'smartphone',
  'megaphone',
  'rocket',
  'component',
  'building-2',
  'layout-grid',
  'palette',
  'code',
  'briefcase',
  'target',
  'layers',
  'zap',
  'heart',
  'folder',
  'sparkles',
];
export const ROLES = ['Owner', 'Admin', 'Member', 'Guest'];
export const TEAMS_SEED = [
  { id: 'design', name: 'طراحی', icon: 'palette', c: '#8662C9', desc: 'طراحی محصول، برند و پژوهش' },
  { id: 'eng', name: 'مهندسی', icon: 'code', c: '#3B82C4', desc: 'مهندسی وب، موبایل و زیرساخت' },
  { id: 'mkt', name: 'بازاریابی', icon: 'megaphone', c: '#C54B78', desc: 'کمپین‌ها، محتوا و رشد' },
  { id: 'product', name: 'محصول', icon: 'target', c: '#C48A1E', desc: 'نقشه راه، برنامه‌ریزی و تضمین کیفیت' },
];
