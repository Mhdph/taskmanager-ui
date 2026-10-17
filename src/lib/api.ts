/* =====================================================================
   API CLIENT — taskmanager-api (Go, chi) wrapper.

   Auth is delegated to the hosted platform: every request carries
   X-APIKEY / USER-ID / APP-ID headers. For local development the API can
   run with IDENTITY_DEV_MODE=true, where USER-ID + APP-ID alone are
   enough (see README).

   Identity sources, in order of precedence:
     1. localStorage  `gr8r.api`  → { apiKey, userId, appId }
     2. build-time env import.meta.env.VITE_API_TOKEN / VITE_API_USER /
        VITE_API_APP
     3. a built-in dev identity so `pnpm dev` works out of the box
        against an API started with IDENTITY_DEV_MODE=true.
   ===================================================================== */

import { browser } from '$app/env';

export const API_BASE: string = (import.meta as any).env?.VITE_API_URL || '/api';

export interface Identity {
  apiKey: string;
  userId: string;
  appId: string;
}

const DEV_IDENTITY: Identity = {
  apiKey: 'dev',
  userId: 'dev@gr8r.local',
  appId: 'dev-tenant',
};

export function getIdentity(): Identity {
  if (!browser) return DEV_IDENTITY;
  try {
    const raw = localStorage.getItem('gr8r.api');
    if (raw) {
      const j = JSON.parse(raw);
      if (j?.userId) return { apiKey: j.apiKey || 'dev', appId: j.appId || 'dev-tenant', userId: j.userId };
    }
  } catch {
    /* ignore */
  }
  const env = (import.meta as any).env || {};
  if (env.VITE_API_USER) {
    return {
      apiKey: env.VITE_API_TOKEN || 'dev',
      userId: env.VITE_API_USER,
      appId: env.VITE_API_APP || 'dev-tenant',
    };
  }
  return DEV_IDENTITY;
}

export function setIdentity(id: Partial<Identity> | null) {
  if (!browser) return;
  if (!id) localStorage.removeItem('gr8r.api');
  else localStorage.setItem('gr8r.api', JSON.stringify(id));
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
  const id = getIdentity();
  const headers: Record<string, string> = {
    'X-APIKEY': id.apiKey,
    'USER-ID': id.userId,
    'APP-ID': id.appId,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, 'Network error — is the API running?');
  }
  if (res.status === 204) return {};
  const text = await res.text();
  let data: ResponseLike = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data.message || data.error || `API ${method} ${path} → ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: any) => request('POST', path, { body: body ?? {} }),
  patch: (path: string, body?: any) => request('PATCH', path, { body: body ?? {} }),
  put: (path: string, body?: any) => request('PUT', path, { body: body ?? {} }),
  del: (path: string) => request('DELETE', path),

  /** Multipart upload with progress (attachments). */
  upload(projectID: string, taskID: string, file: File, onProgress: (pct: number) => void): Promise<ResponseLike> {
    const id = getIdentity();
    const form = new FormData();
    form.append('file', file, file.name);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/projects/${projectID}/tasks/${taskID}/attachments`);
      xhr.setRequestHeader('X-APIKEY', id.apiKey);
      xhr.setRequestHeader('USER-ID', id.userId);
      xhr.setRequestHeader('APP-ID', id.appId);
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
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(xhr.status, data.message || data.error || `upload → ${xhr.status}`));
      };
      xhr.onerror = () => reject(new ApiError(0, 'Network error during upload'));
      xhr.send(form);
    });
  },

  /** Authenticated download URL for an attachment. */
  download(projectID: string, taskID: string, attachmentID: string) {
    return `${API_BASE}/projects/${projectID}/tasks/${taskID}/attachments/${attachmentID}/download`;
  },
};
