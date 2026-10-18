import { createFileRoute } from '@tanstack/react-router';
import { proxyApi } from '../server/api-proxy';

const handler = ({ request }: { request: Request }) => proxyApi(request);
export const Route = createFileRoute('/api/$')({
  server: {
    handlers: { GET: handler, POST: handler, PATCH: handler, PUT: handler, DELETE: handler, HEAD: handler, OPTIONS: handler },
  },
});
