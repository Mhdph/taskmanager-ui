<script>
  import { setRoute } from '#lib/router';
  import { pageStates } from '../../pages/design-system';

  setRoute('states');
  let html = $derived(pageStates());
</script>

{@html html}
