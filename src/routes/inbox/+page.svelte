<script>
  import { setRoute } from '#lib/router';
  import { pageInbox } from '../../pages/inbox';

  setRoute('inbox');
  let html = $derived(pageInbox());
</script>

{@html html}
