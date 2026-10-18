import { useEffect, useLayoutEffect } from 'react';
import { Html } from './Html';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { S, workspaceStore } from '../state';
import { bindNavigation, syncRouteToStore } from '../router';
import { configureQueryClient } from '../query-client';
import { apiQueryKey, getIdentity } from '../api';
import { hydrateWorkspace } from '../hydrate';
import { applyPrefs } from '../../core/theme';
import { afterRender, countUp, pageTitle } from '../../shell/render';
import { renderBottomNav, renderPage, renderSidebar, renderTopbar } from '../../shell/layout';
import { renderLayer } from '../../overlays/drawer';
import { renderAuth } from '../../pages/auth';
import { skeleton } from '../../shell/skeletons';
import { ic } from '../../core/icons';
import { A } from '../../actions/actions';
import '../../actions/events';
import '../../actions/keyboard';
import '../../actions/drag-drop';
import '../../actions/teams';
import '../../actions/subtasks';
import '../../actions/archive';
import { makeFocusable } from '../../shell/render';

const AUTH_ROUTES = ['login', 'signup', 'forgot', 'reset', 'verify', 'onboarding'];

export default function Workspace() {
  useSelector(workspaceStore, state => state.revision);
  const router = useRouter();
  const href = useRouterState({ select: state => state.location.href });
  const client = useQueryClient();
  configureQueryClient(client);

  useLayoutEffect(() => bindNavigation(url => router.navigate({ href: url })), [router]);
  useLayoutEffect(() => {
    const url = new URL(href, window.location.origin);
    syncRouteToStore(url.pathname, url.searchParams);
    const segment = url.pathname.split('/').filter(Boolean)[0];
    S.ui.auth = AUTH_ROUTES.includes(segment) ? segment : null;
    if (S.ui.auth && !S.ui.af) S.ui.af = { email: 'hello@gr8rstudio.com', name: '' };
    applyPrefs();
    document.querySelector('.content')?.scrollTo(0, 0);
  }, [href]);

  useQuery({
    queryKey: ['workspace', ...apiQueryKey()],
    enabled: !!getIdentity().userId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const ok = await hydrateWorkspace();
      S.ui.loading = false;
      if (!ok) throw new Error(S.ui.bootError || 'بارگذاری فضای کاری ناموفق بود');
      return true;
    },
  });

  useLayoutEffect(() => {
    document.title = pageTitle();
    const live = document.getElementById('sr-live');
    if (live && !S.ui.loading) live.textContent = document.title;
    makeFocusable();
    afterRender();
    if (S.ui.fx.route) countUp();
    if (Object.keys(S.ui.fx).length) {
      const frame = requestAnimationFrame(() => {
        S.ui.fx = {};
      });
      return () => cancelAnimationFrame(frame);
    }
  });

  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__gr8r = { S, A, go: (route: string, params?: Record<string, string>) => import('../router').then(r => r.go(route, params)) };
    }
  }, []);

  return (
    <>
      <button className="skip" data-a="skipToContent">
        رفتن به محتوای اصلی
      </button>
      {S.ui.auth ? (
        <Html html={renderAuth()} />
      ) : S.ui.bootFailed ? (
        <div className="boot-failed" role="alert">
          <div className="boot-card">
            <div className="boot-glyph">
              <Html html={ic('wifi-off', 26)} />
            </div>
            <h1 className="boot-h">اتصال به سرور فضای کاری برقرار نشد</h1>
            <p className="boot-err">{S.ui.bootError || 'سرور پاسخ نداد.'}</p>
            <p className="boot-note">بک‌اند را اجرا و اتصال برنامه به آن را بررسی کنید، سپس دوباره تلاش کنید.</p>
            <div className="boot-actions">
              <button className="btn btn-primary" data-a="retryOnline">
                تلاش دوباره
              </button>
              <button className="btn btn-secondary" onClick={() => location.reload()}>
                بارگذاری دوباره صفحه
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`shell ${S.ui.collapsed ? 'collapsed' : ''} ${S.ui.mnav ? 'mnav' : ''} ${S.ui.fx.tabs ? 'fx-tabs' : ''}`}>
          <Html html={renderSidebar()} />
          {S.ui.mnav && <div className="side-scrim" data-a="closeMnav" />}
          <main className="main" id="main">
            <Html html={renderTopbar()} />
            {S.ui.offline && (
              <div className="offline-bar" role="alert">
                <b>اتصال اینترنت شما قطع است.</b> تا برقراری دوباره اتصال، تغییرات ذخیره نمی‌شوند.
                <button className="btn btn-sm btn-secondary" data-a="retryOnline">
                  تلاش دوباره
                </button>
              </div>
            )}
            <div className={`content ${S.ui.fx.route ? 'fx-route' : ''}`} id="main-content" tabIndex={-1}>
              <Html html={S.ui.loading ? skeleton() : renderPage()} />
            </div>
          </main>
          <Html html={renderBottomNav()} />
        </div>
      )}
      <Html html={renderLayer()} />
      <div id="toasts" aria-live="polite" />
      <div id="sr-live" className="sr" aria-live="polite" />
    </>
  );
}
