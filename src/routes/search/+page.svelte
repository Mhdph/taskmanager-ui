<script>
  import { setRoute } from '#lib/router';
  import { pageSearch } from '../../pages/search';

  setRoute('search');
  let html = $derived(pageSearch());
</script>

{@html html}
