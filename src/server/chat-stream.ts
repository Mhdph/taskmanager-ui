import { defineWebSocketHandler } from 'nitro';
import { createWebSocketProxy } from 'crossws';
import { chatStreamTarget } from './chat-stream-target';

const proxy = createWebSocketProxy({ target: peer => chatStreamTarget(peer.request.url), maxBufferSize: 8192, connectTimeout: 10_000, forwardProtocol: false });
export default defineWebSocketHandler({
  ...proxy,
  upgrade(request) {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(request.url).host) return new Response('forbidden', { status: 403 });
    if (!new URL(request.url).searchParams.get('token')) return new Response('unauthorized', { status: 401 });
  },
});
