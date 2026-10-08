<script>
  import { setRoute } from '#lib/router';
  import { pageSystem } from '../../pages/design-system';

  setRoute('system');
  let html = $derived(pageSystem());
</script>

{@html html}
