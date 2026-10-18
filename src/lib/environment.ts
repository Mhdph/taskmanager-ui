/** Workspace data and identity are browser-local; never read them during SSR. */
export const browser = typeof window !== 'undefined';
