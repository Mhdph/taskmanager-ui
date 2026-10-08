<script>
  import { setRoute } from '#lib/router';
  import { pageTeams } from '../../pages/members';

  setRoute('teams');
  let html = $derived(pageTeams());
</script>

{@html html}
