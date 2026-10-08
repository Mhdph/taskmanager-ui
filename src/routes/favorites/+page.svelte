<script>
  import { setRoute } from '#lib/router';
  import { pageFavorites } from '../../pages/favorites';

  setRoute('favorites');
  let html = $derived(pageFavorites());
</script>

{@html html}
