import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, apiQueryKey, getIdentity } from './api';

export const projectPath = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;
export const conversationPath = (id: string) => `/conversations/${encodeURIComponent(id)}`;
export const featureKey = (path?: string) => ['feature', ...apiQueryKey(path)];

export function useResource<T = Record<string, any>>(path: string, enabled = true, interval: number | false = false) {
  return useQuery<T>({
    queryKey: featureKey(path),
    queryFn: async () => (await api.get(path, true)) as T,
    enabled: enabled && !!getIdentity().userId,
    refetchInterval: interval,
    retry: false,
  });
}
export function useFeatureMutation<T>(mutationFn: (input: T) => Promise<unknown>, onSuccess?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: featureKey() });
      await client.invalidateQueries({ queryKey: ['workload', ...apiQueryKey()] });
      onSuccess?.();
    },
  });
}
export function useProjectAccess(projectId: string) {
  const identity = useResource('/me');
  const members = useResource<{ items: { userId: string; role: string }[] }>(`${projectPath(projectId)}/members`);
  const role = members.data?.items.find(member => member.userId === identity.data?.userId)?.role;
  return {
    identity,
    members,
    manager: identity.data?.role === 'Admin' || role === 'manager',
    editor: identity.data?.role === 'Admin' || role === 'manager' || role === 'member',
  };
}
export function featureError(error: Error) {
  if (error instanceof ApiError && error.status === 403) return 'اجازه انجام این کار را ندارید.';
  if (error instanceof ApiError && error.status === 409) return `وضعیت تغییر کرده یا با این عملیات سازگار نیست: ${error.message}`;
  return error.message;
}
export function pagePath(path: string, cursor?: string | null, key = 'cursor') {
  if (!cursor) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(cursor)}`;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const page = (await api.get(pagePath(path, cursor), true)) as Page<T>;
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor)) throw new Error('صفحه‌بندی سرور نامعتبر است.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}
