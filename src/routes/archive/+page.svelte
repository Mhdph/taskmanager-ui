<script>
  import { setRoute } from '#lib/router';
  import { pageArchive } from '../../features/archive';

  setRoute('archive');
  let html = $derived(pageArchive());
</script>

{@html html}
