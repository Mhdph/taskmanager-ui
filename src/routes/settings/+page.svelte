<script>
  import { setRoute } from '#lib/router';
  import { pageSettings } from '../../pages/settings';

  setRoute('settings');
  let html = $derived(pageSettings());
</script>

{@html html}
