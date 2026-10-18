import { useLayoutEffect, useRef } from 'react';
import morphdom from 'morphdom';
import { focusKey, tryFocus } from '../../shell/render';

/** Preserve focus, caret, and scroll across existing HTML view updates. */
export function Html({ html }: { html: string }) {
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = element.current;
    if (!root || root.innerHTML === html) return;
    const active = document.activeElement as HTMLInputElement;
    const hadFocus = root.contains(active);
    const key = hadFocus ? focusKey(active) : null;
    const start = hadFocus ? active.selectionStart : null;
    const end = hadFocus ? active.selectionEnd : null;
    const scroll = Array.from(root.querySelectorAll<HTMLElement>('[data-keep]')).map(el => ({
      key: el.dataset.keep,
      top: el.scrollTop,
      left: el.scrollLeft,
    }));
    morphdom(root, `<div>${html}</div>`, {
      childrenOnly: true,
      onBeforeElUpdated: (current, next) => {
        // Keep the browser's live editing selection inside rich-text fields.
        if (current === document.activeElement && current.hasAttribute('contenteditable')) return false;
        return !current.isEqualNode(next);
      },
    });
    for (const position of scroll) {
      const el = Array.from(root.querySelectorAll<HTMLElement>('[data-keep]')).find(el => el.dataset.keep === position.key);
      if (el) {
        el.scrollTop = position.top;
        el.scrollLeft = position.left;
      }
    }
    if (key && tryFocus(key) && start !== null) {
      const next = document.activeElement as HTMLInputElement;
      try {
        next.setSelectionRange(start, end);
      } catch {
        /* Non-text controls have no caret. */
      }
    }
  }, [html]);
  return <div ref={element} style={{ display: 'contents' }} />;
}
