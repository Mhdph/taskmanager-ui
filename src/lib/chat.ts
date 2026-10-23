import { API_BASE, ApiError, api, getIdentity } from './api';
import { conversationPath } from './features-api';

export interface ChatAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
}
export interface ChatMessage {
  id: string;
  conversationId: string;
  seq: number;
  authorUserId: string | null;
  body: string;
  kind: string;
  clientMessageId: string | null;
  attachments: ChatAttachment[];
  mentionedUserIds?: string[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}
export interface Conversation {
  id: string;
  type: 'dm' | 'group' | 'project';
  title: string;
  projectId: string | null;
  createdByUserId: string;
  memberIds?: string[];
  memberRole?: string;
  unreadCount?: number;
  lastMessage?: { body: string };
  members?: { userId: string; role: string; lastReadSeq: number }[];
}
export interface MessagePage {
  items: ChatMessage[];
  nextCursor: string | null;
  nextAfter?: number;
}
export interface ChatEvent {
  type: string;
  conversationId?: string;
  message?: ChatMessage;
  userId?: string;
  typing?: boolean;
  lastReadSeq?: number;
}
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) {
    const old = byId.get(message.id);
    const revision = (value: ChatMessage) => Date.parse(value.deletedAt || value.editedAt || value.createdAt);
    if (!old || revision(message) >= revision(old)) byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) => a.seq - b.seq);
}
export function streamUrl(token: string, origin: string) {
  const url = new URL(`${API_BASE.replace(/\/$/, '')}/chat/stream`, origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.href;
}
export async function uploadChatAttachment(conversationId: string, file: File): Promise<ChatAttachment> {
  const identity = getIdentity();
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_BASE}${conversationPath(conversationId)}/attachments`, {
    method: 'POST',
    headers: { 'X-APIKEY': identity.apiKey, 'USER-ID': identity.userId, 'APP-ID': identity.appId },
    body,
  });
  if (!response.ok) throw new ApiError(response.status, 'بارگذاری فایل ناموفق بود.');
  return await response.json();
}

export function connectChat(onEvent: (event: ChatEvent) => void, onStatus: (connected: boolean) => void) {
  let stopped = false;
  let socket: WebSocket | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let delay = 1000;
  async function open() {
    try {
      const result = await api.streamToken();
      if (stopped) return;
      socket = new WebSocket(streamUrl(result.token, window.location.origin));
      socket.onmessage = event => {
        if (stopped) return;
        try {
          const data = JSON.parse(event.data) as ChatEvent;
          if (data.type === 'hello') {
            delay = 1000;
            onStatus(true);
          }
          onEvent(data);
        } catch {
          /* Ignore malformed frames; REST reconciliation remains authoritative. */
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = reconnect;
    } catch {
      reconnect();
    }
  }
  function reconnect() {
    if (stopped) return;
    onStatus(false);
    timer = setTimeout(open, delay);
    delay = Math.min(delay * 2, 30_000);
  }
  void open();
  return {
    typing(conversationId: string, typing: boolean) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'typing', conversationId, typing }));
    },
    close() {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    },
  };
}
