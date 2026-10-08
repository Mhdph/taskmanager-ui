<script>
  import { S } from '#lib/state.svelte';
  import { renderAuth } from '../../pages/auth';

  // Seed the auth form draft outside render (render must not mutate state).
  if (!S.ui.af) S.ui.af = { email: 'hello@gr8rstudio.com', name: '' };
  let html = $derived(renderAuth());
</script>

{@html html}
