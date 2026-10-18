import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiQueryKey, setIdentity } from '../src/lib/api';
import { configureQueryClient, createQueryClient } from '../src/lib/query-client';

vi.mock('../src/lib/environment', () => ({ browser: true }));

let values: Map<string, string>;
let client: ReturnType<typeof createQueryClient>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } });
  configureQueryClient(client);
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

describe('Query-backed API', () => {
  it('deduplicates concurrent reads and caches the response', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ id: 'p1' }] })));
    vi.stubGlobal('fetch', fetch);
    await Promise.all([api.get('/projects'), api.get('/projects')]);
    await api.get('/projects');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached reads after a write and tracks the mutation', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetch);
    await api.get('/tasks');
    await api.post('/tasks', { title: 'New task' });
    expect(client.getQueryState(apiQueryKey('/tasks'))?.isInvalidated).toBe(true);
    expect(client.getMutationCache().getAll()[0].state.status).toBe('success');
    await api.get('/tasks');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('clears cached identity data and partitions requests by tenant', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetch);
    setIdentity({ userId: 'alice', appId: 'tenant-a' });
    const firstKey = apiQueryKey('/tasks');
    await api.get('/tasks');
    setIdentity({ userId: 'bob', appId: 'tenant-b' });
    expect(client.getQueryData(firstKey)).toBeUndefined();
    await api.get('/tasks');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers['APP-ID']).toBe('tenant-b');
  });

  it('rejects HTML responses instead of treating a page fallback as API data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html><title>App</title>')));
    await expect(api.get('/me')).rejects.toThrow('پاسخ سرور نامعتبر است');
  });

  it('surfaces failed writes without retrying or invalidating successful data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await api.get('/tasks');
    const fetch = vi.fn().mockResolvedValue(new Response('{"message":"Denied"}', { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    await expect(api.post('/tasks', {})).rejects.toThrow('Denied');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(apiQueryKey('/tasks'))?.isInvalidated).toBe(false);
  });
});
