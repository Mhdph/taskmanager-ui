<script>
  import { setRoute } from '#lib/router';
  import { pageOverview } from '../../pages/overview';

  setRoute('overview');
  let html = $derived(pageOverview());
</script>

{@html html}
