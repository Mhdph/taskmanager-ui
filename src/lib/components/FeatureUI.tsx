import type { ReactNode } from 'react';
import { featureError } from '../features-api';
import { getIdentity } from '../api';

export function FeatureError({ error, retry }: { error: Error | null; retry?: () => void }) {
  return error ? (
    <p role="alert" className="alert danger">
      {featureError(error)}{' '}
      {retry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
          تلاش دوباره
        </button>
      )}
    </p>
  ) : null;
}
export function FeaturePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page wide stack">
      <h2>{title}</h2>
      {getIdentity().userId ? children : <p className="muted">برای استفاده از این قابلیت به سرور متصل شوید.</p>}
    </div>
  );
}
