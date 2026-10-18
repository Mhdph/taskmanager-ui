/**
 * `onclick` wrapper for popover / context-menu triggers (`A.pop`, `A.ctxBtn`).
 *
 * React handles the click below `document`, so the legacy document-level
 * delegation in `actions/events.ts` runs *after* it. Without stopping
 * propagation it would see the freshly opened `S.ui.pop` with no `data-a`
 * ancestor (and no popover in the DOM yet) and immediately close it again.
 */
export function popClick(fn: (el: HTMLElement) => void): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    e.stopPropagation();
    fn(e.currentTarget as HTMLElement);
  };
}
