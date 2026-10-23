export function chatStreamTarget(incoming: string) {
  const base = (process.env.API_URL_INTERNAL || process.env.VITE_API_URL_INTERNAL || 'http://localhost:8080').replace(/\/$/, '');
  const target = new URL(`${base}/chat/stream`);
  target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = new URL(incoming).searchParams.get('token');
  if (!token) throw new Error('Missing chat stream token');
  target.searchParams.set('token', token);
  return target.href;
}
