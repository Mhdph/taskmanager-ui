import { useEffect, useState, type ReactNode } from 'react';
import { initializeHostedSession } from '../hosted-session';

export function HostedAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    initializeHostedSession().then(
      () => {
        if (active) setReady(true);
      },
      error => {
        if (active) setError(error instanceof Error ? error.message : 'ورود ناموفق بود.');
      },
    );
    return () => {
      active = false;
    };
  }, []);
  if (ready) return children;
  return (
    <div className="boot-failed" role={error ? 'alert' : 'status'}>
      <div className="boot-card">
        <h1 className="boot-h">{error ? 'ورود به هم‌کار' : 'در حال بررسی ورود…'}</h1>
        {error && <p className="boot-err">{error}</p>}
      </div>
    </div>
  );
}
