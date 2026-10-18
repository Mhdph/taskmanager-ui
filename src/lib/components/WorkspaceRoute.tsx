import { lazy, Suspense } from 'react';

// The persisted workspace and hosted identity belong to this browser. Keep their
// module graph off the SSR render path; Start still serves the document and routes.
const Workspace = lazy(() => import('./Workspace'));
export function WorkspaceRoute() {
  return (
    <Suspense
      fallback={
        <div role="status" className="boot-card">
          در حال بارگذاری فضای کاری…
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}
