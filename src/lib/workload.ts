import { api } from './api';

export interface Capacity {
  userId: string;
  configured: boolean;
  dailyCapacitySeconds: number | null;
  workingDays: number[] | null;
  timezone: string | null;
}
export interface WorkloadMetrics {
  capacitySeconds: number | null;
  plannedSeconds: number;
  availableSeconds: number | null;
  overloadSeconds: number | null;
  utilizationPercent: number | null;
}
export interface WorkloadMember {
  userId: string;
  firstName: string;
  lastName: string;
  capacity: Capacity;
  timezone: string;
  totals: WorkloadMetrics;
  days: (WorkloadMetrics & { date: string; taskCount: number })[];
  openTaskCount: number;
  unestimatedTaskCount: number;
  unscheduledTaskCount: number;
  unscheduledSeconds: number;
  overdueTaskCount: number;
  overdueSeconds: number;
}
export interface WorkloadReport {
  from: string;
  to: string;
  scope: string;
  items: WorkloadMember[];
  nextCursor: string | null;
}
export const capacityPath = (userId: string) => `/members/${encodeURIComponent(userId)}/capacity`;

export function workloadPath(from: string, to: string, userId?: string, cursor?: string) {
  const start = Date.parse(from),
    end = Date.parse(to);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end).toISOString().slice(0, 10) !== to ||
    end < start ||
    end - start >= 92 * 86400000
  ) {
    throw new Error('بازه باید معتبر و حداکثر ۹۲ روز باشد.');
  }
  const query = new URLSearchParams({ from, to });
  if (!userId) {
    query.set('limit', '50');
    if (cursor) query.set('cursor', cursor);
  }
  return `${userId ? `/members/${encodeURIComponent(userId)}/workload` : '/workload'}?${query}`;
}
export async function getWorkload(path: string): Promise<WorkloadReport> {
  return (await api.get(path)) as WorkloadReport;
}

export function capacityInput(hours: string, workingDays: number[], timezone: string) {
  const seconds = Number(hours) * 3600;
  if (!hours.trim() || !Number.isFinite(seconds) || seconds < 0 || seconds > 86400 || Math.abs(seconds - Math.round(seconds)) > 1e-6)
    throw new Error('ساعت روزانه باید بین صفر و ۲۴ و با دقت ثانیه باشد.');
  timezone = timezone.trim();
  if (!timezone || timezone === 'Local') throw new Error('منطقه زمانی معتبر وارد کنید.');
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
  } catch {
    throw new Error('منطقه زمانی معتبر وارد کنید.');
  }
  return { dailyCapacitySeconds: Math.round(seconds), workingDays, timezone };
}
