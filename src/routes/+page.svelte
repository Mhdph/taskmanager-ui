<script>
  import { setRoute } from '#lib/router';
  import { pageHome } from '../pages/home';

  setRoute('home');
  let html = $derived(pageHome());
</script>

{@html html}
