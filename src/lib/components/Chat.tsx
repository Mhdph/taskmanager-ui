import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getIdentity } from '../api';
import { connectChat, mergeMessages, uploadChatAttachment, type ChatAttachment, type ChatMessage, type Conversation, type MessagePage } from '../chat';
import { conversationPath, featureKey, pagePath, projectPath, useFeatureMutation, useResource } from '../features-api';
import { D } from '../state';
import { fmtDate } from '../../core/utils';
import { faNumber } from '../../core/locale';
import { FeatureError, FeaturePage } from './FeatureUI';

const memberName = (id: string | null) => (id ? D().members.find(member => member.id === id)?.name || id : 'سیستم');
function NewConversation({ close, created }: { close: () => void; created: (id: string) => void }) {
  const [type, setType] = useState('dm');
  const [title, setTitle] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const mutation = useFeatureMutation(async () => {
    if (!members.length) throw new Error('حداقل یک عضو انتخاب کنید.');
    const result = await api.post('/conversations', type === 'dm' ? { type, memberUserId: members[0] } : { type, title, memberUserIds: members });
    created(result.id);
  }, close);
  return (
    <form
      className="panel panel-b stack"
      onSubmit={event => {
        event.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <label>
        نوع گفتگو
        <select
          className="input"
          value={type}
          onChange={e => {
            setType(e.target.value);
            setMembers([]);
          }}
        >
          <option value="dm">پیام مستقیم</option>
          <option value="group">گروه</option>
        </select>
      </label>
      {type === 'group' && (
        <label className="col">
          نام گروه
          <input className="input" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
        </label>
      )}
      <label className="col">
        اعضا
        <select
          className="input"
          required
          multiple={type === 'group'}
          value={type === 'group' ? members : members[0] || ''}
          onChange={e => setMembers(Array.from(e.target.selectedOptions, option => option.value))}
        >
          {type === 'dm' && <option value="">انتخاب عضو</option>}
          {D()
            .members.filter(member => member.id !== getIdentity().userId && member.status === 'active')
            .map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
        </select>
      </label>
      <FeatureError error={mutation.error} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={mutation.isPending}>
          باز کردن گفتگو
        </button>
        <button type="button" className="btn btn-secondary" disabled={mutation.isPending} onClick={close}>
          انصراف
        </button>
      </div>
    </form>
  );
}
function Message({
  message,
  owner,
  busy,
  edit,
  remove,
  download,
}: {
  message: ChatMessage;
  owner: boolean;
  busy: boolean;
  edit: (message: ChatMessage) => void;
  remove: (id: string) => void;
  download: (id: string) => void;
}) {
  return (
    <article
      className="panel panel-b"
      style={{ marginBlock: 8, borderColor: message.mentionedUserIds?.includes(getIdentity().userId) ? 'var(--accent)' : undefined }}
    >
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <b>{memberName(message.authorUserId)}</b>
        <time className="muted" dateTime={message.createdAt}>
          {fmtDate(message.createdAt)} · {new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
        </time>
        {message.editedAt && <span className="faint">ویرایش‌شده</span>}
      </div>
      {message.deletedAt ? (
        <p className="muted">این پیام حذف شده است.</p>
      ) : (
        <>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.body}</p>
          {message.attachments.map(file => (
            <button key={file.id} type="button" className="btn btn-secondary btn-sm" onClick={() => download(file.id)}>
              دریافت {file.filename}
            </button>
          ))}
          <div className="row" style={{ gap: 8 }}>
            {message.kind === 'user' && message.authorUserId === getIdentity().userId && (
              <button type="button" className="link" disabled={busy} onClick={() => edit(message)}>
                ویرایش
              </button>
            )}
            {message.kind === 'user' && (owner || message.authorUserId === getIdentity().userId) && (
              <button type="button" className="link" disabled={busy} onClick={() => remove(message.id)}>
                حذف پیام
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
function Thread({ id }: { id: string }) {
  const path = conversationPath(id);
  const client = useQueryClient();
  const detail = useResource<Conversation>(path);
  const latest = useResource<MessagePage>(`${path}/messages?limit=50`, true, 10_000);
  const presence = useResource<{ userIds: string[] }>(`${path}/presence`, true, 30_000);
  const preference = useResource<{ mode: string }>(`${path}/notification-preference`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [paging, setPaging] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [readers, setReaders] = useState<Record<string, number>>({});
  const stream = useRef<ReturnType<typeof connectChat> | null>(null);
  const lastSeq = useRef(0);
  const lastRead = useRef(0);
  const sendKey = useRef<{ signature: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const cursorInitialized = useRef(false);
  const merge = (incoming: ChatMessage[]) => {
    for (const message of incoming) lastSeq.current = Math.max(lastSeq.current, message.seq);
    setMessages(current => mergeMessages(current, incoming));
  };
  useEffect(() => {
    if (!latest.data) return;
    merge(latest.data.items);
    if (!cursorInitialized.current) {
      setCursor(latest.data.nextCursor);
      cursorInitialized.current = true;
    }
  }, [latest.data]);
  useEffect(() => {
    if (presence.data) setOnline(presence.data.userIds);
  }, [presence.data]);
  useEffect(() => {
    if (detail.data?.members) setReaders(Object.fromEntries(detail.data.members.map(member => [member.userId, member.lastReadSeq])));
  }, [detail.data]);
  useEffect(() => {
    let stopped = false;
    async function reconcile() {
      try {
        // Open the socket first; replay then covers messages missed while disconnected.
        let after: number | undefined = lastSeq.current;
        while (after && after > 0) {
          const page = (await api.get(`${path}/messages?limit=100&after=${after}`, true)) as MessagePage;
          if (stopped) return;
          merge(page.items);
          after = page.nextAfter;
        }
        const page = (await api.get(`${path}/messages?limit=50`, true)) as MessagePage;
        if (!stopped) merge(page.items); // Edits and deletions keep their original sequence.
        void client.invalidateQueries({ queryKey: featureKey('/conversations') });
        void client.invalidateQueries({ queryKey: featureKey(`${path}/presence`) });
      } catch (e) {
        if (!stopped) setError(e as Error);
      }
    }
    const connection = connectChat(event => {
      if (event.type === 'hello') {
        void reconcile();
        return;
      }
      if (event.type === 'presence.online' && event.userId) setOnline(current => [...new Set([...current, event.userId!])]);
      if (event.type === 'presence.offline') setOnline(current => current.filter(user => user !== event.userId));
      if (event.conversationId !== id) return;
      if (event.message) {
        merge([event.message]);
        void client.invalidateQueries({ queryKey: featureKey('/conversations') });
      }
      if (event.type === 'typing' && event.userId) setTyping(current => ({ ...current, [event.userId!]: event.typing ? Date.now() + 6000 : 0 }));
      if (event.type === 'conversation.read' && event.userId) setReaders(current => ({ ...current, [event.userId!]: event.lastReadSeq || 0 }));
    }, setConnected);
    stream.current = connection;
    const timer = setInterval(() => setTyping(current => Object.fromEntries(Object.entries(current).filter(([, expires]) => expires > Date.now()))), 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
      connection.typing(id, false);
      connection.close();
      stream.current = null;
    };
  }, [id, path, client]);
  const highest = messages.at(-1)?.seq || 0;
  useEffect(() => {
    async function read() {
      if (document.hidden || highest <= lastRead.current) return;
      try {
        await api.post(`${path}/read`, { lastReadSeq: highest });
        lastRead.current = Math.max(lastRead.current, highest);
        void client.invalidateQueries({ queryKey: featureKey('/conversations') });
      } catch (e) {
        setError(e as Error);
      }
    }
    void read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, [highest, path, client]);
  const send = useFeatureMutation(async () => {
    const body = text.trim();
    if (!body && !files.length) throw new Error('پیام یا فایل اضافه کنید.');
    if (editing) {
      await api.patch(`${path}/messages/${encodeURIComponent(editing.id)}`, { body });
      setEditing(null);
    } else {
      const signature = JSON.stringify({ body, attachmentIds: files.map(file => file.id) });
      if (!sendKey.current || sendKey.current.signature !== signature) sendKey.current = { signature, id: crypto.randomUUID() };
      const result = (await api.post(`${path}/messages`, {
        body,
        attachmentIds: files.map(file => file.id),
        clientMessageId: sendKey.current.id,
      })) as ChatMessage;
      merge([result]);
      sendKey.current = null;
      setFiles([]);
    }
    setText('');
    stream.current?.typing(id, false);
    requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: 'nearest' }));
  });
  const action = useFeatureMutation(async (input: { type: string; value: string }) => {
    if (input.type === 'delete') await api.del(`${path}/messages/${encodeURIComponent(input.value)}`);
    else if (input.type === 'cancel') {
      await api.del(`${path}/attachments/${encodeURIComponent(input.value)}`);
      setFiles(current => current.filter(file => file.id !== input.value));
    } else if (input.type === 'preference') await api.put(`${path}/notification-preference`, { mode: input.value });
    else if (input.type === 'addMember') await api.post(`${path}/members`, { userId: input.value });
    else if (input.type === 'removeMember') await api.del(`${path}/members/${encodeURIComponent(input.value)}`);
  });
  async function download(attachmentId: string) {
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      setError(new Error('برای دریافت فایل، باز شدن پنجره جدید را مجاز کنید.'));
      return;
    }
    popup.opener = null;
    try {
      const result = await api.get(`${path}/attachments/${encodeURIComponent(attachmentId)}/download`, true);
      const url = new URL(result.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('نشانی دریافت نامعتبر است.');
      popup.location.href = url.href;
    } catch (error) {
      popup.close();
      setError(error as Error);
    }
  }
  const owner = detail.data?.members?.some(member => member.userId === getIdentity().userId && member.role === 'owner') || false;
  async function older() {
    if (!cursor || paging) return;
    setPaging(true);
    try {
      const page = (await api.get(pagePath(`${path}/messages?limit=50`, cursor, 'before'), true)) as MessagePage;
      merge(page.items);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e as Error);
    } finally {
      setPaging(false);
    }
  }
  return (
    <section className="panel stack" style={{ minWidth: 0 }}>
      <header className="panel-b stack">
        <h3>{detail.data?.title || 'گفتگو'}</h3>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <span role="status" className="muted">
            {connected ? 'متصل' : 'اتصال زنده قطع است؛ پیام‌ها هر ۱۰ ثانیه تازه می‌شوند.'}
          </span>
          {preference.data && (
            <label>
              اعلان‌ها
              <select
                className="input"
                disabled={action.isPending}
                value={preference.data.mode}
                onChange={e => action.mutate({ type: 'preference', value: e.target.value })}
              >
                <option value="all">همه پیام‌ها</option>
                <option value="mentions">فقط اشاره‌ها</option>
                <option value="mute">بی‌صدا</option>
              </select>
            </label>
          )}
          <button type="button" className="btn btn-secondary btn-sm" disabled={latest.isFetching} onClick={() => latest.refetch()}>
            تازه‌سازی
          </button>
        </div>
        <details>
          <summary>اعضا و وضعیت حضور</summary>
          {detail.data?.members?.map(member => (
            <div key={member.userId} className="row" style={{ gap: 8, paddingBlock: 4 }}>
              <span>
                {memberName(member.userId)} · {online.includes(member.userId) ? 'آنلاین' : 'آفلاین'}
              </span>
              {detail.data?.type === 'group' && owner && member.userId !== getIdentity().userId && (
                <button
                  type="button"
                  className="link"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ type: 'removeMember', value: member.userId })}
                >
                  حذف از گروه
                </button>
              )}
            </div>
          ))}
          {owner && detail.data?.type === 'group' && (
            <label>
              افزودن عضو
              <select
                className="input"
                value=""
                disabled={action.isPending}
                onChange={e => {
                  if (e.target.value) action.mutate({ type: 'addMember', value: e.target.value });
                }}
              >
                <option value="">انتخاب عضو</option>
                {D()
                  .members.filter(member => member.status === 'active' && !detail.data?.members?.some(existing => existing.userId === member.id))
                  .map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </details>
      </header>
      <div className="panel-b" style={{ paddingBlock: 0 }}>
        <FeatureError
          error={error || latest.error || detail.error || presence.error || preference.error || send.error || action.error}
          retry={() => {
            setError(null);
            latest.refetch();
            detail.refetch();
            presence.refetch();
            preference.refetch();
          }}
        />
      </div>
      <div className="panel-b" style={{ maxHeight: '55vh', overflowY: 'auto', paddingBlock: 0 }}>
        {cursor && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={paging} onClick={older}>
            {paging ? 'در حال بارگذاری…' : 'پیام‌های قدیمی‌تر'}
          </button>
        )}
        {latest.isPending && <p role="status">در حال بارگذاری پیام‌ها…</p>}
        {!latest.isPending && !messages.length && <p className="muted">اولین پیام را بنویسید.</p>}
        {messages.map(message => (
          <Message
            key={message.id}
            message={message}
            owner={owner}
            busy={send.isPending || action.isPending}
            edit={value => {
              setEditing(value);
              setText(value.body);
            }}
            remove={value => action.mutate({ type: 'delete', value })}
            download={download}
          />
        ))}
        <div ref={bottom} />
      </div>
      <div className="panel-b">
        <p className="faint" style={{ fontSize: 12 }}>
          {Object.keys(readers)
            .filter(user => user !== getIdentity().userId && readers[user] >= highest && highest > 0)
            .map(memberName)
            .join('، ')}
          {Object.keys(readers).some(user => user !== getIdentity().userId && readers[user] >= highest && highest > 0) ? ' · خوانده است' : ''}
        </p>
        <p role="status" className="muted">
          {Object.keys(typing)
            .filter(user => user !== getIdentity().userId)
            .map(memberName)
            .join('، ')}
          {Object.keys(typing).some(user => user !== getIdentity().userId) ? ' در حال نوشتن…' : ''}
        </p>
        <form
          className="stack"
          onSubmit={e => {
            e.preventDefault();
            if (!send.isPending && !uploading) send.mutate();
          }}
        >
          {editing && (
            <div className="row">
              ویرایش پیام
              <button
                type="button"
                className="link"
                onClick={() => {
                  setEditing(null);
                  setText('');
                }}
              >
                انصراف از ویرایش
              </button>
            </div>
          )}
          <label className="col">
            پیام
            <textarea
              className="input"
              required={!files.length}
              maxLength={10000}
              rows={3}
              disabled={send.isPending}
              value={text}
              onChange={e => {
                setText(e.target.value);
                stream.current?.typing(id, !!e.target.value.trim());
              }}
              onBlur={() => stream.current?.typing(id, false)}
              placeholder="پیام بنویسید؛ برای اشاره از @شناسه‌عضو استفاده کنید."
            />
          </label>
          <details>
            <summary>اشاره به عضو</summary>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {detail.data?.members?.map(member => (
                <button
                  type="button"
                  key={member.userId}
                  className="btn btn-secondary btn-sm"
                  onClick={() => setText(current => `${current}${current && !/\s$/.test(current) ? ' ' : ''}@${member.userId} `)}
                >
                  {memberName(member.userId)}
                </button>
              ))}
            </div>
          </details>
          {files.map(file => (
            <div className="row" key={file.id}>
              <span>{file.filename}</span>
              <button
                type="button"
                className="link"
                disabled={action.isPending || send.isPending}
                onClick={() => action.mutate({ type: 'cancel', value: file.id })}
              >
                حذف پیوست
              </button>
            </div>
          ))}
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={send.isPending || uploading || action.isPending}>
              {send.isPending ? 'در حال ارسال…' : editing ? 'ذخیره ویرایش' : 'ارسال پیام'}
            </button>
            {!editing && (
              <label>
                پیوست فایل
                <input
                  type="file"
                  disabled={uploading || send.isPending || files.length >= 10}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setUploading(true);
                    setError(null);
                    try {
                      const result = await uploadChatAttachment(id, file);
                      setFiles(current => [...current, result]);
                    } catch (e) {
                      setError(e as Error);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            )}
            {uploading && <span role="status">در حال بارگذاری…</span>}
          </div>
        </form>
      </div>
    </section>
  );
}
export function Chat({ projectId }: { projectId?: string }) {
  const conversations = useResource<{ items: Conversation[] }>('/conversations', !projectId, 10_000);
  const project = useResource<Conversation>(projectId ? `${projectPath(projectId)}/chat` : '/conversations', !!projectId);
  const [selected, setSelected] = useState('');
  const [creating, setCreating] = useState(false);
  const id = projectId ? project.data?.id : selected;
  return (
    <FeaturePage title={projectId ? 'گفتگوی پروژه' : 'گفتگوها'}>
      {!projectId && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              گفتگوی جدید
            </button>
            <label className="grow">
              انتخاب گفتگو
              <select className="input" style={{ width: '100%' }} value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="">انتخاب گفتگو</option>
                {conversations.data?.items.map(conversation => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.type === 'dm'
                      ? conversation.memberIds
                          ?.filter(user => user !== getIdentity().userId)
                          .map(memberName)
                          .join('، ') || conversation.title
                      : conversation.title}
                    {conversation.unreadCount ? ` · ${faNumber(conversation.unreadCount)} خوانده‌نشده` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {creating && <NewConversation close={() => setCreating(false)} created={setSelected} />}
        </>
      )}
      <FeatureError error={projectId ? project.error : conversations.error} retry={() => (projectId ? project.refetch() : conversations.refetch())} />
      {(projectId ? project.isPending : conversations.isPending) && <p role="status">در حال بارگذاری گفتگوها…</p>}
      {id ? <Thread key={id} id={id} /> : !projectId && <p className="muted">یک گفتگو انتخاب کنید یا پیام مستقیم / گروه جدید بسازید.</p>}
    </FeaturePage>
  );
}
