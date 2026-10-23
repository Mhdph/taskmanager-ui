import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxyApi } from '../src/server/api-proxy';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Start API proxy', () => {
  it('preserves path, query, identity headers, and mutation body', async () => {
    vi.stubEnv('API_URL_INTERNAL', 'http://backend:8080');
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 't1' }, { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const response = await proxyApi(
      new Request('http://ui/api/projects/p1/tasks?cursor=next', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-id': 'alice', 'app-id': 'tenant-a' },
        body: JSON.stringify({ title: 'Example' }),
      }),
    );
    expect(response.status).toBe(201);
    expect(String(fetch.mock.calls[0][0])).toBe('http://backend:8080/projects/p1/tasks?cursor=next');
    expect(fetch.mock.calls[0][1].headers.get('user-id')).toBe('alice');
    expect(new TextDecoder().decode(fetch.mock.calls[0][1].body)).toContain('Example');
  });

  it('returns a JSON 502 when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));
    const response = await proxyApi(new Request('http://ui/api/me'));
    expect(response.status).toBe(502);
    expect((await response.json()).message).toContain('Cannot reach');
  });
});

it('prevents shared caching and forwards support context', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'cache-control': 'public, max-age=3600' } }));
  vi.stubGlobal('fetch', fetch);
  const response = await proxyApi(new Request('http://ui/api/me', { headers: { 'from-support-menu': 'true' } }));
  expect(fetch.mock.calls[0][1].headers.get('from-support-menu')).toBe('true');
  expect(fetch.mock.calls[0][1].cache).toBe('no-store');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
});

it.each([true, false])('rejects oversized uploads before forwarding (content length: %s)', async declared => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const request = new Request('http://ui/api/upload', {
    method: 'POST',
    headers: declared ? { 'content-length': String(27 * 1024 * 1024) } : {},
    body: new Uint8Array(27 * 1024 * 1024),
  });
  const response = await proxyApi(request);
  expect(response.status).toBe(413);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(fetch).not.toHaveBeenCalled();
});
