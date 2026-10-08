/* Post-mutation render tick: legacy code calls `render()` after every state
   change; Svelte re-renders `{@html}` views from reactive state on its own,
   so `render()` only needs to notify layout-level $effects (select
   enhancement, popover placement, focus restore, fx cleanup). */
export const tick = $state({ n: 0 });

export function bump() {
  tick.n++;
}
