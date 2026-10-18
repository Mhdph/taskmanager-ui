import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { createQueryClient } from './lib/query-client';

export function getRouter() {
  return createRouter({
    routeTree,
    context: { queryClient: createQueryClient() },
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
