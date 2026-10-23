import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { capacityInput, capacityPath, workloadPath, type WorkloadMember } from '../src/lib/workload';
import { WorkloadCard } from '../src/lib/components/Workload';

vi.mock('../src/lib/state', () => ({ D: () => ({ members: [] }), me: () => ({ role: 'Member' }) }));
afterEach(() => vi.restoreAllMocks());

describe('workload API contract', () => {
  it('encodes member IDs and opaque cursors without changing them', () => {
    expect(capacityPath('alice/a+b@host')).toBe('/members/alice%2Fa%2Bb%40host/capacity');
    const path = workloadPath('2026-10-24', '2026-10-30', undefined, 'a+/= b');
    expect(new URL(path, 'http://test').searchParams.get('cursor')).toBe('a+/= b');
    expect(workloadPath('2026-10-24', '2026-10-30', 'alice/a', 'ignored')).toBe('/members/alice%2Fa/workload?from=2026-10-24&to=2026-10-30');
  });
  it('accepts inclusive 92-day ranges and rejects invalid or longer ranges', () => {
    expect(() => workloadPath('2026-01-01', '2026-04-02')).not.toThrow();
    for (const [from, to] of [
      ['2026-01-01', '2026-04-03'],
      ['2026-02-30', '2026-03-02'],
      ['2026-10-30', '2026-10-24'],
      ['', '2026-10-24'],
    ]) {
      expect(() => workloadPath(from, to)).toThrow();
    }
  });
  it('sends seconds and ISO working days, preserving zero capacity and empty days', () => {
    expect(capacityInput('7.5', [6, 7, 1], ' Asia/Tehran ')).toEqual({ dailyCapacitySeconds: 27000, workingDays: [6, 7, 1], timezone: 'Asia/Tehran' });
    expect(capacityInput(String(13 / 3600), [], 'UTC').dailyCapacitySeconds).toBe(13);
    expect(capacityInput('0', [], 'UTC')).toEqual({ dailyCapacitySeconds: 0, workingDays: [], timezone: 'UTC' });
    for (const value of ['', ' ', '-1', '25', 'NaN', '0.00001']) expect(() => capacityInput(value, [], 'UTC')).toThrow();
    expect(() => capacityInput('8', [], 'invalid/timezone')).toThrow();
  });
});

const member: WorkloadMember = {
  userId: 'alice',
  firstName: '<Alice>',
  lastName: 'A',
  timezone: 'Asia/Tehran',
  capacity: { userId: 'alice', configured: false, dailyCapacitySeconds: null, workingDays: null, timezone: null },
  totals: { capacitySeconds: null, plannedSeconds: 3600, availableSeconds: null, overloadSeconds: null, utilizationPercent: null },
  days: [
    { date: '2026-10-24', capacitySeconds: null, plannedSeconds: 3600, availableSeconds: null, overloadSeconds: null, utilizationPercent: null, taskCount: 1 },
  ],
  openTaskCount: 4,
  unestimatedTaskCount: 1,
  unscheduledTaskCount: 1,
  unscheduledSeconds: 7200,
  overdueTaskCount: 1,
  overdueSeconds: 3600,
};
describe('workload display', () => {
  it('shows unknown capacity, planning gaps, daily details, and read-only member access', () => {
    const html = renderToStaticMarkup(createElement(WorkloadCard, { member, manager: false }));
    expect(html).toContain('ظرفیت تنظیم نشده است.');
    expect(html).toContain('بدون برآورد');
    expect(html).toContain('بدون زمان‌بندی');
    expect(html).toContain('عقب‌افتاده');
    expect(html).toContain('جزئیات روزانه');
    expect(html).not.toContain('تنظیم ظرفیت</button>');
    expect(html).toContain('&lt;Alice&gt;');
  });
  it('keeps zero capacity distinct from unset and shows overload and manager controls', () => {
    const zero: WorkloadMember = {
      ...member,
      capacity: { ...member.capacity, configured: true, dailyCapacitySeconds: 0, workingDays: [], timezone: 'UTC' },
      totals: { capacitySeconds: 0, plannedSeconds: 3600, availableSeconds: 0, overloadSeconds: 3600, utilizationPercent: null },
    };
    const html = renderToStaticMarkup(createElement(WorkloadCard, { member: zero, manager: true }));
    expect(html).not.toContain('ظرفیت تنظیم نشده است.');
    expect(html).toContain('بدون روز کاری');
    expect(html).toContain('۰ ساعت');
    expect(html).toContain('تنظیم ظرفیت</button>');
  });
});
