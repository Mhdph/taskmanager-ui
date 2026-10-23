const maxBodySize = 26 * 1024 * 1024; // 25 MiB attachment plus multipart overhead.
const privateHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

async function readBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (!request.body || request.method === 'GET' || request.method === 'HEAD') return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodySize) {
        await reader.cancel();
        throw new RangeError('Request body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

/** Same-origin API proxy used in development and production. */
export async function proxyApi(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const base = (process.env.API_URL_INTERNAL || process.env.VITE_API_URL_INTERNAL || 'http://localhost:8080').replace(/\/$/, '');
  const target = new URL(base + incoming.pathname.replace(/^\/api(?=\/|$)/, '') + incoming.search);
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'x-apikey', 'user-id', 'app-id', 'from-support-menu', 'range']) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  try {
    if (Number(request.headers.get('content-length')) > maxBodySize) throw new RangeError('Request body too large');
    body = await readBody(request);
  } catch (error) {
    return Response.json(
      { message: error instanceof RangeError ? 'Request body too large' : 'Cannot read request body' },
      { status: error instanceof RangeError ? 413 : 400, headers: privateHeaders },
    );
  }
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ['connection', 'transfer-encoding', 'content-length', 'content-encoding']) responseHeaders.delete(name);
    for (const [name, value] of Object.entries(privateHeaders)) responseHeaders.set(name, value);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { message: 'Cannot reach the workspace API. Check API_URL_INTERNAL and the backend server.' },
      { status: 502, headers: privateHeaders },
    );
  }
}
