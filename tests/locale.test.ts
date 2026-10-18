import { describe, expect, it } from 'vitest';
import { calendarMonthKey, calendarMonthStart, fmtDate, iso, parse, setDateFormat, shiftCalendarMonth } from '../src/core/utils';
import { displayLabel } from '../src/core/locale';

describe('Persian calendar with stable API dates', () => {
  it('formats Nowruz in Persian without changing ISO storage dates', () => {
    const date = parse('2026-03-21')!;
    setDateFormat('yyyy-MM-dd');
    expect(fmtDate(date)).toBe('۱۴۰۵/۰۱/۰۱');
    expect(iso(date)).toBe('2026-03-21');
    setDateFormat('MMM d');
  });
  it('navigates across Esfand and leap-year boundaries', () => {
    expect(iso(shiftCalendarMonth(parse('2025-03-20')!, 1))).toBe('2025-03-21');
    expect(iso(shiftCalendarMonth(parse('2025-03-21')!, -1))).toBe('2025-02-19');
    expect(iso(shiftCalendarMonth(parse('2026-03-20')!, 1))).toBe('2026-03-21');
  });
  it('starts the visible month on its Persian first day', () => {
    const date = parse('2026-10-18')!;
    expect(calendarMonthKey(date)).toBe('1405-7');
    expect(iso(calendarMonthStart(date))).toBe('2026-09-23');
  });
  it('translates protocol labels without changing user content', () => {
    expect(displayLabel('Owner')).toBe('مالک');
    expect(displayLabel('Weekly')).toBe('هفتگی');
    expect(displayLabel('Custom project name')).toBe('Custom project name');
  });
});
