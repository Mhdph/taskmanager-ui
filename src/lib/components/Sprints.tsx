import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getIdentity } from '../api';
import { featureKey, useFeatureMutation, useProjectAccess, useResource } from '../features-api';
import { assignSprint, getSprints, getSprintTasks, sprintInput, sprintPath, type Sprint, type SprintReport } from '../sprints';
import { faNumber } from '../../core/locale';
import { fmtDate } from '../../core/utils';
import { estimateFromSeconds } from '../adapter';
import { FeatureError, FeaturePage } from './FeatureUI';

const states = { planned: 'برنامه‌ریزی‌شده', active: 'فعال', completed: 'تکمیل‌شده' };
const localTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
function SprintForm({ projectId, sprint, close }: { projectId: string; sprint?: Sprint; close: () => void }) {
  const [name, setName] = useState(sprint?.name || '');
  const [goal, setGoal] = useState(sprint?.goal || '');
  const [start, setStart] = useState(localTime(sprint?.plannedStartAt));
  const [end, setEnd] = useState(localTime(sprint?.plannedEndAt));
  const mutation = useFeatureMutation(async () => {
    const body = sprintInput(name, goal, start, end, sprint?.state === 'active');
    if (sprint) await api.patch(sprintPath(projectId, sprint.id), body);
    else await api.post(sprintPath(projectId), body);
  }, close);
  return (
    <form
      className="panel panel-b stack"
      onSubmit={e => {
        e.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <h3>{sprint ? 'ویرایش اسپرینت' : 'اسپرینت جدید'}</h3>
      <label className="col">
        نام
        <input className="input" required maxLength={120} value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="col">
        هدف
        <textarea className="input" maxLength={2000} value={goal} onChange={e => setGoal(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        {sprint?.state !== 'active' && (
          <label className="col">
            شروع برنامه‌ریزی‌شده
            <input className="input" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          </label>
        )}
        <label className="col">
          پایان برنامه‌ریزی‌شده
          <input className="input" type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} />
        </label>
      </div>
      <p className="muted">ساعت‌ها در منطقه زمانی دستگاه شما وارد می‌شوند.</p>
      <FeatureError error={mutation.error} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={mutation.isPending}>
          ذخیره
        </button>
        <button type="button" className="btn btn-secondary" disabled={mutation.isPending} onClick={close}>
          انصراف
        </button>
      </div>
    </form>
  );
}
function Report({ projectId, id }: { projectId: string; id: string }) {
  const report = useResource<SprintReport>(`${sprintPath(projectId, id)}/report`);
  const r = report.data;
  return (
    <div className="panel-b stack">
      <FeatureError error={report.error} retry={() => report.refetch()} />
      {report.isPending ? (
        <p role="status">در حال بارگذاری گزارش…</p>
      ) : (
        r && (
          <>
            <p>{r.frozen ? 'گزارش نهایی ثبت‌شده در زمان تکمیل' : 'گزارش زنده اسپرینت'}</p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
              {[
                ['تعهد اولیه', r.commitmentTaskCount, r.commitmentEstimatedSeconds],
                ['افزوده‌شده', r.addedTaskCount, r.addedEstimatedSeconds],
                ['خارج‌شده', r.removedTaskCount, r.removedEstimatedSeconds],
                ['تکمیل‌شده', r.completedTaskCount, r.completedEstimatedSeconds],
                ['منتقل‌شده / ناتمام', r.carryoverTaskCount, r.carryoverEstimatedSeconds],
              ].map(([label, count, seconds]) => (
                <span key={label}>
                  {label}: {faNumber(Number(count))} کار · {estimateFromSeconds(Number(seconds)) || '۰'}
                </span>
              ))}
            </div>
            <p className="muted">
              {faNumber(r.archivedTaskCount)} بایگانی‌شده · {faNumber(r.unestimatedTaskCount)} بدون برآورد
            </p>
            {r.tasks.map(task => (
              <div className="mini" key={task.taskId}>
                <button className="link grow" data-a="openTask" data-id={task.taskId}>
                  {task.title}
                </button>
                <span className="muted">{task.archived ? 'بایگانی‌شده' : task.completed ? 'تکمیل‌شده' : task.carriedOver ? 'منتقل‌شده' : 'باز'}</span>
              </div>
            ))}
          </>
        )
      )}
    </div>
  );
}
export function Sprints({ projectId }: { projectId: string }) {
  const access = useProjectAccess(projectId);
  const sprints = useQuery({
    queryKey: featureKey(`${sprintPath(projectId)}:all`),
    queryFn: () => getSprints(projectId),
    enabled: !!getIdentity().userId,
    retry: false,
  });
  const tasks = useQuery({
    queryKey: featureKey(`${sprintPath(projectId)}:tasks`),
    queryFn: () => getSprintTasks(projectId),
    enabled: !!getIdentity().userId,
    retry: false,
  });
  const [form, setForm] = useState<Sprint | 'new' | null>(null);
  const [selected, setSelected] = useState('');
  const [reportId, setReport] = useState('');
  const [carryover, setCarryover] = useState('');
  const mutation = useFeatureMutation(async (action: { type: string; id: string; sprintId?: string }) => {
    const path = sprintPath(projectId, action.id);
    if (action.type === 'delete') {
      await api.del(path);
      setSelected('');
      setReport('');
    } else if (action.type === 'assign') await assignSprint(projectId, action.id, action.sprintId || null);
    else await api.post(`${path}/${action.type}`, action.type === 'complete' ? { carryoverSprintId: carryover || null } : {});
  });
  const all = sprints.data || [];
  const current = all.find(sprint => sprint.id === selected);
  const filtered = (tasks.data || []).filter(task => (task.sprintId || '') === selected && (selected || (!task.completedAt && task.statusCategory !== 'done')));
  return (
    <FeaturePage title="اسپرینت‌ها">
      <FeatureError
        error={sprints.error || tasks.error || access.identity.error || access.members.error}
        retry={() => {
          sprints.refetch();
          tasks.refetch();
          access.identity.refetch();
          access.members.refetch();
        }}
      />
      <FeatureError error={mutation.error} />
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label>
          اسپرینت{' '}
          <select
            className="input"
            value={selected}
            onChange={e => {
              setSelected(e.target.value);
              setReport('');
            }}
          >
            <option value="">بک‌لاگ</option>
            {all.map(sprint => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} · {states[sprint.state]}
              </option>
            ))}
          </select>
        </label>
        {access.manager && (
          <button className="btn btn-primary" onClick={() => setForm('new')}>
            اسپرینت جدید
          </button>
        )}
        <button
          className="btn btn-secondary"
          disabled={sprints.isFetching || tasks.isFetching}
          onClick={() => {
            sprints.refetch();
            tasks.refetch();
          }}
        >
          تازه‌سازی
        </button>
      </div>
      {form && (
        <SprintForm key={form === 'new' ? 'new' : form.id} projectId={projectId} sprint={form === 'new' ? undefined : form} close={() => setForm(null)} />
      )}
      {sprints.isPending && <p role="status">در حال بارگذاری اسپرینت‌ها…</p>}
      {current && (
        <section className="panel">
          <div className="panel-b stack">
            <h3>
              {current.name} <span className="badge">{states[current.state]}</span>
            </h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{current.goal}</p>
            <p className="muted">
              {current.plannedStartAt ? fmtDate(current.plannedStartAt, true) + ' تا ' : 'پایان: '}
              {fmtDate(current.plannedEndAt, true)}
            </p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setReport(reportId ? '' : current.id)}>
                گزارش اسپرینت
              </button>
              {access.manager && current.state !== 'completed' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setForm(current)}>
                    ویرایش
                  </button>
                  {current.state === 'planned' ? (
                    <>
                      <button
                        className="btn btn-primary"
                        disabled={mutation.isPending || all.some(sprint => sprint.state === 'active')}
                        onClick={() => mutation.mutate({ type: 'start', id: current.id })}
                      >
                        شروع اسپرینت
                      </button>
                      <button className="btn btn-secondary" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: 'delete', id: current.id })}>
                        حذف اسپرینت و بازگشت کارها به بک‌لاگ
                      </button>
                    </>
                  ) : (
                    <>
                      <label>
                        انتقال کارهای ناتمام به{' '}
                        <select className="input" value={carryover} onChange={e => setCarryover(e.target.value)}>
                          <option value="">بک‌لاگ</option>
                          {all
                            .filter(sprint => sprint.state === 'planned')
                            .map(sprint => (
                              <option key={sprint.id} value={sprint.id}>
                                {sprint.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button className="btn btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: 'complete', id: current.id })}>
                        تکمیل و انتقال کارهای ناتمام
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {reportId && <Report projectId={projectId} id={reportId} />}
        </section>
      )}
      <section className="panel">
        <div className="panel-h">
          <h3>
            {current?.name || 'بک‌لاگ'} · {faNumber(filtered.length)} کار
          </h3>
        </div>
        {tasks.isPending ? (
          <p className="panel-b" role="status">
            در حال بارگذاری کارها…
          </p>
        ) : (
          filtered.map(task => (
            <div className="mini" key={task.id} style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="link grow" style={{ textAlign: 'start' }} data-a="openTask" data-id={task.id}>
                {task.title}
              </button>
              {access.editor && !task.completedAt && task.statusCategory !== 'done' && current?.state !== 'completed' && (
                <label>
                  انتقال به{' '}
                  <select
                    className="input"
                    aria-label={`اسپرینت ${task.title}`}
                    value={task.sprintId || ''}
                    disabled={mutation.isPending}
                    onChange={e => mutation.mutate({ type: 'assign', id: task.id, sprintId: e.target.value })}
                  >
                    <option value="">بک‌لاگ</option>
                    {all
                      .filter(sprint => sprint.state !== 'completed')
                      .map(sprint => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          ))
        )}
        {!tasks.isPending && !filtered.length && <p className="panel-b muted">کاری در این فهرست نیست.</p>}
      </section>
    </FeaturePage>
  );
}
