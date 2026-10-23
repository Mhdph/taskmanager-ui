import { API_BASE, ApiError, getIdentity, setIdentity } from './api';

let pending: Promise<void> | undefined;

/** Share the single-use bridge exchange across StrictMode effects and route mounts. */
export function initializeHostedSession(): Promise<void> {
  if (pending) return pending;
  pending = initialize();
  return pending;
}

async function initialize() {
  if (import.meta.env.VITE_DEMO === 'true') return;
  const url = new URL(window.location.href);
  const bridgeToken = url.searchParams.get('tt');
  if (bridgeToken) {
    url.searchParams.delete('tt');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    setIdentity(null);
    const response = await fetch(`${API_BASE}/auth/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new ApiError(response.status, 'ورود از پنل اصلی ناموفق بود؛ برنامه را دوباره از پنل باز کنید.');
    const session = await response.json();
    if (![session.token, session.userId, session.appId].every(value => typeof value === 'string' && value.length > 0)) {
      throw new Error('پاسخ احراز هویت نامعتبر است.');
    }
    setIdentity({ apiKey: session.token, userId: session.userId, appId: session.appId, fromSupportMenu: session.fromSupportMenu || '' });
  }
  const identity = getIdentity();
  if (!identity.apiKey || !identity.userId || !identity.appId) throw new ApiError(401, 'برای ورود، این برنامه را از پنل اصلی باز کنید.');
}
