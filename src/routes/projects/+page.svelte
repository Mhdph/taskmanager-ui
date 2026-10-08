<script>
  import { setRoute } from '#lib/router';
  import { pageProjects } from '../../pages/projects';

  setRoute('projects');
  let html = $derived(pageProjects());
</script>

{@html html}
