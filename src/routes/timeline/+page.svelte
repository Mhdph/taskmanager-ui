<script>
  import { setRoute } from '#lib/router';
  import { S } from '#lib/state.svelte';
  import { pageWsTimeline } from '../../views/timeline';

  setRoute('timeline');
  // Workspace default (moved out of the render fn, which must not mutate).
  if (!S.ui._tlWsInit) {
    S.ui._tlWsInit = 1;
    S.ui.tlGroup = 'project';
  }
  let html = $derived(pageWsTimeline());
</script>

{@html html}
