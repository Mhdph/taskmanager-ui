<script>
  import { page } from '$app/state';
  import { setRoute } from '#lib/router';
  import { S, D } from '#lib/state.svelte';
  import { ensureView } from '../../../../shell/view-engine';
  import { pageProject, PTABS } from '../../../../pages/project';
  import { page404 } from '../../../../pages/errors';

  let id = $derived(page.params.id);
  let tab = $derived(page.params.tab || 'board');
  let params = $derived({ id, tab });

  function seed() {
    setRoute('project', params);
    // Saved-view tabs seed their filter snapshot here so the render fn
    // (which must stay mutation-free) only reads.
    if (tab.startsWith('v:')) {
      const sv = D().savedViews.find(v => 'v:' + v.id === tab && v.project === id);
      if (sv) {
        const k = 'sv:' + sv.id;
        ensureView(k);
        if (!S.views[k].filters.length && sv.filters) {
          S.views[k].filters = JSON.parse(JSON.stringify(sv.filters));
        }
      }
    }
  }

  // Sync before first paint (no flash) + on back/forward between projects.
  seed();
  $effect(() => {
    seed();
  });

  let valid = $derived(PTABS.some(t => t[0] === tab) || tab.startsWith('v:'));
  let html = $derived(valid ? pageProject() : page404());
</script>

{@html html}
