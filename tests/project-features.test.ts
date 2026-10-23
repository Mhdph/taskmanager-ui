import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/lib/api';
import { configureQueryClient, createQueryClient } from '../src/lib/query-client';
import { allPages, pagePath } from '../src/lib/features-api';
import { assignSprint, sprintInput } from '../src/lib/sprints';
import { automationInput, type AutomationRule } from '../src/lib/automation';
import { connectChat, mergeMessages, streamUrl, type ChatMessage } from '../src/lib/chat';
import { chatStreamTarget } from '../src/server/chat-stream-target';

const client = createQueryClient();
beforeEach(() => {
  configureQueryClient(client);
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('project feature contracts', () => {
  it('follows all cursors, encodes opaque values, and rejects repeated cursors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'a' }], nextCursor: 'a+/ b' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'b' }], nextCursor: null })));
    vi.stubGlobal('fetch', fetch);
    expect(await allPages('/projects/p1/sprints?limit=100')).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(new URL(fetch.mock.calls[1][0], 'http://test').searchParams.get('cursor')).toBe('a+/ b');
    expect(pagePath('/messages?limit=50', 'before/+', 'before')).toBe('/messages?limit=50&before=before%2F%2B');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: 'repeat' })))),
    );
    await expect(allPages('/loop')).rejects.toThrow('صفحه‌بندی');
  });
  it('preserves nullable backlog assignment and excludes immutable start date when updating an active sprint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await assignSprint('p/1', 't/1', null);
    expect(fetch.mock.calls[0][0]).toBe('/api/projects/p%2F1/tasks/t%2F1/sprint');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ sprintId: null });
    expect(sprintInput(' Sprint ', '', '', '2026-11-01T12:00:00Z', true)).toEqual({ name: 'Sprint', goal: null, plannedEndAt: '2026-11-01T12:00:00.000Z' });
    expect(() => sprintInput('x', '', '2026-11-02', '2026-11-01')).toThrow();
    expect(() => sprintInput('x', '', '', '')).toThrow();
  });
  it('sends fresh reads when explicitly requested', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetch);
    await api.get('/messages');
    await api.get('/messages', true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('validates all automation actions while retaining their order and omitting immutable trigger type on edit', () => {
    const rule: Omit<AutomationRule, 'id'> = {
      name: ' Review ',
      enabled: true,
      triggerType: 'task_status_changed',
      triggerConfig: { toStatusId: 'review' },
      actions: [
        { type: 'set_assignee', assignee: 'user', userId: 'bob' },
        { type: 'notify', recipients: ['assignee'] },
      ],
    };
    expect(automationInput(rule).actions.map(action => action.type)).toEqual(['set_assignee', 'notify']);
    expect(automationInput(rule, true)).not.toHaveProperty('triggerType');
    expect(automationInput({ ...rule, triggerType: 'task_due', triggerConfig: {} }).triggerConfig.daysBefore).toBe(1);
    expect(() => automationInput({ ...rule, actions: [] })).toThrow();
    expect(() => automationInput({ ...rule, actions: [{ type: 'notify', recipients: [] }] })).toThrow();
    expect(() => automationInput({ ...rule, actions: [{ type: 'set_assignee', assignee: 'user' }] })).toThrow();
    expect(() => automationInput({ ...rule, triggerType: 'task_due', triggerConfig: { daysBefore: 31 } })).toThrow();
  });
});
const message = (id: string, seq: number, body: string, change: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  seq,
  body,
  conversationId: 'c1',
  authorUserId: 'bob',
  kind: 'user',
  clientMessageId: null,
  attachments: [],
  createdAt: '2026-10-23T12:00:00Z',
  editedAt: null,
  deletedAt: null,
  ...change,
});
describe('chat consistency and transport', () => {
  it('deduplicates replay and socket overlap, orders by sequence, and preserves edits/deletions over stale REST rows', () => {
    const original = message('m1', 1, 'original');
    const edited = message('m1', 1, 'edited', { editedAt: '2026-10-23T12:01:00Z' });
    const deleted = { ...edited, deletedAt: '2026-10-23T12:02:00Z' };
    const result = mergeMessages([message('m2', 2, 'second'), edited], [original, message('m2', 2, 'second')]);
    expect(result.map(item => item.id)).toEqual(['m1', 'm2']);
    expect(result[0].body).toBe('edited');
    expect(mergeMessages([deleted], [edited])[0].deletedAt).toBe(deleted.deletedAt);
  });
  it('uses one-time tickets without caching them and constructs secure browser/proxy URLs', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"token":"one-time"}'));
    vi.stubGlobal('fetch', fetch);
    expect((await api.streamToken()).token).toBe('one-time');
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(streamUrl('a+/ b', 'https://workspace.test')).toBe('wss://workspace.test/api/chat/stream?token=a%2B%2F+b');
    vi.stubEnv('API_URL_INTERNAL', 'https://backend.test/prefix');
    expect(chatStreamTarget('https://workspace.test/api/chat/stream?token=x&target=evil')).toBe('wss://backend.test/prefix/chat/stream?token=x');
    expect(() => chatStreamTarget('http://test/api/chat/stream')).toThrow();
  });
  it('fetches a fresh ticket on reconnect, relays typing, and stops reconnecting after disposal', async () => {
    vi.useFakeTimers();
    const instances: MockSocket[] = [];
    class MockSocket {
      static OPEN = 1;
      readyState = 1;
      onmessage?: (event: { data: string }) => void;
      onclose?: () => void;
      onerror?: () => void;
      send = vi.fn();
      close() {
        this.onclose?.();
      }
      constructor(public url: string) {
        instances.push(this);
      }
    }
    vi.stubGlobal('WebSocket', MockSocket);
    vi.stubGlobal('window', { location: { origin: 'https://workspace.test' } });
    const ticket = vi.spyOn(api, 'streamToken').mockResolvedValueOnce({ token: 'first' }).mockResolvedValueOnce({ token: 'second' });
    const event = vi.fn(),
      status = vi.fn();
    const connection = connectChat(event, status);
    await vi.advanceTimersByTimeAsync(0);
    instances[0].onmessage?.({ data: '{"type":"hello"}' });
    expect(status).toHaveBeenLastCalledWith(true);
    connection.typing('c1', true);
    expect(JSON.parse(instances[0].send.mock.calls[0][0])).toEqual({ type: 'typing', conversationId: 'c1', typing: true });
    instances[0].close();
    await vi.advanceTimersByTimeAsync(1000);
    expect(ticket).toHaveBeenCalledTimes(2);
    expect(instances[1].url).toContain('token=second');
    connection.close();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ticket).toHaveBeenCalledTimes(2);
  });
});
