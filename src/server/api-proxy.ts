/** Same-origin API proxy used in development and production. */
export async function proxyApi(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const base = (process.env.API_URL_INTERNAL || process.env.VITE_API_URL_INTERNAL || 'http://localhost:8080').replace(/\/$/, '');
  const target = new URL(base + incoming.pathname.replace(/^\/api(?=\/|$)/, '') + incoming.search);
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'x-apikey', 'user-id', 'app-id', 'range']) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ['connection', 'transfer-encoding', 'content-length', 'content-encoding']) responseHeaders.delete(name);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: 'Cannot reach the workspace API. Check API_URL_INTERNAL and the backend server.' }, { status: 502 });
  }
}
