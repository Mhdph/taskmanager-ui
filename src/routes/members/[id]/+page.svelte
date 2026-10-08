<script lang="ts">
  import { page } from '$app/state';
  import { setRoute } from '#lib/router.js';
  import { pageMember } from '../../../pages/members.js';

  // Read params directly: no $derived needed, so no stale-closure warning.
  setRoute('member', { id: page.params.id });
  $effect(() => {
    setRoute('member', { id: page.params.id });
  });
  let html = $derived(pageMember());
</script>

{@html html}
