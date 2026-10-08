<script lang="ts">
  import { page } from '$app/state';
  import { setRoute } from '#lib/router.js';
  import { pageTeam } from '../../../pages/members.js';

  // Read params directly: no $derived needed, so no stale-closure warning.
  setRoute('team', { id: page.params.id });
  $effect(() => {
    setRoute('team', { id: page.params.id });
  });
  let html = $derived(pageTeam());
</script>

{@html html}
