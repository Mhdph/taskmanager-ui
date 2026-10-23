import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, getIdentity } from '../api';
import { D } from '../state';
import { featureKey, pagePath, projectPath, useFeatureMutation, useProjectAccess, useResource, type Page } from '../features-api';
import {
  deliveryPath,
  deliveryPermissions,
  deliveryOutputUrl,
  eligibleReviewers,
  submitDelivery,
  reviewDelivery,
  withdrawDelivery,
  type Delivery,
  type DeliveryActor,
  type DeliveryDecision,
  type DeliveryTask,
} from '../deliveries';
import { faNumber } from '../../core/locale';
import { fmtDate } from '../../core/utils';
import { FeatureError } from './FeatureUI';

const statusLabels = { pending: 'در انتظار بررسی', approved: 'تأییدشده', changes_requested: 'ردشده؛ نیاز به اصلاح', withdrawn: 'پس‌گرفته‌شده' };
const nameOf = (id: string) => D().members.find(member => member.id === id)?.name || id;
const displayTime = (value: string) => `${fmtDate(value, true)} · ${new Date(value).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

export function DeliveryCard({ delivery, actor, task }: { delivery: Delivery; actor: DeliveryActor; task: DeliveryTask }) {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState('');
  const permissions = deliveryPermissions(actor, task, delivery);
  const mutation = useFeatureMutation(async (action: DeliveryDecision | 'withdraw') => {
    if (action === 'withdraw') await withdrawDelivery(delivery.projectId, delivery.taskId, delivery.id, note);
    else await reviewDelivery(delivery.projectId, delivery.taskId, delivery.id, action, note);
    setSaved(action === 'withdraw' ? 'تحویل پس گرفته شد.' : 'نتیجه بررسی ثبت شد.');
  });
  let outputUrl: string | null = null;
  try {
    if (delivery.outputUrl) outputUrl = deliveryOutputUrl(delivery.outputUrl);
  } catch {
    /* A malformed saved URL must never become an executable link. */
  }
  return (
    <article className="panel panel-b stack" aria-label={`نسخه ${faNumber(delivery.revision)}`}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h4 className="grow">نسخه {faNumber(delivery.revision)}</h4>
        <span className={`badge ${delivery.status === 'approved' ? 'green' : delivery.status === 'changes_requested' ? 'amber' : ''}`}>
          {statusLabels[delivery.status]}
        </span>
      </div>
      <p className="muted">
        ارسال‌کننده: {nameOf(delivery.submittedByUserId)} · بررسی‌کننده: {nameOf(delivery.reviewerUserId)}
      </p>
      <time className="faint" dateTime={delivery.submittedAt}>
        {displayTime(delivery.submittedAt)}
      </time>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{delivery.body}</p>
      {outputUrl && (
        <a className="link" href={outputUrl} target="_blank" rel="noopener noreferrer">
          مشاهده خروجی
        </a>
      )}
      {delivery.reviewedAt && (
        <p className="muted">
          {delivery.status === 'withdrawn' ? 'پس‌گرفتن' : 'بررسی'} توسط {nameOf(delivery.reviewedByUserId || delivery.submittedByUserId)} ·{' '}
          <time dateTime={delivery.reviewedAt}>{displayTime(delivery.reviewedAt)}</time>
        </p>
      )}
      {delivery.reviewNote && (
        <div>
          <b>یادداشت</b>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{delivery.reviewNote}</p>
        </div>
      )}
      {(permissions.review || permissions.withdraw) && (
        <>
          <label className="col">
            {permissions.review ? 'یادداشت بررسی (دلیل رد و درخواست اصلاح الزامی است)' : 'دلیل پس‌گرفتن (اختیاری)'}
            <textarea className="input" rows={3} maxLength={2000} value={note} disabled={mutation.isPending} onChange={e => setNote(e.target.value)} />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {permissions.review && (
              <>
                <button type="button" className="btn btn-primary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate('approved')}>
                  تأیید خروجی
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate('changes_requested')}>
                  رد و درخواست اصلاح
                </button>
              </>
            )}
            {permissions.withdraw && (
              <button type="button" className="btn btn-secondary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate('withdraw')}>
                پس‌گرفتن تحویل
              </button>
            )}
          </div>
        </>
      )}
      <FeatureError error={mutation.error} />
      {saved && <p role="status">{saved}</p>}
    </article>
  );
}

function SubmitDeliveryForm({
  projectId,
  taskId,
  actor,
  task,
  members,
  close,
}: {
  projectId: string;
  taskId: string;
  actor: DeliveryActor;
  task: DeliveryTask;
  members: { userId: string; role: string }[];
  close: () => void;
}) {
  const [body, setBody] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [url, setUrl] = useState('');
  const candidates = eligibleReviewers(members, actor, task);
  const mutation = useFeatureMutation(async () => {
    if (!candidates.some(candidate => candidate.userId === reviewer)) throw new Error('یک بررسی‌کننده مجاز انتخاب کنید.');
    await submitDelivery(projectId, taskId, reviewer, body, url);
  }, close);
  return (
    <form
      className="panel panel-b stack"
      onSubmit={e => {
        e.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <h4>ارسال نسخه جدید برای بررسی</h4>
      <fieldset disabled={mutation.isPending} className="stack" style={{ border: 0, padding: 0 }}>
        <label className="col">
          بررسی‌کننده
          <select className="input" required value={reviewer} onChange={e => setReviewer(e.target.value)}>
            <option value="">انتخاب بررسی‌کننده</option>
            {candidates.map(candidate => (
              <option key={candidate.userId} value={candidate.userId}>
                {nameOf(candidate.userId)}
              </option>
            ))}
          </select>
        </label>
        {!candidates.length && <p className="muted">عضو یا مدیر دیگری برای بررسی لازم است. ارسال‌کننده و مسئول کار نمی‌توانند خروجی خود را تأیید کنند.</p>}
        <label className="col">
          توضیح خروجی
          <textarea className="input" rows={4} required maxLength={10000} value={body} onChange={e => setBody(e.target.value)} />
        </label>
        <label className="col">
          پیوند خروجی (اختیاری)
          <input className="input" type="url" dir="ltr" maxLength={2048} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        <FeatureError error={mutation.error} />
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn btn-primary btn-sm" disabled={!candidates.length}>
            ارسال برای بررسی
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={close}>
            انصراف
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function TaskDeliveries({ projectId, taskId }: { projectId: string; taskId: string }) {
  const access = useProjectAccess(projectId);
  const task = useResource<DeliveryTask>(`${projectPath(projectId)}/tasks/${encodeURIComponent(taskId)}`, true, 15_000);
  const path = `${deliveryPath(projectId, taskId)}?limit=20`;
  const history = useInfiniteQuery({
    queryKey: featureKey(path),
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get(pagePath(path, pageParam), true)) as Page<Delivery>,
    getNextPageParam: page => page.nextCursor || undefined,
    enabled: !!getIdentity().userId,
    refetchInterval: 15_000,
    retry: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const actor: DeliveryActor = {
    userId: access.identity.data?.userId || '',
    hostedAdmin: access.identity.data?.role === 'Admin',
    role: access.members.data?.items.find(member => member.userId === access.identity.data?.userId)?.role,
  };
  const items = history.data?.pages.flatMap(page => page.items) || [];
  const pending = items.find(delivery => delivery.status === 'pending');
  const canSubmit = !!task.data && deliveryPermissions(actor, task.data).submit;
  const ready = !!task.data && !!history.data && !!access.identity.data && !!access.members.data;
  if (!getIdentity().userId)
    return (
      <section className="dsec">
        <h3>تحویل و تأیید کار</h3>
        <p className="muted">برای بررسی خروجی کار به سرور متصل شوید.</p>
      </section>
    );
  return (
    <section className="dsec stack" aria-label="تحویل و تأیید کار">
      <div className="dsec-h" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h3>تحویل و تأیید کار</h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={history.isFetching}
          onClick={() => {
            history.refetch();
            task.refetch();
            access.identity.refetch();
            access.members.refetch();
          }}
        >
          تازه‌سازی
        </button>
      </div>
      <p className="muted">فقط بررسی‌کننده انتخاب‌شده می‌تواند خروجی را تأیید یا برای اصلاح برگرداند. تأیید خروجی، وضعیت انجام کار را تغییر نمی‌دهد.</p>
      <FeatureError
        error={history.error || task.error || access.identity.error || access.members.error}
        retry={() => {
          history.refetch();
          task.refetch();
          access.identity.refetch();
          access.members.refetch();
        }}
      />
      {!ready && !history.error && !task.error && !access.identity.error && !access.members.error && <p role="status">در حال بارگذاری تحویل‌ها…</p>}
      {ready && (
        <>
          {pending ? (
            <p className="muted">یک نسخه در انتظار بررسی است؛ برای ارسال نسخه جدید، ابتدا باید بررسی یا پس گرفته شود.</p>
          ) : (
            canSubmit &&
            !submitting && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setSubmitting(true)}>
                ارسال خروجی برای بررسی
              </button>
            )
          )}
          {submitting && canSubmit && !pending && (
            <SubmitDeliveryForm
              projectId={projectId}
              taskId={taskId}
              actor={actor}
              task={task.data!}
              members={access.members.data!.items}
              close={() => setSubmitting(false)}
            />
          )}
          {!items.length && <p className="muted">هنوز خروجی‌ای برای بررسی ارسال نشده است.</p>}
          {items.map(delivery => (
            <DeliveryCard key={delivery.id} delivery={delivery} actor={actor} task={task.data!} />
          ))}
          {history.hasNextPage && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={history.isFetching} onClick={() => history.fetchNextPage()}>
              {history.isFetchingNextPage ? 'در حال بارگذاری…' : 'نسخه‌های قدیمی‌تر'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
