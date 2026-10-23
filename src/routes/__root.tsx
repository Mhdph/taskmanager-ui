import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import styles from '../styles/index.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'description', content: 'فضای کاری منظم برای مدیریت پروژه‌ها و کارهای تیم.' },
      { name: 'referrer', content: 'no-referrer' },
      { title: 'هم‌کار | مدیریت کارها و پروژه‌های تیم' },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'preload', href: '/fonts/Estedad-variable.ttf', as: 'font', type: 'font/ttf', crossOrigin: 'anonymous' },
    ],
  }),
  component: Root,
});

function Root() {
  const { queryClient } = Route.useRouteContext();
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
