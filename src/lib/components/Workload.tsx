import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, apiQueryKey, getIdentity } from '../api';
import { D, me } from '../state';
import { capacityInput, capacityPath, getWorkload, workloadPath, type Capacity, type WorkloadMember } from '../workload';
import { faNumber } from '../../core/locale';
import { fmtDate } from '../../core/utils';

const hours = (seconds: number | null) => (seconds === null ? 'تنظیم نشده' : `${faNumber(Math.round(seconds / 36) / 100)} ساعت`);
const errorText = (error: Error) => (error instanceof ApiError && error.status === 403 ? 'شما به این اطلاعات دسترسی ندارید.' : error.message);
const weekdays = [
  [6, 'شنبه'],
  [7, 'یکشنبه'],
  [1, 'دوشنبه'],
  [2, 'سه‌شنبه'],
  [3, 'چهارشنبه'],
  [4, 'پنجشنبه'],
  [5, 'جمعه'],
] as const;

function CapacityEditor({ capacity, onClose }: { capacity: Capacity; onClose: () => void }) {
  const [dailyHours, setHours] = useState(capacity.dailyCapacitySeconds === null ? '' : String(capacity.dailyCapacitySeconds / 3600));
  const [days, setDays] = useState(capacity.workingDays || []);
  const [timezone, setTimezone] = useState(capacity.timezone || 'Asia/Tehran');
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (clear: boolean) => {
      if (clear) await api.del(capacityPath(capacity.userId));
      else await api.put(capacityPath(capacity.userId), capacityInput(dailyHours, days, timezone));
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['workload', ...apiQueryKey()] });
      onClose();
    },
  });
  return (
    <form
      className="panel-b stack"
      onSubmit={event => {
        event.preventDefault();
        if (!mutation.isPending) mutation.mutate(false);
      }}
    >
      <fieldset disabled={mutation.isPending} style={{ border: 0, padding: 0 }}>
        <legend>تنظیم ظرفیت کاری</legend>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBlock: 12 }}>
          <label className="col">
            ساعت روزانه
            <input className="input" type="number" min="0" max="24" step="any" required value={dailyHours} onChange={e => setHours(e.target.value)} />
          </label>
          <label className="col">
            منطقه زمانی (IANA)
            <input className="input" dir="ltr" required value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Tehran" />
          </label>
        </div>
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>روزهای کاری</legend>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginBlock: 12 }}>
            {weekdays.map(([day, name]) => (
              <label key={day} className="row">
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  onChange={e => setDays(e.target.checked ? [...days, day] : days.filter(value => value !== day))}
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="muted">صفر ساعت یا بدون روز کاری یعنی عدم دسترسی؛ پاک کردن تنظیم یعنی ظرفیت نامشخص.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            {mutation.isPending ? 'در حال ذخیره…' : 'ذخیره ظرفیت'}
          </button>
          {capacity.configured && (
            <button type="button" className="btn btn-secondary" onClick={() => mutation.mutate(true)}>
              پاک کردن تنظیم ظرفیت
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            انصراف
          </button>
        </div>
      </fieldset>
      {mutation.error && <p role="alert">{errorText(mutation.error)}</p>}
    </form>
  );
}

export function WorkloadCard({ member, manager }: { member: WorkloadMember; manager: boolean }) {
  const [editing, setEditing] = useState(false);
  const profile = D().members.find(value => value.id === member.userId);
  return (
    <section className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-h" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2>{profile?.name || `${member.firstName} ${member.lastName}`.trim() || member.userId}</h2>
        <span className="muted">{member.timezone}</span>
        {manager && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
            تنظیم ظرفیت
          </button>
        )}
      </div>
      <div className="panel-b">
        <p>
          {member.capacity.configured
            ? `${hours(member.capacity.dailyCapacitySeconds)} در روز · ${
                weekdays
                  .filter(([day]) => member.capacity.workingDays?.includes(day))
                  .map(([, name]) => name)
                  .join('، ') || 'بدون روز کاری'
              }`
            : 'ظرفیت تنظیم نشده است.'}
        </p>
        <div className="stats" style={{ marginBlock: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[
            ['ظرفیت بازه', hours(member.totals.capacitySeconds)],
            ['کار برنامه‌ریزی‌شده', hours(member.totals.plannedSeconds)],
            ['ظرفیت خالی', hours(member.totals.availableSeconds)],
            ['اضافه‌بار', hours(member.totals.overloadSeconds)],
            ['استفاده از ظرفیت', member.totals.utilizationPercent === null ? '—' : `${faNumber(Math.round(member.totals.utilizationPercent))}٪`],
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <span className="k">{label}</span>
              <span className="v" style={{ fontSize: 18 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
        <p className="muted">
          {faNumber(member.openTaskCount)} کار باز · {faNumber(member.unestimatedTaskCount)} بدون برآورد · {faNumber(member.unscheduledTaskCount)} بدون
          زمان‌بندی ({hours(member.unscheduledSeconds)}) · {faNumber(member.overdueTaskCount)} عقب‌افتاده ({hours(member.overdueSeconds)})
        </p>
      </div>
      {editing && <CapacityEditor capacity={member.capacity} onClose={() => setEditing(false)} />}
      <details>
        <summary style={{ padding: '12px 16px', cursor: 'pointer' }}>جزئیات روزانه</summary>
        <div style={{ overflowX: 'auto' }}>
          <table className="perm-t" style={{ minWidth: 640, width: '100%' }}>
            <caption className="sr">بار کار روزانه</caption>
            <thead>
              <tr>
                {['روز', 'ظرفیت', 'برنامه‌ریزی‌شده', 'خالی', 'اضافه‌بار', 'استفاده', 'تعداد کار'].map(label => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {member.days.map(day => (
                <tr key={day.date} style={day.overloadSeconds ? { color: 'var(--red)' } : undefined}>
                  <th scope="row">{fmtDate(day.date, true)}</th>
                  <td>{hours(day.capacitySeconds)}</td>
                  <td>{hours(day.plannedSeconds)}</td>
                  <td>{hours(day.availableSeconds)}</td>
                  <td>{hours(day.overloadSeconds)}</td>
                  <td>{day.utilizationPercent === null ? '—' : `${faNumber(Math.round(day.utilizationPercent))}٪`}</td>
                  <td>{faNumber(day.taskCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function Workload({ userId }: { userId?: string }) {
  const client = useQueryClient();
  const demo = !getIdentity().userId;
  const identity = useQuery({ queryKey: ['workload-identity', ...apiQueryKey()], queryFn: () => api.get('/me'), enabled: !demo, retry: false });
  const manager = ['Owner', 'Admin'].includes(me()?.role) || identity.data?.role === 'Admin' || identity.data?.isSupport === true;
  const target = userId || (manager ? undefined : identity.data?.userId);
  const allowed = manager || target === identity.data?.userId;
  const [range, setRange] = useState(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    return { from: today, to: end.toISOString().slice(0, 10) };
  });
  const [draft, setDraft] = useState(range);
  const [validation, setValidation] = useState('');
  const report = useInfiniteQuery({
    queryKey: ['workload', ...apiQueryKey(), target || '', range.from, range.to],
    initialPageParam: '',
    queryFn: ({ pageParam }) => getWorkload(workloadPath(range.from, range.to, target, pageParam)),
    getNextPageParam: page => page.nextCursor || undefined,
    enabled: !demo && !!identity.data && allowed,
    retry: false,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: apiQueryKey() });
    await report.refetch();
  };
  if (demo)
    return (
      <div className="page">
        <p className="muted">برای مشاهده ظرفیت و بار کار به سرور متصل شوید.</p>
      </div>
    );
  return (
    <div className="page wide stack" style={{ maxWidth: 1200 }}>
      <h2>ظرفیت و بار کار</h2>
      <p className="muted">
        ظرفیت خالی فقط کارهای برآوردشده و زمان‌بندی‌شده را در نظر می‌گیرد؛ کارهای بدون برآورد، بدون زمان‌بندی و عقب‌افتاده را هم بررسی کنید.
      </p>
      <form
        className="row"
        style={{ gap: 12, flexWrap: 'wrap' }}
        onSubmit={e => {
          e.preventDefault();
          try {
            workloadPath(draft.from, draft.to, target);
            setValidation('');
            setRange({ ...draft });
          } catch (error) {
            setValidation((error as Error).message);
          }
        }}
      >
        <label className="col">
          از تاریخ
          <input className="input" type="date" required value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} />
        </label>
        <label className="col">
          تا تاریخ
          <input className="input" type="date" required value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} />
        </label>
        <button className="btn btn-primary" type="submit">
          نمایش گزارش
        </button>
        <button className="btn btn-secondary" type="button" disabled={!allowed || !identity.data || report.isFetching} onClick={refresh}>
          تازه‌سازی
        </button>
      </form>
      {validation && <p role="alert">{validation}</p>}
      {identity.isPending ? (
        <p role="status">در حال بررسی دسترسی…</p>
      ) : identity.error ? (
        <p role="alert">
          {errorText(identity.error)}{' '}
          <button type="button" className="btn btn-secondary" onClick={() => identity.refetch()}>
            تلاش دوباره
          </button>
        </p>
      ) : !allowed ? (
        <p>مشاهده ظرفیت این عضو فقط برای خود او و مدیر فضای کاری مجاز است.</p>
      ) : (
        <>
          {report.isPending && <p role="status">در حال بارگذاری گزارش…</p>}
          {report.error && (
            <p role="alert">
              {errorText(report.error)}{' '}
              <button type="button" className="btn btn-secondary" onClick={refresh}>
                تلاش دوباره
              </button>
            </p>
          )}
          {report.data && (
            <>
              <p className="muted">
                {fmtDate(range.from, true)} تا {fmtDate(range.to, true)} ·{' '}
                {report.data.pages[0].scope === 'workspace' ? 'همه پروژه‌های فعال فضای کاری' : 'فقط پروژه‌های قابل دسترسی شما'}
              </p>
              {report.data.pages
                .flatMap(page => page.items)
                .map(member => (
                  <WorkloadCard key={member.userId} member={member} manager={manager} />
                ))}
              {!report.data.pages.some(page => page.items.length) && <p>عضو فعالی برای این گزارش وجود ندارد.</p>}
              {report.hasNextPage && (
                <button type="button" className="btn btn-secondary" disabled={report.isFetching} onClick={() => report.fetchNextPage()}>
                  {report.isFetchingNextPage ? 'در حال بارگذاری…' : 'اعضای بیشتر'}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
