<script>
  import { setRoute } from '#lib/router';
  import { pageActivity } from '../../pages/activity';

  setRoute('activity');
  let html = $derived(pageActivity());
</script>

{@html html}
