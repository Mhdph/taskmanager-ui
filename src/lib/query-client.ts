import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      // Retrying writes can create duplicate tasks, comments, or uploads.
      mutations: { retry: false },
    },
  });
}

let client: QueryClient | undefined;
export function configureQueryClient(next: QueryClient) {
  client = next;
}

/** Only browser workspace modules use this; the router creates one client per request. */
export function getQueryClient() {
  return (client ??= createQueryClient());
}
