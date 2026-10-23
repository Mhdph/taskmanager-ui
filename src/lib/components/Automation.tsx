import { useState } from 'react';
import { api } from '../api';
import { projectPath, useFeatureMutation, useProjectAccess, useResource } from '../features-api';
import { automationInput, triggerLabels, type AutomationAction, type AutomationRule, type TriggerType } from '../automation';
import { D } from '../state';
import { FeatureError, FeaturePage } from './FeatureUI';

function RuleForm({ projectId, rule, close }: { projectId: string; rule?: AutomationRule; close: () => void }) {
  const [draft, setDraft] = useState<Omit<AutomationRule, 'id'>>(
    rule
      ? { ...rule, actions: rule.actions.map(action => ({ ...action })) }
      : { name: '', triggerType: 'task_created', triggerConfig: {}, actions: [{ type: 'notify', recipients: ['assignee'] }], enabled: true },
  );
  const statuses = useResource<{ items: { id: string; name: string }[] }>(`${projectPath(projectId)}/statuses`);
  const access = useProjectAccess(projectId);
  const members = access.members.data?.items || [];
  const options = members.map(member => (
    <option key={member.userId} value={member.userId}>
      {D().members.find(m => m.id === member.userId)?.name || member.userId}
    </option>
  ));
  const updateAction = (index: number, action: AutomationAction) =>
    setDraft({ ...draft, actions: draft.actions.map((old, i) => (i === index ? action : old)) });
  const mutation = useFeatureMutation(async () => {
    const body = automationInput(draft, !!rule);
    const path = `${projectPath(projectId)}/automation-rules`;
    if (rule) await api.patch(`${path}/${encodeURIComponent(rule.id)}`, body);
    else await api.post(path, body);
  }, close);
  return (
    <form
      className="panel panel-b stack"
      onSubmit={event => {
        event.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <h3>{rule ? 'ویرایش قانون' : 'قانون جدید'}</h3>
      <fieldset disabled={mutation.isPending} className="stack" style={{ border: 0, padding: 0 }}>
        <label className="col">
          نام قانون
          <input className="input" value={draft.name} required maxLength={120} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="col">
          وقتی که
          <select
            className="input"
            disabled={!!rule}
            value={draft.triggerType}
            onChange={e => {
              const type = e.target.value as TriggerType;
              setDraft({ ...draft, triggerType: type, triggerConfig: type === 'task_due' ? { daysBefore: 1 } : {} });
            }}
          >
            {Object.entries(triggerLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {draft.triggerType === 'task_status_changed' && (
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            {(['fromStatusId', 'toStatusId'] as const).map((field, i) => (
              <label key={field}>
                {i ? 'به وضعیت' : 'از وضعیت'}
                <select
                  className="input"
                  value={draft.triggerConfig[field] || ''}
                  onChange={e => setDraft({ ...draft, triggerConfig: { ...draft.triggerConfig, [field]: e.target.value || undefined } })}
                >
                  <option value="">هر وضعیت</option>
                  {statuses.data?.items.map(status => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        {draft.triggerType === 'task_created' && (
          <label>
            مسئول اولیه
            <select
              className="input"
              value={draft.triggerConfig.hasAssignee === undefined ? '' : String(draft.triggerConfig.hasAssignee)}
              onChange={e => setDraft({ ...draft, triggerConfig: { hasAssignee: e.target.value === '' ? undefined : e.target.value === 'true' } })}
            >
              <option value="">همه کارها</option>
              <option value="true">دارای مسئول</option>
              <option value="false">بدون مسئول</option>
            </select>
          </label>
        )}
        {draft.triggerType === 'task_assigned' && (
          <label>
            واگذاری به
            <select
              className="input"
              value={draft.triggerConfig.toUserId || ''}
              onChange={e => setDraft({ ...draft, triggerConfig: { toUserId: e.target.value || undefined } })}
            >
              <option value="">هر عضو</option>
              {options}
            </select>
          </label>
        )}
        {draft.triggerType === 'task_due' && (
          <label>
            روز پیش از موعد
            <input
              className="input"
              type="number"
              required
              min={1}
              max={30}
              value={draft.triggerConfig.daysBefore ?? 1}
              onChange={e => setDraft({ ...draft, triggerConfig: { daysBefore: Number(e.target.value) } })}
            />
          </label>
        )}
        <h4>عمل‌ها به ترتیب اجرا</h4>
        {draft.actions.map((action, index) => (
          <section className="panel panel-b stack" key={index}>
            <div className="row" style={{ gap: 8 }}>
              <label>
                عمل {index + 1}
                <select
                  className="input"
                  value={action.type}
                  onChange={e =>
                    updateAction(
                      index,
                      e.target.value === 'notify' ? { type: 'notify', recipients: ['assignee'] } : { type: 'set_assignee', assignee: 'creator' },
                    )
                  }
                >
                  <option value="notify">ارسال اعلان</option>
                  <option value="set_assignee">تعیین مسئول</option>
                </select>
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={draft.actions.length === 1}
                onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, i) => i !== index) })}
              >
                حذف عمل
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={index === 0}
                onClick={() => {
                  const actions = [...draft.actions];
                  [actions[index - 1], actions[index]] = [actions[index], actions[index - 1]];
                  setDraft({ ...draft, actions });
                }}
              >
                انتقال به بالا
              </button>
            </div>
            {action.type === 'set_assignee' ? (
              <label>
                مسئول
                <select
                  className="input"
                  required
                  value={action.assignee === 'creator' ? '__creator' : action.userId || ''}
                  onChange={e =>
                    updateAction(
                      index,
                      e.target.value === '__creator'
                        ? { type: 'set_assignee', assignee: 'creator' }
                        : { type: 'set_assignee', assignee: 'user', userId: e.target.value },
                    )
                  }
                >
                  <option value="">انتخاب عضو</option>
                  <option value="__creator">ایجادکننده کار</option>
                  {options}
                </select>
              </label>
            ) : (
              <>
                <fieldset style={{ border: 0, padding: 0 }}>
                  <legend>گیرندگان اعلان</legend>
                  <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
                    {[
                      ['assignee', 'مسئول'],
                      ['creator', 'ایجادکننده'],
                      ['watchers', 'دنبال‌کنندگان'],
                    ].map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={action.recipients?.includes(key) || false}
                          onChange={e =>
                            updateAction(index, {
                              ...action,
                              recipients: e.target.checked ? [...(action.recipients || []), key] : action.recipients?.filter(value => value !== key),
                            })
                          }
                        />{' '}
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label>
                  اعضای مشخص (انتخاب چندتایی)
                  <select
                    className="input"
                    multiple
                    value={action.userIds || []}
                    onChange={e => updateAction(index, { ...action, userIds: Array.from(e.target.selectedOptions, option => option.value) })}
                  >
                    {options}
                  </select>
                </label>
                <label className="col">
                  عنوان اعلان
                  <input
                    className="input"
                    maxLength={200}
                    value={action.title || ''}
                    onChange={e => updateAction(index, { ...action, title: e.target.value })}
                  />
                </label>
                <label className="col">
                  متن اعلان
                  <textarea
                    className="input"
                    maxLength={2000}
                    value={action.body || ''}
                    onChange={e => updateAction(index, { ...action, body: e.target.value })}
                  />
                </label>
              </>
            )}
          </section>
        ))}
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={draft.actions.length >= 5}
            onClick={() => setDraft({ ...draft, actions: [...draft.actions, { type: 'notify', recipients: ['assignee'] }] })}
          >
            افزودن عمل
          </button>
          <label>
            <input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} /> فعال
          </label>
        </div>
        <FeatureError error={mutation.error || statuses.error || access.members.error} />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary">ذخیره قانون</button>
          <button type="button" className="btn btn-secondary" onClick={close}>
            انصراف
          </button>
        </div>
      </fieldset>
    </form>
  );
}
export function Automation({ projectId }: { projectId: string }) {
  const path = `${projectPath(projectId)}/automation-rules`;
  const rules = useResource<{ items: AutomationRule[] }>(path);
  const statuses = useResource<{ items: { id: string; name: string }[] }>(`${projectPath(projectId)}/statuses`);
  const statusName = (id?: string) => statuses.data?.items.find(status => status.id === id)?.name || id || 'هر وضعیت';
  const nameOf = (id: string) => D().members.find(member => member.id === id)?.name || id;
  const recipients: Record<string, string> = { assignee: 'مسئول', creator: 'ایجادکننده', watchers: 'دنبال‌کنندگان' };
  const access = useProjectAccess(projectId);
  const [editing, setEditing] = useState<AutomationRule | 'new' | null>(null);
  const mutation = useFeatureMutation(async ({ rule, remove }: { rule: AutomationRule; remove?: boolean }) => {
    if (remove) await api.del(`${path}/${encodeURIComponent(rule.id)}`);
    else await api.patch(`${path}/${encodeURIComponent(rule.id)}`, { enabled: !rule.enabled });
  });
  return (
    <FeaturePage title="اتوماسیون پروژه">
      <p className="muted">با رخ دادن رویدادها، مسئول کار را تغییر دهید یا به اعضا اعلان بفرستید. قوانین زنجیره‌ای اجرا نمی‌شوند.</p>
      <div className="row" style={{ gap: 8 }}>
        {access.manager && (
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            قانون جدید
          </button>
        )}
        <button className="btn btn-secondary" disabled={rules.isFetching} onClick={() => rules.refetch()}>
          تازه‌سازی
        </button>
      </div>
      <FeatureError
        error={rules.error || mutation.error || access.identity.error || access.members.error}
        retry={() => {
          rules.refetch();
          access.identity.refetch();
          access.members.refetch();
        }}
      />
      {editing && (
        <RuleForm
          key={editing === 'new' ? 'new' : editing.id}
          projectId={projectId}
          rule={editing === 'new' ? undefined : editing}
          close={() => setEditing(null)}
        />
      )}
      {rules.isPending ? (
        <p role="status">در حال بارگذاری قوانین…</p>
      ) : !rules.data?.items.length && !rules.error ? (
        <p>هنوز قانونی تعریف نشده است.</p>
      ) : (
        rules.data?.items.map(rule => (
          <section key={rule.id} className="panel panel-b stack">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <h3 className="grow">{rule.name}</h3>
              <span className="badge">{rule.enabled ? 'فعال' : 'غیرفعال'}</span>
              {access.manager && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(rule)}>
                    ویرایش
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ rule })}>
                    {rule.enabled ? 'غیرفعال کردن' : 'فعال کردن'}
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ rule, remove: true })}>
                    حذف قانون
                  </button>
                </>
              )}
            </div>
            <p>
              {triggerLabels[rule.triggerType]}
              {rule.triggerType === 'task_due' ? ` · ${rule.triggerConfig.daysBefore || 1} روز قبل` : ''}
              {rule.triggerType === 'task_status_changed' &&
                ` · از ${statusName(rule.triggerConfig.fromStatusId)} به ${statusName(rule.triggerConfig.toStatusId)}`}
              {rule.triggerType === 'task_created' &&
                rule.triggerConfig.hasAssignee !== undefined &&
                (rule.triggerConfig.hasAssignee ? ' · دارای مسئول' : ' · بدون مسئول')}
              {rule.triggerType === 'task_assigned' && rule.triggerConfig.toUserId && ` · به ${nameOf(rule.triggerConfig.toUserId)}`}
            </p>
            <ol>
              {rule.actions.map((action, i) => (
                <li key={i}>
                  {action.type === 'notify'
                    ? `ارسال اعلان به ${[...(action.recipients || []).map(recipient => recipients[recipient] || recipient), ...(action.userIds || []).map(nameOf)].join('، ')}${action.title ? ': ' + action.title : ''}`
                    : `تعیین مسئول: ${action.assignee === 'creator' ? 'ایجادکننده' : D().members.find(m => m.id === action.userId)?.name || action.userId}`}
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </FeaturePage>
  );
}
