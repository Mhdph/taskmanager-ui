<script>
  // Rendered by the layout's auth takeover (`AuthView`); this route only
  // selects which auth screen the legacy state machine shows.
  import { S } from '#lib/state.svelte';

  S.ui.auth = 'onboarding';
  $effect(() => {
    S.ui.auth = 'onboarding';
  });
</script>
