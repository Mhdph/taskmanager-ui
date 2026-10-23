import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/environment', () => ({ browser: true }));
let cookies: Map<string, string>;
let history: { replaceState: ReturnType<typeof vi.fn>; state: null };

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('DEV', false);
  vi.stubEnv('VITE_DEMO', 'false');
  cookies = new Map();
  const document = {};
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
    set: (value: string) => {
      const [pair] = value.split(';');
      const index = pair.indexOf('=');
      const key = pair.slice(0, index);
      if (value.includes('Max-Age=0')) cookies.delete(key);
      else cookies.set(key, pair.slice(index + 1));
    },
  });
  vi.stubGlobal('document', document);
  history = { state: null, replaceState: vi.fn() };
  vi.stubGlobal('window', { location: { href: 'https://tasks.test/projects?tt=bridge-once&view=list#tasks', protocol: 'https:' }, history });
  vi.stubGlobal('localStorage', {
    getItem: () => JSON.stringify({ apiKey: 'old-local-token', userId: 'old', appId: 'old-tenant' }),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('NUP hosted authentication', () => {
  it('exchanges tt only once, strips it from the URL, and sends the platform cookies as headers', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ token: 'hosted-token', appId: 'tenant', userId: 'alice', fromSupportMenu: 'yes' }));
    vi.stubGlobal('fetch', fetch);
    const { initializeHostedSession } = await import('../src/lib/hosted-session');
    await Promise.all([initializeHostedSession(), initializeHostedSession()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/api/auth/bridge');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ bridgeToken: 'bridge-once' });
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/projects?view=list#tasks');
    const { identityHeaders } = await import('../src/lib/api');
    expect(identityHeaders()).toEqual({ 'X-APIKEY': 'hosted-token', 'USER-ID': 'alice', 'APP-ID': 'tenant', 'FROM-SUPPORT-MENU': 'yes' });
  });

  it('restores an existing admin-compatible session without an exchange', async () => {
    vi.stubGlobal('window', { location: { href: 'https://tasks.test/', protocol: 'https:' }, history });
    cookies.set('token', 'stored%3Dtoken');
    cookies.set('app-id', 'tenant');
    cookies.set('id', 'alice');
    cookies.set('from-support-menu', 'no');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { initializeHostedSession } = await import('../src/lib/hosted-session');
    await initializeHostedSession();
    expect(fetch).not.toHaveBeenCalled();
    const { getIdentity } = await import('../src/lib/api');
    expect(getIdentity()).toEqual({ apiKey: 'stored=token', appId: 'tenant', userId: 'alice', fromSupportMenu: 'no' });
  });

  it('has no production fallback to local storage or a built-in administrator', async () => {
    vi.stubGlobal('window', { location: { href: 'https://tasks.test/', protocol: 'https:' }, history });
    vi.stubEnv('VITE_API_TOKEN', 'build-secret');
    vi.stubEnv('VITE_API_USER', 'build-user');
    const { initializeHostedSession } = await import('../src/lib/hosted-session');
    await expect(initializeHostedSession()).rejects.toThrow('پنل اصلی');
    const { getIdentity } = await import('../src/lib/api');
    expect(getIdentity().userId).toBe('');
  });

  it('never restores a previous identity when a new bridge token fails', async () => {
    cookies.set('token', 'previous-token');
    cookies.set('app-id', 'previous-tenant');
    cookies.set('id', 'previous-user');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    const { initializeHostedSession } = await import('../src/lib/hosted-session');
    await expect(initializeHostedSession()).rejects.toThrow('ورود');
    expect(cookies.has('token')).toBe(false);
    const { getIdentity } = await import('../src/lib/api');
    expect(getIdentity().userId).toBe('');
  });

  it('clears hosted cookies and query data on sign-out', async () => {
    const { setIdentity, apiQueryKey } = await import('../src/lib/api');
    const { getQueryClient } = await import('../src/lib/query-client');
    setIdentity({ apiKey: 'token', appId: 'tenant', userId: 'alice' });
    const key = apiQueryKey('/tasks');
    getQueryClient().setQueryData(key, ['private']);
    setIdentity(null);
    expect(cookies.size).toBe(0);
    expect(getQueryClient().getQueryData(key)).toBeUndefined();
  });
});
