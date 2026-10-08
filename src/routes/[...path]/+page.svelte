<script>
  import { setRoute } from '#lib/router';
  import { page404 } from '../../pages/errors';

  setRoute('404');
  let html = $derived(page404());
</script>

{@html html}
