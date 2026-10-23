/* =====================================================================
   API CLIENT — taskmanager-api (Go, chi) wrapper.

   Auth is delegated to the hosted platform: every request carries
   X-APIKEY / USER-ID / APP-ID headers. For local development the API can
   run with IDENTITY_DEV_MODE=true, where USER-ID + APP-ID alone are
   enough (see README).

   Hosted identity comes from the NUP session cookies (token / id / app-id).
   Local storage and build-time dev identities are accepted only in development.
   ===================================================================== */

import { browser } from '#lib/environment';
import { getQueryClient } from './query-client';

export const API_BASE: string = (import.meta as any).env?.VITE_API_URL || '/api';

export interface Identity {
  apiKey: string;
  userId: string;
  appId: string;
  fromSupportMenu?: string;
}

const DEV_IDENTITY: Identity = {
  apiKey: 'dev',
  userId: 'dev@gr8r.local',
  appId: 'dev-tenant',
};

const EMPTY_IDENTITY: Identity = { apiKey: '', userId: '', appId: '' };
const sessionCookies = { apiKey: 'token', userId: 'id', appId: 'app-id', fromSupportMenu: 'from-support-menu' } as const;

function cookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const value = document.cookie
    .split('; ')
    .find(part => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  try {
    return value ? decodeURIComponent(value) : '';
  } catch {
    return '';
  }
}

export function getIdentity(): Identity {
  if (import.meta.env.VITE_DEMO === 'true' || !browser) return EMPTY_IDENTITY;
  const session = Object.fromEntries(Object.entries(sessionCookies).map(([key, name]) => [key, cookie(name)])) as unknown as Identity;
  if (session.apiKey || session.userId || session.appId) return session;
  if (!import.meta.env.DEV) return EMPTY_IDENTITY;
  try {
    const raw = localStorage.getItem('gr8r.api');
    if (raw) {
      const j = JSON.parse(raw);
      if (j?.userId) return { apiKey: j.apiKey || 'dev', appId: j.appId || 'dev-tenant', userId: j.userId, fromSupportMenu: j.fromSupportMenu || '' };
    }
  } catch {
    /* Local development storage may be unavailable. */
  }
  const env = import.meta.env;
  if (env.VITE_API_USER) return { apiKey: env.VITE_API_TOKEN || 'dev', userId: env.VITE_API_USER, appId: env.VITE_API_APP || 'dev-tenant' };
  return DEV_IDENTITY;
}

export function setIdentity(id: Partial<Identity> | null) {
  if (!browser) return;
  getQueryClient().clear();
  if (typeof document !== 'undefined') {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    for (const [key, name] of Object.entries(sessionCookies)) {
      document.cookie = `${name}=${encodeURIComponent(id?.[key] || '')}; Path=/; SameSite=Lax${secure}${id ? '' : '; Max-Age=0'}`;
    }
  }
  try {
    if (id && import.meta.env.DEV) localStorage.setItem('gr8r.api', JSON.stringify(id));
    else localStorage.removeItem('gr8r.api');
  } catch {
    /* The hosted session uses cookies; storage is optional. */
  }
}

export function identityHeaders(): Record<string, string> {
  const id = getIdentity();
  return { 'X-APIKEY': id.apiKey, 'USER-ID': id.userId, 'APP-ID': id.appId, 'FROM-SUPPORT-MENU': id.fromSupportMenu || '' };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ResponseLike = Record<string, any>;

interface RequestOpts {
  body?: any;
  raw?: boolean;
}

async function request(method: string, path: string, opts: RequestOpts = {}): Promise<ResponseLike> {
  const headers = identityHeaders();
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, 'خطای شبکه؛ اتصال به سرور را بررسی کنید.');
  }
  if (res.status === 204) return {};
  const text = await res.text();
  let data: ResponseLike = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (res.ok) throw new ApiError(res.status, 'پاسخ سرور نامعتبر است؛ نشانی سرور و تنظیمات اتصال را بررسی کنید.');
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data.message || data.error || `API ${method} ${path} → ${res.status}`);
  }
  return data;
}

/** Identity is part of every key so tenants/users never share cached responses. */
export function apiQueryKey(path?: string) {
  const id = getIdentity();
  const scope = ['api', API_BASE, id.appId, id.userId, id.apiKey, id.fromSupportMenu || ''];
  return path === undefined ? scope : [...scope, path];
}

async function mutate(method: string, path: string, body?: any) {
  const client = getQueryClient();
  const scope = apiQueryKey();
  return client
    .getMutationCache()
    .build(client, {
      mutationKey: [...scope, method, path],
      mutationFn: () => request(method, path, { body }),
      onSuccess: () => client.invalidateQueries({ queryKey: scope }),
    })
    .execute(undefined);
}

export const api = {
  streamToken: () => request('POST', '/chat/stream-token', { body: {} }),
  get: (path: string, fresh = false) =>
    getQueryClient().fetchQuery({
      queryKey: apiQueryKey(path),
      queryFn: () => request('GET', path),
      ...(fresh ? { staleTime: 0 } : {}),
    }),
  post: (path: string, body?: any) => mutate('POST', path, body ?? {}),
  patch: (path: string, body?: any) => mutate('PATCH', path, body ?? {}),
  put: (path: string, body?: any) => mutate('PUT', path, body ?? {}),
  del: (path: string) => mutate('DELETE', path),

  /** Multipart upload with progress (attachments). */
  upload(projectID: string, taskID: string, file: File, onProgress: (pct: number) => void): Promise<ResponseLike> {
    const form = new FormData();
    form.append('file', file, file.name);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/projects/${projectID}/tasks/${taskID}/attachments`);
      for (const [name, value] of Object.entries(identityHeaders())) xhr.setRequestHeader(name, value);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: ResponseLike = {};
        try {
          data = JSON.parse(xhr.responseText || '{}');
        } catch {
          /* ignore */
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          void getQueryClient().invalidateQueries({ queryKey: apiQueryKey() });
          resolve(data);
        } else reject(new ApiError(xhr.status, data.message || data.error || `upload → ${xhr.status}`));
      };
      xhr.onerror = () => reject(new ApiError(0, 'خطای شبکه هنگام بارگذاری'));
      xhr.send(form);
    });
  },

  /** Authenticated download URL for an attachment. */
  download(projectID: string, taskID: string, attachmentID: string) {
    return `${API_BASE}/projects/${projectID}/tasks/${taskID}/attachments/${attachmentID}/download`;
  },
};
